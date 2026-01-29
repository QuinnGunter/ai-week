//
//  Browser+URLHandlers.swift
//  mmhmm
//
//  Created by Beni Federer on 23.07.25.
//

import AppKit

extension Browser {
	func openURL(url: URL) {
		guard let components = URLComponents(url: url, resolvingAgainstBaseURL: false) else {
			Logger.logMessage("Failed to open URL: \(url)", level: .error)
			return
		}

		guard Application.cefAppDelegate.finishedSetup else {
			Logger.logMessage("Waiting for app to finish setup before opening URL: \(url)", level: .info)
			deepLinkLaunchURL = url
			return
		}

		let loggableURL: URL = if let redactedURL: URL = url.redactingQueryValues() {
			redactedURL
		} else {
			url
		}

		Logger.logMessage("Opening URL: \(loggableURL.absoluteString)", level: .info)

		if components.webAppType == nil, let authToken = components.authToken {
			// Send auth token to all open web apps.
			updateAuthToken(token: authToken)
			return
		}

		let webAppType: WebApp.WebAppType = if let webAppType = components.webAppType {
			webAppType
		} else {
			// Deep links, that don't specify a web app type, target Malk.
			// Talk and recording IDs target Creator.
			// Auth tokens and import IDs target Creator and Camera,
			// which makes handling them ambiguous, unless one of the two is already open.
			isPresenting(webAppOfType: .camera) ? .camera : .creator
		}

		guard isPresenting(webAppOfType: webAppType) else {
			// Targeted web app is not open, so launch it.
			let fragment: String = components.fragment ?? components.malkFragmentSubstring ?? ""
			launchWebApp(ofType: webAppType, query: components.query, fragment: fragment)
			return
		}

		Logger.logMessage("\(webAppType.userFriendlyName) is already presenting, forwarding URL data.", level: .info)

		if webAppType == .creator || webAppType == .camera {
			// A targeted Malk-based app is already open, so forward the data the Malky way.
			handleMalkURLComponents(components)
		} else if isPresenting(webAppOfType: webAppType) {
			// Targeted web app is already open, so just forward the data.
			handleWebAppURLComponents(components, for: webAppType)
		}

		webApp(ofType: webAppType)?.windowManager.window?.makeKeyAndOrderFront(nil)
		toolbox.windowManager.isPresenting = false
	}

	/// The requested web app type based on the deep link URL.
	///
	/// `nil` if nothing or the last used tool was requested.
	var requestedWebAppType: WebApp.WebAppType? {
		guard let deepLinkLaunchURL else { return nil }
		let components = URLComponents(url: deepLinkLaunchURL, resolvingAgainstBaseURL: false)
		return if let webAppType: WebApp.WebAppType = components?.webAppType {
			webAppType
		} else if components?.containMalkFragments == true {
			.creator
		} else if deepLinkLaunchURL == HybridURLBuilder.schemeOnlyURL {
			// Treat an empty hybrid scheme URL as a request for the toolbox web app.
			.toolbox
		} else {
			nil
		}
	}
}

extension Browser {
	/// Handles the URL components targeting a specific web app.
	///
	/// - Parameters:
	///   - components: Components of a URL with the `mmhmm-hybrid`
	///                 scheme and an explicit product name.
	///   - webAppType: The type of web app the URL targets.
	private func handleWebAppURLComponents(_ components: URLComponents, for webAppType: WebApp.WebAppType) {
		let query: String = components.query ?? ""
		let fragment: String = components.fragment ?? ""
		CxxBridge.notifyHybridOfWebAppCallbackData(webAppType.hybridWebAppType, std.string(query), std.string(fragment))
	}

	/// Handles the URL components targeting Malk.
	///
	/// - Parameter components: Components of a URL with the `mmhmm-hybrid`
	///                         scheme and specific components used by Malk.
	private func handleMalkURLComponents(_ components: URLComponents) {
		guard components.containMalkFragments else {
			Logger.logMessage("Can't handle URL as it does not contain any supported Malk parameters: \(components.url?.absoluteString ?? "(unknown)")", level: .info)
			return
		}

		if let talkID = components.talkID {
			joinTalkWithID(talkID: talkID)
		}
		if let importID = components.importID {
			importTemplateWithID(templateID: importID)
		}
		if let recordingID = components.recordingID {
			launchRecordingForEdit(recordingId: recordingID)
		}
	}

