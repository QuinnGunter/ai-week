//
//  WebApp.Base.swift
//  mmhmm
//
//  Created by Beni Federer on 12.09.25.
//

import AppKit

import Common

@MainActor
protocol WebAppProtocol {
	/// Launches the web app, if it is not already open.
	func launch(withQuery query: String?, fragment: String?, initiallyHidden: Bool)

	/// Handles the creation of a new browser window.
	///
	/// - Parameter creationInfo: Information about the created browser window.
	/// - Returns: `true` if the event was handled, `false` otherwise.
	func handle(creationInfo: CEFBrowser.CreationInfo) -> Bool

	/// Handles browsing information updates.
	///
	/// - Parameter browsingInfo: Information about the browsing state.
	/// - Returns: `true` if the event was handled, `false` otherwise.
	func handle(browsingInfo: CEFBrowser.BrowsingInfo) -> Bool

	/// Handles loading failures.
	///
	/// - Parameters:
	///   - error: The error that occurred during loading.
	///   - rawURL: The URL that failed to load.
	///   - webApp: The type of web app that encountered the error.
	///   - browserID: The identifier of the browser that encountered the error.
	/// - Returns: `true` if the event was handled, `false` otherwise.
	func handle(error: Swift.Error, rawURL: String, webApp: WebApp.WebAppType, browserID: Int, isMainFrame: Bool) -> Bool

	/// Handles loading information updates.
	///
	/// - Parameter loadInfo: Information about the loading state.
	/// - Returns: `true` if the event was handled, `false` otherwise.
	func handle(loadInfo: CEFBrowser.LoadInfo) -> Bool

	/// Determines whether the conforming instance owns the given window.
	///
	/// - Parameter window: The window to check.
	/// - Returns: `true` if the conforming instance owns the window, `false
	func ownsWindow(_ window: NSWindow) -> Bool

	/// Determines whether the window can be closed by the conforming instance.
	///
	/// - Parameter window: The window to check.
	/// - Returns: `true` if the window can be closed, `false` otherwise.
	func canClose(window: NSWindow) -> Bool

	/// Notifies the conforming instance that a window for a given
	/// web app was closed.
	///
	/// - Parameter ofWebApp: The type of web app whose window was closed.
	/// - Returns: `true` if the event was handled, `false` otherwise.
	func handleWindowDidClose(ofWebApp webApp: WebApp.WebAppType) -> Bool

	/// Emits an event to the web app.
	///
	/// - Parameter event: The event to emit.
	/// - Throws: An error if the event could not be emitted.
	func emit(event: WebAppEventRepresentable) throws

	/// Handles an event received from the web app.
	///
	/// - Parameters:
	///  - name: The name of the event.
	///  - payload: The payload of the event.
	/// - Returns: `true` if the event was handled, `false` otherwise.
	func handleEvent(withName name: String, payload: [String: Any]) -> Bool

	/// Determines whether the conforming instance owns the browser with the given ID.
	///
	/// - Parameter browserID: The identifier of the browser.
	/// - Returns: `true` if the conforming instance owns the browser, `false` otherwise.
	func ownsBrowser(withID browserID: Int) -> Bool

	/// The type of web app the conforming instance manages.
	var webAppType: WebApp.WebAppType { get }

	/// The executor context to run JavaScript in the web app.
	var javaScriptExecutor: WebApp.JavaScriptExecutor { get }

	/// The window manager of the web app.
	///
	/// If the web app has multiple windows, this is the primary window manager.
	var windowManager: WebApp.WindowManager { get }
}

protocol WebAppConfigurationProtocol: Sendable {
	static var webAppType: WebApp.WebAppType { get }
	static var url: URL { get async throws }
}

extension WebAppConfigurationProtocol {
	static var url: URL {
		get async throws {
			try await Configuration.url(for: webAppType)
		}
	}
}

extension WebApp {
	enum State: Equatable, Hashable {
		case idle
		case launching
		case created
		case browsing
		case loaded
		case failed
	}

	@MainActor
	class Base<WebAppConfiguration: WebAppConfigurationProtocol>: WebAppProtocol, FileDropReceiver {
		init(appState: AppState) {
			let windowManagerType = WindowManager.windowManagerType(for: WebAppConfiguration.webAppType)
			windowManager = windowManagerType.init(appState: appState)
		}

		let javaScriptExecutor = JavaScriptExecutor()
		let windowManager: WindowManager
		let webAppType: WebApp.WebAppType = WebAppConfiguration.webAppType
		private(set) var state: State = .idle

