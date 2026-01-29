//
//  StreamDeckManager.swift
//  mmhmm
//
//  Created by Martin Pilkington on 20/06/2023.
//

import Cocoa

import Common

@MainActor
class StreamDeckManager: NSObject {
	nonisolated static let apiVersion: String = "1"

	static let shared = StreamDeckManager()

	var webApp: RemoteControllableWebApp? {
		didSet {
			showInstallAlertIfNeeded()
		}
	}

	private let connection = StreamDeckConnection()
	private var messageHandlerTask: Task<Void, Never>?
	private var isHandlingMessage: Bool = false
	private var hasShownUpdateAlert = false

	override private init() {
		super.init()
		connection.delegate = self
	}

	func start() {
		connection.start()
		startObserving()
	}

	func stop() {
		stopObserving()
		connection.stop()
	}
}

extension StreamDeckManager {
	private func startObserving() {
		messageHandlerTask = Task {
			for await message: StreamDeckMessage in connection.receivedMessages {
				guard !Task.isCancelled else { return }
				handleMessage(message)
			}
		}
	}

	private func stopObserving() {
		messageHandlerTask?.cancel()
	}

	// MARK: - Message Handling

	// swiftlint:disable:next function_body_length cyclomatic_complexity
	private func handleMessage(_ message: StreamDeckMessage) {
		guard var webApp else { return }

		isHandlingMessage = true
		defer {
			isHandlingMessage = false
		}
		switch message.action {
		case .cameraZoom:
			if message.needsReset {
				webApp.cameraZoom = 1
				return
			}

			if let value: Double = message.typedValue() {
				webApp.cameraZoom = value * 0.01
				return
			}

			let change: Double = message.delta * 0.01
			webApp.cameraZoom += change
		case .presenterMask:
			guard
				let rawMask = message.properties[.value] as? String,
				let mask = WebApp.Mask(rawValue: rawMask)
			else {
				return
			}
			webApp.presenterMask = mask
		case .goToSlide:
			if let value: String = message.typedValue() {
				if value == "next" {
					webApp.nextSlide()
				} else {
					webApp.previousSlide()
				}
			}
		case .presenterRotation:
			if message.needsReset {
				webApp.presenterRotation = 0
				return
			}
			if let value: Double = message.typedValue() {
				webApp.presenterRotation = 360 - value
				return
			}
			// StreamDeck and our rotation directions are opposite, so subtract
			webApp.presenterRotation -= message.delta
		case .presenterEnhancement:
			if message.needsReset {
				webApp.presenterEnhancement = 0
				return
			}

			if let value: Int = message.typedValue() {
				webApp.presenterEnhancement = Double(value) * 0.01
				return
			}

			let change: Double = message.delta * 0.01
			webApp.presenterEnhancement += change
		case .presenterOpacity:
			if message.needsReset {
				webApp.presenterOpacity = 1
				return
			}

			if let value: Int = message.typedValue() {
				webApp.presenterOpacity = Double(value) * 0.01
				return
			}

			let change: Double = message.delta * 0.01
			webApp.presenterOpacity += change
		case .presenterScale:
			if message.needsReset {
				webApp.presenterScale = 1
				return
			}

			if let value: Int = message.typedValue() {
				webApp.presenterScale = Double(value) * 0.01
				return
			}

			let change: Double = message.delta * 0.01
			webApp.presenterScale += change
		case .presenterFullscreen:
			webApp.presenterFullscreen.toggle()
		case .toggleBigHands:
			webApp.gesturesEnabled.toggle()
		case .toggleCamera:
			webApp.cameraEnabled.toggle()
		case .toggleMic:
			webApp.microphoneEnabled.toggle()
		case .switchRoom:
			if message.needsReset {
				sendRoomInfo(forContext: message.context)
				return
			}

			guard let value: String = message.typedValue() else {
				Logger.logMessage("Missing value", level: .error)
				return
			}
			webApp.switchToRoom(withIdentifier: value)
		case .switchMedia:
			if message.needsReset {
				sendMediaInfo(forContext: message.context)
				return
			}

			guard let value: String = message.typedValue() else {
				Logger.logMessage("Missing value", level: .error)
				return
			}
			webApp.showMedia(withIdentifier: value)
		case .toggleSlide:
			webApp.slideVisible.toggle()
		case .toggleBackground:
			webApp.backgroundEnabled.toggle()
		case .toggleMirrorVideo:
			webApp.mirrorVideo.toggle()
		case .toggleRecording:
			if webApp.isRecording {
				webApp.pauseRecording()
			} else {
				webApp.startOrResumeRecording()
			}
		case .presenterEffect:
			guard let value: String = message.typedValue() else {
				Logger.logMessage("Missing value", level: .error)
				return
			}
			webApp.currentEffectID = (value == "") ? nil : value
		case .presenterEffectValue:
			if message.needsReset {
				webApp.presenterEffectValue = 0.2
				return
			}

			if let value: Int = message.typedValue() {
				webApp.presenterEffectValue = Double(value) * 0.01
				return
			}

			let change: Double = message.delta * 0.01
			webApp.presenterEffectValue += change
		}
	}

