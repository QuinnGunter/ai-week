//
//  Browser+CEFBrowserDelegate.swift
//  mmhmm
//
//  Created by Beni Federer on 11.09.24.
//

import AppKit

extension Browser: CEFBrowserDelegate {
	func browserWasCreated(withResult result: Result<CEFBrowser.CreationInfo, CEFBrowser.Error>) {
		switch result {
		case let .failure(error):
			Logger.logError(error, messagePrefix: "Failed to create browser", level: .fault)
		case let .success(creationInfo):
			handleCreationInfo(creationInfo)
		}
	}

	func browserDidStartBrowsing(withResult result: Result<CEFBrowser.BrowsingInfo, CEFBrowser.Error>) {
		switch result {
		case let .failure(error):
			Logger.logError(error, messagePrefix: "Browser failed starting browsing", level: .fault)
		case let .success(browsingInfo):
			handleBrowsingInfo(browsingInfo)
		}
	}

	func browserDidFinishLoading(withResult result: Result<CEFBrowser.LoadInfo, CEFBrowser.Error>) {
		switch result {
		case let .failure(error):
			handleLoadingFailed(withError: error)
		case let .success(loadInfo):
			handleLoadInfo(loadInfo)
		}
	}

	/// Determines whether the specified window should close.
	///
	/// If the passed in window is the main app window, it is
	/// hidden instead of closed and the toolbox window is presented.
	///
	/// - Parameter window: The window to check.
	/// - Returns: `false` for the main app window, `true` otherwise.
	func canCloseWindow(_ window: NSWindow) -> Bool {
		guard let webApp: WebAppProtocol = webApps.first(where: { $0.ownsWindow(window) }) else {
			// The window is not managed by any web app, so allow it to close.
			return true
		}

		guard webApp.webAppType == .toolbox else {
			return webApp.canClose(window: window)
		}

		// The toolbox window is never closed, just hidden to avoid load flicker,
		// unless it's the last web app window to be closed.

		if Application.cefAppDelegate.appState.webApps.count > 1 {
			// Other web app windows are still open.
			toolbox.windowManager.isPresenting = false
			return false
		} else {
			return true
		}
	}

	func windowDidClose(forWebApp webApp: WebApp.WebAppType) {
		guard let webApp: WebAppProtocol = webApps.first(where: { $0.handleWindowDidClose(ofWebApp: webApp) }) else {
			Logger.logMessage("No web app handled window did close for \(webApp) web app type.", level: .error)
			return
		}

		if toolbox.isVisible == false,
		   Application.cefAppDelegate.appState.webApps.count == 2,
		   closingLastWebAppClosesToolbox {
			// The last non-toolbox web app window closed, while the toolbox window is not visible.
			// To users, this would appear as if the last app window was closed, which should quit the app,
			// so close the hidden toolbox window as well, which terminates the app.
			toolbox.close()
		} else if Application.isTerminating == false {
			// A non-toolbox web app window closed. Just remove it from the app state.
			// Web apps must not be removed from the app state when terminating to ensure they
			// are persisted before the app terminates, which allows restoring them on next launch.
			Application.cefAppDelegate.appState.removeWebApp(webApp.webAppType)
		}

		Logger.logMessage("Handled window did close for \(webApp.webAppType.userFriendlyName) webApp.", level: .info)
	}

	func navigateToExternalURL(_ url: URL) {
		Logger.logMessage("Opening URL in external browser: \(url.absoluteString)", level: .info)
		NSWorkspace.shared.open(url)
	}
}