		/// Allowed state transitions where the key is the new state
		/// and the value is an array of valid previous states.
		private let allowedStateTransitions: [State: [State]] = [
			.idle: [.created, .browsing, .loaded, .failed],
			.launching: [.idle],
			.created: [.launching],
			.browsing: [.created, .loaded, .failed],
			.loaded: [.browsing],
			.failed: [.idle, .launching, .created, .browsing, .loaded],
		]

		func updateState(_ state: State) throws {
			guard self.state != state else { return }

			guard allowedStateTransitions[state]?.contains(self.state) == true else {
				throw Error.invalidTransition(from: self.state, to: state)
			}

			self.state = state
			didUpdateState(state)
		}

		/// Called after the state has been updated.
		///
		/// - Parameter state: The new state.
		/// - Note: Override, and call, in subclasses if needed.
		func didUpdateState(_ state: State) {
			guard state == .loaded || state == .failed else { return }
			Application.cefAppDelegate.browser.updateHybridWithAppWindows()
		}

		/// Launches the Stacks web app, if it is not already open.
		///
		/// - Parameters:
		///   - query: Query string to forward to the Stacks web app.
		///   - fragments: Fragment string to forward to the Stacks web app.
		///   - initiallyHidden: Whether the window should be initially hidden.
		func launch(withQuery query: String? = nil, fragment: String? = nil, initiallyHidden: Bool = false) {
			guard windowManager.isPresenting == false else {
				Logger.logMessage("Web app \(webAppType) is already open.", level: .info)
				CxxBridge.notifyHybridOfWebAppCallbackData(
					webAppType.hybridWebAppType,
					std.string(query),
					std.string(fragment)
				)
				return
			}

			Task {
				do {
					let url: URL = try await WebAppConfiguration.url
					var components = URLComponents(url: url, resolvingAgainstBaseURL: false)

					// Start building query with existing query items, if any.
					var queryItems: [URLQueryItem] = components?.queryItems ?? []

					// Add provided query string as query parameters.
					if let query, let items: [URLQueryItem] = URLComponents(string: "?\(query)")?.queryItems {
						queryItems.append(contentsOf: items)
					}

					// Add system info as query parameters.
					for queryParameter in SystemReporter.SystemInfo().dictionaryRepresentation {
						queryItems.append(URLQueryItem(name: queryParameter.key, value: queryParameter.value))
					}

					// While Camera is still being served through the same URL as Creator, adorn the URL with a query parameter.
					if webAppType == .camera, url.absoluteString.contains("talk"), let items: [URLQueryItem] = URLComponents(string: "?\(WebApp.WebAppType.cameraIndicatorQueryParameter)")?.queryItems {
						queryItems.append(contentsOf: items)
					}

					components?.queryItems = queryItems
					if let fragment {
						components?.appendFragment(fragment)
					}

					guard let loadURL: URL = components?.url else {
						Logger.logMessage("Failed to create adorned \(webAppType) URL.", level: .error)
						return
					}

					let bounds: CGRect = webAppType.frameAutosaveName.frame ?? .null

					let config = CxxBridge.CEFRootWindowConfig(
						bounds: bounds,
						url: std.string(loadURL.absoluteString),
						initiallyHidden: initiallyHidden,
						withControls: false,
						webAppType: webAppType.hybridWebAppType
					)

					try await MainActor.run {
						try updateState(.launching)

						Logger.logMessage("Launching \(webAppType) web app at \(loadURL).", level: .info)

						// Ensure window code is called on the main thread.
						_ = CxxBridge.createRootWindow(config)
					}
				} catch {
					Logger.logError(error, messagePrefix: "Failed to create \(webAppType) window", level: .fault)
				}
			}
		}

		func handle(creationInfo: CEFBrowser.CreationInfo) -> Bool {
			guard
				let url: URL = creationInfo.url,
				creationInfo.webAppType.mmhmmResolved(url: url) == webAppType || creationInfo.webAppType.localHostResolved(url: url) == webAppType
			else {
				return false
			}

			do {
				try updateState(.created)
			} catch {
				Logger.logError(error, messagePrefix: "Failed handling creation of \(webAppType) window", level: .fault)
				return false
			}

			Logger.logMessage("Created window for \(webAppType) web app at \(creationInfo.urlDescription).", level: .info)

			javaScriptExecutor.browserID = Int32(creationInfo.browserID)
			windowManager.window = creationInfo.window
			windowManager.browserID = creationInfo.browserID
			windowManager.showsToolbar = webAppType.showsToolbar

			return true
		}

