//
//  Browser.swift
//  mmhmm
//
//  Created by Martin Pilkington on 16/06/2023.
//

import AppKit
import Combine
import Foundation

import Common

@MainActor
final class Browser {
	init(appState: AppState) {
		camera = WebApp.Camera(appState: appState)
		creator = WebApp.Creator(appState: appState)
		screenRecorder = WebApp.ScreenRecorder(appState: appState)
		stacks = WebApp.Stacks(appState: appState)
		toolbox = WebApp.Toolbox(appState: appState)

		subscriptions = subscribeToThemeChanges()
	}

	let camera: WebApp.Camera
	let creator: WebApp.Creator
	let screenRecorder: WebApp.ScreenRecorder
	let stacks: WebApp.Stacks
	let toolbox: WebApp.Toolbox
	var closingLastWebAppClosesToolbox: Bool = true

	/// An array of all web apps.
	var webApps: [WebAppProtocol] {
		[camera, creator, screenRecorder, stacks, toolbox]
	}

	/// Stores a launch deep link.
	///
	/// When the system launches the app through a registered deep link scheme,
	/// the web apps are uninitialized and can't process the deep link's contents yet.
	/// The contents of this variable can be weaved into the targeted web app's URL,
	/// when it is ready to be launched.
	var deepLinkLaunchURL: URL?

	private var subscriptions: Set<AnyCancellable> = []

	/// Returns the web app of the specified type, or `nil` if there is no such web app.
	func webApp(ofType webAppType: WebApp.WebAppType) -> WebAppProtocol? {
		switch webAppType {
		case .camera: camera
		case .creator: creator
		case .screenRecorder: screenRecorder
		case .stacks: stacks
		case .toolbox: toolbox
		default: nil
		}
	}

	/// Returns whether the specified web app type is currently presented.
	func isPresenting(webAppOfType webAppType: WebApp.WebAppType) -> Bool {
		webApp(ofType: webAppType)?.windowManager.isPresenting ?? false
	}

	/// Returns the web app managing the browser with the specified ID.
	func webAppManagingBrowser(withID browserID: Int) -> WebAppProtocol? {
		webApps.first { $0.ownsBrowser(withID: browserID) }
	}

	/// Returns the web app the key window belongs to. Returns `nil` if the
	/// key window is `nil` or does not belong to any web app.
	var webAppOwningKeyWindow: WebAppProtocol? {
		switch NSApp.keyWindow {
		case nil: nil
		case camera.windowManager.window: camera
		case creator.windowManager.window: creator
		case creator.broadcastWindowManager?.window: creator
		case creator.remoteControlWindowManager?.window: creator
		case screenRecorder.windowManager.window: screenRecorder
		case stacks.windowManager.window: stacks
		case toolbox.windowManager.window: toolbox
		case toolbox.hybridAPITesterWindow: toolbox
		default: nil
		}
	}

	var typeOfWebAppOwningKeyWindow: WebApp.WebAppType? {
		switch NSApp.keyWindow {
		case nil: nil
		case camera.windowManager.window: .camera
		case creator.windowManager.window: .creator
		case screenRecorder.windowManager.window: .screenRecorder
		case stacks.windowManager.window: .stacks
		case toolbox.windowManager.window: .toolbox
		case toolbox.hybridAPITesterWindow: .hybridAPITester
		case creator.broadcastWindowManager?.window: .broadcast
		case creator.remoteControlWindowManager?.window: .miniRemote
		default: nil
		}
	}

	func updateHybridWithAppWindows() {
		Logger.logMessage("Updating web app with app windows.", level: .info)

		// Camera and Creator are mutually exclusive, so treat both as the legacy Malk main app window.
		let mainAppWindowIsFloating: Bool = camera.windowManager.window?.isFloating ?? creator.windowManager.window?.isFloating ?? false
		let mainAppWindowIsHidden: Bool = !(camera.windowManager.isPresenting || creator.windowManager.isPresenting)
		let mainAppWindow = mmhmm.MainAppWindow(mainAppWindowIsFloating, mainAppWindowIsHidden)
		let hybridAppWindows: mmhmm.AppWindows = mmhmm.AppWindows(mainAppWindow)
		CxxBridge.updateAppWindows(hybridAppWindows)
	}

	func drop(urls: [URL]) throws {
		try webAppOwningKeyWindow
			.flatMap { $0 as? FileDropReceiver }?
			.drop(urls: urls)
	}

	// MARK: - Web App Events

	func setup(withHybridBridgeInitializedInfo info: SwiftBridgeHybridBridgeInitializedInfo) {
		if info.browserID == camera.windowManager.browserID {
			camera.setup(withHybridBridgeInitializedInfo: info)
		} else if info.browserID == creator.windowManager.browserID {
			creator.setup(withHybridBridgeInitializedInfo: info)
		} else {
			Logger.logMessage("Ignoring hybrid bridge initialized info for unknown browser ID \(info.browserID).", level: .info)
		}
	}

	func updateProperty(browserID: Int, key: String, value: Sendable?) {
		if browserID == camera.windowManager.browserID {
			camera.updateProperty(key: key, value: value)
		} else if browserID == creator.windowManager.browserID {
			creator.updateProperty(key: key, value: value)
		} else {
			Logger.logMessage("Ignoring update property request for unknown browser ID \(browserID).", level: .info)
		}
	}

	func webAppStartedStageRendering(browserID: Int) {
		if browserID == camera.windowManager.browserID {
			camera.isStageRendering = true
		} else if browserID == creator.windowManager.browserID {
			creator.isStageRendering = true
		} else {
			Logger.logMessage("Ignoring started stage rendering event for unknown browser ID \(browserID)", level: .info)
		}
	}

	func webAppStoppedStageRendering(browserID: Int) {
		if browserID == camera.windowManager.browserID {
			camera.isStageRendering = false
		} else if browserID == creator.windowManager.browserID {
			creator.isStageRendering = false
		} else {
			Logger.logMessage("Ignoring stopped stage rendering event for unknown browser ID \(browserID)", level: .info)
		}
	}

	func webAppHasNativeCallbackRequest(withContextIdentifier contextIdentifier: String, json: String, browserID: Int) {
		guard let webApp: WebAppProtocol = webAppManagingBrowser(withID: browserID) else {
			Logger.logMessage("Ignoring native callback request for unknown browser ID \(browserID).", level: .info)
			return
		}

		webApp.javaScriptExecutor.handleNativeCallbackRequest(withContextIdentifier: contextIdentifier, json: json)
	}

	// MARK: - Private API

	private func subscribeToThemeChanges() -> Set<AnyCancellable> {
		var subscriptions: Set<AnyCancellable> = []

		// Web app switched themes

		camera
			.$theme
			.compactMap { $0 }
			.removeDuplicates()
			.sink { NSApp.appearance = $0.appearance }
			.store(in: &subscriptions)

		creator
			.$theme
			.compactMap { $0 }
			.removeDuplicates()
			.sink { NSApp.appearance = $0.appearance }
			.store(in: &subscriptions)

		return subscriptions
	}
}