	func launchWebApp(ofType webAppType: WebApp.WebAppType) {
		guard let deepLinkLaunchURL, let components = URLComponents(url: deepLinkLaunchURL, resolvingAgainstBaseURL: false) else {
			launchWebApp(ofType: webAppType, query: nil, fragment: nil)
			return
		}

		if components.query != nil || components.fragment != nil, components.webAppType == webAppType {
			launchWebApp(ofType: webAppType, query: components.query, fragment: components.fragment)
			self.deepLinkLaunchURL = nil
		} else if let malkFragment: String = components.malkFragmentSubstring, [.mmhmm, .camera, .creator].contains(webAppType) {
			launchWebApp(ofType: webAppType, query: nil, fragment: malkFragment)
			self.deepLinkLaunchURL = nil
		} else {
			launchWebApp(ofType: webAppType, query: nil, fragment: nil)
		}
	}

	/// Launches a web app of the specified type in a new CEF root window.
	///
	/// - Parameter webAppType: The type of web app to launch.
	func launchWebApp(ofType webAppType: WebApp.WebAppType, query: String?, fragment: String?) {
		guard userInteractionRequiredToLaunchWebApp(ofType: webAppType, query: query, fragment: fragment) == false else {
			return
		}

		if webAppType == .camera || webAppType == .creator {
			UserDefaults.standard.lastUsedVirtualCameraProducerWebApp = webAppType
		}

		switch webAppType {
		case .camera, .creator, .screenRecorder, .stacks:
			guard let webApp: WebAppProtocol = webApps.first(where: { $0.webAppType == webAppType }) else {
				Logger.logMessage("Unexpectedly can't find web app \(webAppType.userFriendlyName).", level: .fault)
				return
			}
			webApp.launch(withQuery: query, fragment: fragment, initiallyHidden: false)
			toolbox.windowManager.isPresenting = false
		case .toolbox:
			toolbox.launch(withQuery: query, fragment: fragment)
		default:
			Logger.logMessage("Launching web app \(webAppType) is not supported.", level: .info)
		}
	}

	private func userInteractionRequiredToLaunchWebApp(ofType webAppType: WebApp.WebAppType, query: String?, fragment: String?) -> Bool {
		switch webAppType {
		case .camera, .creator:
			let conflictingWebApp: WebApp.WebAppType = webAppType == .camera ? .creator : .camera

			guard isPresenting(webAppOfType: conflictingWebApp) else {
				break
			}

			let confirmationHandler: () -> Void = { [weak self] in
				guard let self else { return }

				// Prevent toolbox from closing when the conflicting web app window closes,
				// while being the last web app window on screen, which would quit the app.
				closingLastWebAppClosesToolbox = false

				webApps
					.first { $0.webAppType == conflictingWebApp }?
					.windowManager
					.closeWindow()

				launchWebApp(ofType: webAppType, query: query, fragment: fragment)
			}

			if UserDefaults.standard.bool(forKey: UserDefaults.mmhmmKey.BrowserURLHandlers.suppressAlert) {
				Logger.logMessage("Immediately close \(conflictingWebApp.userFriendlyName) and launch \(webAppType.userFriendlyName) because user has suppressed alert.", level: .info)
				confirmationHandler()
			} else {
				Logger.logMessage("Can't launch \(webAppType.userFriendlyName) because \(conflictingWebApp.userFriendlyName) is already presenting.", level: .info)
				showAlertThatAppNeedsToCloseFirst(webAppToClose: conflictingWebApp, webAppToLaunch: webAppType, confirmationHandler: confirmationHandler)
			}

			return true
		default:
			break
		}

		return false
	}