	// MARK: - Updating Stream Deck State

	func sendMessage(action: StreamDeckMessage.Action, properties: [StreamDeckMessage.PropertyKey: Sendable]) {
		guard connection.connected, isHandlingMessage == false else { return }

		do {
			try connection.sendMessage(StreamDeckMessage(action: action, properties: properties))
		} catch {
			Logger.logMessage("Sending update for \(action.rawValue) failed: \(error)", level: .error, targets: .uncheckedAll)
		}
	}

	func sendPresenterEffectsMessage(with presenterEffects: [String: String]) {
		sendMessage(action: .presenterEffect, properties: propertiesFor(presenterEffects))
	}

	private func sendRoomInfo(forContext context: String) {
		Task {
			do {
				guard let webApp else {
					Logger.logMessage("No web app to send media info for.", level: .error)
					return
				}
				guard let room: WebApp.Room = try await webApp.currentRoom else {
					Logger.logMessage("Skipping to send room info for nil room.", level: .debug)
					return
				}
				try connection.sendMessage(StreamDeckMessage(action: .switchRoom, properties: [
					.context: context,
					.value: room.json,
				]))
			} catch {
				Logger.logMessage("Error sending room info: \(error)", level: .error)
			}
		}
	}

	private func sendMediaInfo(forContext context: String) {
		Task {
			do {
				guard let webApp else {
					Logger.logMessage("No web app to send media info for.", level: .error)
					return
				}
				guard let media: WebApp.Media = try await webApp.currentMedia else {
					Logger.logMessage("Skipping to send media info for nil media.", level: .debug)
					return
				}
				try connection.sendMessage(StreamDeckMessage(action: .switchMedia, properties: [
					.context: context,
					.value: media.json,
				]))
			} catch {
				Logger.logMessage("Error sending media info: \(error)", level: .error)
			}
		}
	}

	private func propertiesFor(_ presenterEffects: [String: String]) -> [StreamDeckMessage.PropertyKey: Sendable] {
		let mappedEffects: [[String: String]] = presenterEffects.map { ["name": $0, "value": $1] }
		return [
			.options: mappedEffects,
			.icons: Self.iconURLs(forEffectsWithIDs: Array(presenterEffects.values)),
		]
	}

	private static func iconURLs(forEffectsWithIDs effectIDs: [String]) -> [String: String] {
		var icons: [String: String] = [:]
		for effect in effectIDs {
			guard let iconURL = iconURL(forEffectWithID: effect) else {
				continue
			}
			icons[effect] = iconURL
		}
		return icons
	}

	private static func iconURL(forEffectWithID effectID: String) -> String? {
		guard
			let icon = NSImage(named: "effect_\(effectID)"),
			let jpegData: String = icon.jpegData?.base64EncodedString()
		else {
			return nil
		}
		return "data:image/jpg;base64,\(jpegData)"
	}

	// MARK: - Error

	private func showUpdateAlert() {
		guard hasShownUpdateAlert == false else { return }

		// Check if 30 days have passed since last suppression
		if let suppressionTimeInterval: TimeInterval = UserDefaults.standard.streamDeckUpdateAlertSuppressionTimeInterval,
		   Date.now.timeIntervalSince1970 - suppressionTimeInterval < UserDefaults.mmhmmKey.StreamDeck.maximumSuppressionTimeInterval {
			return
		}

		let alert = NSAlert()
		alert.messageText = "Stream Deck Plugin Needs Update"
		alert.informativeText = "Please update the Airtime Stream Deck Plugin from the Elgato Stream Deck app."
		alert.addButton(withTitle: String(localized: "Open Stream Deck", comment: "Update alert OK button"))
		alert.addButton(withTitle: String(localized: "Remind Me in 30 Days", comment: "Update alert suppress button"))

		let response = alert.runModal()
		hasShownUpdateAlert = true

		if response == .alertSecondButtonReturn {
			UserDefaults.standard.streamDeckUpdateAlertSuppressionTimeInterval = Date.now.timeIntervalSince1970
		} else {
			Task { await openStreamDeckApp() }
		}
	}

	// MARK: - Install check
	private var isPluginInstalled: Bool {
		guard let appSupportDirectory: URL = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask).first else {
			return false
		}