extension Browser {
	private func handleCreationInfo(_ info: CEFBrowser.CreationInfo) {
		Logger.logMessage("Handling creation of window for \(info.webAppType) web app at \(info.urlDescription).", level: .info)

		switch info.webAppType {
		case .broadcast, .camera, .creator, .hybridAPITester, .localHost, .miniRemote, .mmhmm, .screenRecorder, .stacks, .toolbox:
			// mmhmm is handled by Camera and Creator web apps.
			if let webApp: WebAppProtocol = webApps.first(where: { $0.handle(creationInfo: info) }) {
				Application.cefAppDelegate.appState.addWebApp(webApp.webAppType)
			} else {
				Logger.logMessage("Unexpected creation of web app \(info.webAppType) at \(info.urlDescription).", level: .error)
			}
		case .external, .settings:
			Logger.logMessage("Unexpected creation of web app \(info.webAppType) at \(info.urlDescription).", level: .error)
		case .offline, .prompt, .segmentationPanel:
			Logger.logMessage("Created window for \(info.webAppType) web app at \(info.urlDescription).", level: .info)
		}

		// Reset the flag in case it was set when closing the previously last web app window.
		closingLastWebAppClosesToolbox = true
	}

	private func handleBrowsingInfo(_ info: CEFBrowser.BrowsingInfo) {
		Logger.logMessage("Browsing to web app \(info.webAppType) at \(info.urlDescription).", level: .info)

		switch info.webAppType {
		case .external where info.url?.hasHybridAppScheme ?? false:
			Logger.logMessage("Opening hybrid app URL in external browser: \(info.urlDescription).", level: .info)
			openURL(url: info.url.unsafelyUnwrapped)
		case .camera, .creator, .hybridAPITester, .localHost, .mmhmm, .screenRecorder, .stacks, .toolbox:
			// mmhmm is handled by Camera and Creator web apps.
			if webApps.first(where: { $0.handle(browsingInfo: info) }) == nil {
				Logger.logMessage("Unexpected browsing of web app \(info.webAppType) at \(info.urlDescription).", level: .error)
			}
		default:
			Logger.logMessage("Browsing to web app \(info.webAppType) at \(info.urlDescription).", level: .info)
		}
	}

	private func handleLoadingFailed(withError error: CEFBrowser.Error) {
		guard case let .failedLoading(rawURL, webApp, error, browserID, isMainFrame, _) = error else {
			Logger.logError(error, messagePrefix: "Browser failed loading web app", level: .fault)
			return
		}

		switch webApp {
		case .camera, .creator, .hybridAPITester, .localHost, .mmhmm, .screenRecorder, .stacks, .toolbox:
			// mmhmm is handled by Camera and Creator web apps.
			if webApps.first(where: { $0.handle(error: error, rawURL: rawURL, webApp: webApp, browserID: browserID, isMainFrame: isMainFrame) }) != nil {
				return
			}
		default:
			break
		}

		Logger.logError(error, messagePrefix: "Received unexpected loading failed error for web app \(webApp)")
	}

	private func handleLoadInfo(_ info: CEFBrowser.LoadInfo) {
		Logger.logMessage("Handling finished loading of \(info.webAppType) web app at \(info.urlDescription).", level: .info)

		switch info.webAppType {
		case .broadcast, .camera, .creator, .hybridAPITester, .miniRemote, .mmhmm, .offline, .screenRecorder, .stacks, .toolbox:
			// `.mmhmm` is handled by Camera and Creator web apps.
			// `.offline` requires that the respective browser window transitions out of the loading state to hide its loading indicator.
			if webApps.first(where: { $0.handle(loadInfo: info) }) == nil {
				Logger.logMessage("Unexpected loading finished of web app \(info.webAppType) at \(info.urlDescription).", level: .error)
			}
		case .localHost:
			if webApps.first(where: { $0.handle(loadInfo: info) }) != nil {
				Logger.logMessage("Handled loading finished of web app \(info.webAppType) at \(info.urlDescription) as override.", level: .info)
			} else {
				Logger.logMessage("Unexpected web app finished loading: \(info.webAppType) at \(info.urlDescription).", level: .error)
			}
		case .prompt, .settings:
			Logger.logMessage("Unexpected web app finished loading: \(info.webAppType) at \(info.urlDescription).", level: .error)
		case .external, .segmentationPanel:
			Logger.logMessage("Handled loading finished of web app \(info.webAppType) at \(info.urlDescription).", level: .info)
		}
	}

	private func terminate() {
		Task { @MainActor in
			// Put the termination asynchronously on the main actor to avoid CEF
			// getting caught up in incomplete window management and crashing.
			NSApp.terminate(nil)
		}
	}
}