	private func showAlertThatAppNeedsToCloseFirst(webAppToClose: WebApp.WebAppType, webAppToLaunch: WebApp.WebAppType, confirmationHandler: @escaping () -> Void) {
		let alert = NSAlert()
		alert.messageText = "Close \(webAppToClose.userFriendlyName)?"
		alert.informativeText = "\(webAppToLaunch.userFriendlyName) requires \(webAppToClose.userFriendlyName) to be closed first. Would you like to do that now?"
		alert.addButton(withTitle: String(localized: "Close")).keyEquivalent = "\r"
		alert.addButton(withTitle: String(localized: "Cancel")).keyEquivalent = "\u{1b}"
		alert.suppressionButton?.title = String(localized: "Always close apps without asking")
		alert.showsSuppressionButton = true

		guard alert.runModal() == .alertFirstButtonReturn else {
			Logger.logMessage("User canceled launching \(webAppToLaunch.userFriendlyName) that requires closing \(webAppToClose.userFriendlyName).", level: .info)
			return
		}

		Logger.logMessage("User confirmed launching \(webAppToLaunch.userFriendlyName) that requires closing \(webAppToClose.userFriendlyName).", level: .info)
		confirmationHandler()

		if let suppressionButton: NSButton = alert.suppressionButton, suppressionButton.state == .on {
			UserDefaults.standard.set(true, forKey: UserDefaults.mmhmmKey.BrowserURLHandlers.suppressAlert)
			Logger.logMessage("User opted to suppress future alerts that conflicting web apps require closing.", level: .info)
		}
	}
}

// MARK: - IPC Messages

extension Browser {
	private func updateAuthToken(token: String) {
		sendStringIPCMessage(type: "login_message", value: token)
	}

	private func launchRecordingForEdit(recordingId: String) {
		sendStringIPCMessage(type: "launch_recording_for_edit_message", value: recordingId)
	}

	private func joinTalkWithID(talkID: String) {
		sendStringIPCMessage(type: "join_meeting_message", value: talkID)
	}

	private func importTemplateWithID(templateID: String) {
		sendStringIPCMessage(type: "import_template_message", value: templateID)
	}

	private func sendStringIPCMessage(type: String, value: String) {
		let ipcMessage = StringInterprocessMessage(type: type, stringValue: value, isFlagged: false, sendAnalytics: true)
		InterprocessMessenger.shared.send(ipcMessage)
	}
}

// MARK: - Supporting Extensions

extension URLComponents {
	private var containedDeepLinkWebAppType: String? {
		Hybrid.allWebAppTargetComponents.first { path.contains($0) }
	}

	private var containDeepLinkWebAppType: Bool {
		containedDeepLinkWebAppType != nil
	}

	fileprivate var webAppType: WebApp.WebAppType? {
		switch containedDeepLinkWebAppType {
		case Hybrid.camera: .camera
		case Hybrid.creator: .creator
		case Hybrid.lastUsed: UserDefaults.standard.lastUsedVirtualCameraProducerWebApp ?? .virtualCameraProducerDefault
		case Hybrid.recorder: .screenRecorder
		case Hybrid.stacks: .stacks
		case Hybrid.toolbox: .toolbox
		default: nil
		}
	}

	fileprivate var containMalkFragments: Bool {
		malkFragmentSubstring != nil
	}

	fileprivate var malkFragmentSubstring: String? {
		return if let talkID = talkID {
			"talkID=" + talkID
		} else if let importID = importID {
			"importID=" + importID
		} else if let recordingID = recordingID {
			"recordingId=" + recordingID
		} else if let authToken = authToken {
			"token=" + authToken
		} else {
			nil
		}
	}
}

extension UserDefaults.mmhmmKey {
	enum BrowserURLHandlers {
		fileprivate static let suppressAlert: String = "SuppressConflictingWebAppNeedsToCloseAlert"
		fileprivate static let lastUsedCameraProducerWebApp: String = "LastUsedCameraProducerWebApp"
	}
}

// MARK: - WebApp.WebAppType UserDefaults Storage

extension UserDefaults {
	/// A `WebApp.WebAppType` value for the last used camera/producer web app.
	fileprivate var lastUsedVirtualCameraProducerWebApp: WebApp.WebAppType? {
		get {
			if let rawValue: String = string(forKey: UserDefaults.mmhmmKey.BrowserURLHandlers.lastUsedCameraProducerWebApp) {
				WebApp.WebAppType(rawValue: rawValue)
			} else {
				nil
			}
		}
		set {
			set(newValue?.rawValue, forKey: UserDefaults.mmhmmKey.BrowserURLHandlers.lastUsedCameraProducerWebApp)
		}
	}
}