		let pluginDirectory: URL = appSupportDirectory.appendingPathComponent("com.elgato.StreamDeck/Plugins/app.mmhmm.mmhmm.sdPlugin")
		return FileManager.default.fileExists(atPath: pluginDirectory.path)
	}

	private var streamDeckAppURL: URL? {
		if let appDirectory = URL.applicationsDirectory?.appendingPathComponent("Elgato Stream Deck.app"), FileManager.default.fileExists(atPath: appDirectory.path) {
			appDirectory
		} else if let userAppDirectory = URL.userApplicationsDirectory?.appendingPathComponent("Elgato Stream Deck.app"), FileManager.default.fileExists(atPath: userAppDirectory.path) {
			userAppDirectory
		} else {
			nil
		}
	}

	private var isStreamDeckInstalled: Bool {
		streamDeckAppURL != nil
	}

	private static let downloadStreamDeckPluginURL = URL(string: "https://marketplace.elgato.com/product/mmhmm-61274056-f6e5-4a06-82b4-5dc535aa0cfc").unsafelyUnwrapped
	private static let streamDeckHelpURL = URL(string: "https://help.mmhmm.app/hc/en-us/articles/18891538024727-Use-Elgato-s-Stream-Deck-with-mmhmm").unsafelyUnwrapped
	private static let streamDeckBundleIdentifier = "com.elgato.StreamDeck"

	private func openStreamDeckApp() async {
		guard let streamDeckAppURL else {
			Logger.logMessage("Stream Deck app is not installed", level: .info)
			return
		}

		do {
			try await NSWorkspace.shared.openApplication(at: streamDeckAppURL, configuration: NSWorkspace.OpenConfiguration())
		} catch {
			Logger.logMessage("Failed to open Stream Deck app: \(error)", level: .error)
		}
	}

	private func showInstallAlertIfNeeded() {
		guard isPluginInstalled == false, isStreamDeckInstalled, UserDefaults.standard.suppressStreamDeckInstallAlert == false else {
			return
		}

		let alert = NSAlert()
		alert.messageText = NSLocalizedString("Would you like to download the Elgato Stream Deck plugin?", comment: "Install SD Plugin alert message")
		alert.informativeText = NSLocalizedString("Airtime has been designed to work with Elgato Stream Deck. To get the most out of Airtime and Stream Deck you'll need to download the plugin.", comment: "Install SD Plugin alert info text")
		alert.addButton(withTitle: NSLocalizedString("Download…", comment: "Install SD Plugin Download button"))
		alert.addButton(withTitle: NSLocalizedString("Learn More…", comment: "Install SD Plugin Learn More button"))
		alert.addButton(withTitle: NSLocalizedString("Close", comment: "Install SD Plugin close button")).keyEquivalent = "\u{1b}"
		alert.showsSuppressionButton = true

		let response: NSApplication.ModalResponse = alert.runModal()
		if response == .alertFirstButtonReturn {
			NSWorkspace.shared.open(Self.downloadStreamDeckPluginURL)
		} else if response == .alertSecondButtonReturn {
			NSWorkspace.shared.open(Self.streamDeckHelpURL)
		}

		UserDefaults.standard.suppressStreamDeckInstallAlert = (alert.suppressionButton?.state == .on)
	}
}

extension StreamDeckManager: StreamDeckConnectionDelegate {
	nonisolated func connection(_ connection: StreamDeckConnection, didEncounterError error: Error) {
		switch error {
		case StreamDeckMessage.Error.apiMismatch:
			#if !TEST
			Task { @MainActor in
				showUpdateAlert()
			}
			#endif
		default:
			// Other errors are simply logged
			break
		}
	}
}

extension UserDefaults.mmhmmKey {
	enum StreamDeck {
		fileprivate static let suppressStreamDeckInstallAlert: String = "SuppressStreamDeckInstallAlert"
		fileprivate static let streamDeckUpdateAlertSuppressionDate: String = "StreamDeckUpdateAlertSuppressionDate"
		fileprivate static let maximumSuppressionDays: Int = 30
		fileprivate static let maximumSuppressionTimeInterval: Double = Double(60 * 60 * 24 * maximumSuppressionDays)
	}
}

extension UserDefaults {
	fileprivate var suppressStreamDeckInstallAlert: Bool {
		get {
			return bool(forKey: mmhmmKey.StreamDeck.suppressStreamDeckInstallAlert)
		}
		set {
			set(newValue, forKey: mmhmmKey.StreamDeck.suppressStreamDeckInstallAlert)
		}
	}

	fileprivate var streamDeckUpdateAlertSuppressionTimeInterval: TimeInterval? {
		get {
			return object(forKey: mmhmmKey.StreamDeck.streamDeckUpdateAlertSuppressionDate) as? TimeInterval
		}
		set {
			set(newValue, forKey: mmhmmKey.StreamDeck.streamDeckUpdateAlertSuppressionDate)
		}
	}
}