		func handle(browsingInfo: CEFBrowser.BrowsingInfo) -> Bool {
			guard browsingInfo.browserID == windowManager.browserID else {
				return false
			}

			guard browsingInfo.isMainFrame else {
				return true
			}

			do {
				try updateState(.browsing)
			} catch {
				Logger.logError(error, messagePrefix: "Failed handling browsing of \(webAppType) window", level: .fault)
				return false
			}

			Logger.logMessage("Handled browsing of \(webAppType) to \(browsingInfo.urlDescription).", level: .info)

			return true
		}

		func handle(error: Swift.Error, rawURL: String, webApp: WebApp.WebAppType, browserID: Int, isMainFrame: Bool) -> Bool {
			guard browserID == windowManager.browserID else {
				return false
			}

			Analytics.shared.logErrorEvent("application_load_error", error: error)
			Logger.logError(error, messagePrefix: "Browser failed loading \(webAppType) at \(rawURL)", level: .fault)

			guard isMainFrame else {
				return true
			}

			do {
				try updateState(.failed)
			} catch {
				Logger.logError(error, messagePrefix: "Failed handling error of \(webAppType) window", level: .error)
				return false
			}

			return true
		}

		func handle(loadInfo: CEFBrowser.LoadInfo) -> Bool {
			guard loadInfo.browserID == windowManager.browserID else {
				return false
			}

			guard loadInfo.isMainFrame else {
				// Acknowledge load info for subframes, but do nothing.
				return true
			}

			do {
				try updateState(.loaded)
			} catch {
				Logger.logError(error, messagePrefix: "Failed handling loading finished of \(webAppType) window", level: .fault)
				return false
			}

			windowManager.isLoading = false

			Logger.logMessage("Finished loading \(webAppType) at \(loadInfo.urlDescription).", level: .info)

			return true
		}

		func ownsWindow(_ window: NSWindow) -> Bool {
			window == windowManager.window
		}

		func canClose(window: NSWindow) -> Bool {
			ownsWindow(window)
		}

		func handleWindowDidClose(ofWebApp webApp: WebApp.WebAppType) -> Bool {
			guard webAppType == webApp else {
				return false
			}

			do {
				try updateState(.idle)
			} catch {
				Logger.logError(error, messagePrefix: "Failed handling \(webAppType) window did close", level: .fault)
				return false
			}

			// Actual closing of the window was handled by CEF.
			windowManager.window = nil
			javaScriptExecutor.reset()

			return true
		}

		func emit(event: WebAppEventRepresentable) throws {
			guard let browserID: Int = windowManager.browserID else {
				throw Error.webAppNotReady
			}

			try WebApp.EventProxy.shared.emit(event: event, inBrowser: Int32(browserID))
		}

		func handleEvent(withName name: String, payload: [String: Any]) -> Bool {
			Logger.logMessage("Received event from \(webAppType) web app: \(payload)", level: .debug)

			switch name {
			case OpenNativeSettingsEvent.name:
				do {
					try Application.cefAppDelegate.remoteControlManager.openMenuBarSettings()
				} catch {
					Logger.logError(error, messagePrefix: "Failed to open menu bar settings from \(webAppType) web app event", level: .error)
				}
			case OpenScreenCapturePrivacySystemSettingsEvent.name:
				ScreenSharePickerManager.shared.openPrivacySystemPreferences()
			default:
				return false
			}

			return true
		}

		func ownsBrowser(withID browserID: Int) -> Bool {
			browserID == windowManager.browserID
		}
	}
}

extension WebApp {
	fileprivate struct OpenNativeSettingsEvent: Decodable, Sendable {
		static let name = "openNativeSettings"

		let name: String
	}

	fileprivate struct OpenScreenCapturePrivacySystemSettingsEvent: Decodable, Sendable {
		static let name = "openScreenCapturePrivacySystemSettings"

		let name: String
	}
}

extension WebApp.WebAppType {
	@MainActor
	var frameAutosaveName: NSWindow.FrameAutosaveName {
		switch self {
		case .camera: WebApp.CameraWindowManager.frameAutosaveName
		case .creator: WebApp.CreatorWindowManager.frameAutosaveName
		case .screenRecorder: WebApp.ScreenRecorderWindowManager.frameAutosaveName
		case .stacks: WebApp.StacksWindowManager.frameAutosaveName
		default: ""
		}
	}
}

extension WebApp.WindowManager {
	static func windowManagerType(for webAppType: WebApp.WebAppType) -> WebApp.WindowManager.Type {
		switch webAppType {
		case .camera: WebApp.CameraWindowManager.self
		case .creator: WebApp.CreatorWindowManager.self
		case .screenRecorder: WebApp.ScreenRecorderWindowManager.self
		case .stacks: WebApp.StacksWindowManager.self
		case .toolbox: WebApp.ToolboxWindowManager.self
		default: WebApp.WindowManager.self
		}
	}
}
