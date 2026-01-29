//
//  RemoteReceiver.swift
//  mmhmm
//
//  Created by Beni Federer on 13.05.25.
//

import AppKit

/// The receiver of remote control commands.
final class RemoteReceiver: NSObject {
	@MainActor
	init(appState: AppState, browser: Browser, cameraExtensionStateProvider: DeviceManager.CameraExtensionStateProvider) {
		self.appState = appState
		self.browser = browser
		self.cameraExtensionStateProvider = cameraExtensionStateProvider
	}

	@MainActor
	private let appState: AppState

	@MainActor
	private let browser: Browser

	@MainActor
	private let cameraExtensionStateProvider: DeviceManager.CameraExtensionStateProvider

	private var creator: WebApp.Creator { browser.creator }

	private var screenRecorder: WebApp.ScreenRecorder { browser.screenRecorder }
}

extension RemoteReceiver: RemoteControlled {
	@MainActor
	var state: RemoteControlState {
		RemoteControlState(appState: appState, creator: creator, screenRecorder: screenRecorder, cameraExtensionStateProvider: cameraExtensionStateProvider)
	}

	func previousSlide() {
		Task { @MainActor in
			creator.previousSlide()
		}
	}

	func nextSlide() {
		Task { @MainActor in
			creator.nextSlide()
		}
	}

	func toggleSlideVisible() {
		Task { @MainActor in
			creator.slideVisible.toggle()
		}
	}

	func toggleCameraEnabled() {
		Task { @MainActor in
			creator.cameraEnabled.toggle()
		}
	}

	func togglePresenterFullscreen() {
		Task { @MainActor in
			creator.presenterFullscreen.toggle()
		}
	}

	func toggleGesturesEnabled() {
		Task { @MainActor in
			creator.gesturesEnabled.toggle()
		}
	}

	func toggleScreenRecorder() {
		Task { @MainActor in
			screenRecorder.toggleRecording()
		}
	}

	func recordScreen() {
		Task { @MainActor in
			screenRecorder.recordScreen()
		}
	}

	func recordWindow() {
		Task { @MainActor in
			screenRecorder.recordWindow()
		}
	}

	func openWebApp(_ webAppType: WebApp.WebAppType) {
		Task { @MainActor in
			browser.launchWebApp(ofType: webAppType)
		}
	}

	func quitApp() {
		Task { @MainActor in
			NSApp.terminate(self)
		}
	}
}

extension RemoteReceiver: RemoteControlledXPCProtocol {
	func ping(with reply: @escaping () -> Void) {
		Logger.logMessage("Responding to ping.", level: .info)
		reply()
	}

	func openWebApp(_ webAppType: WebApp.WebAppType.XPCTransportType) {
		do {
			let webAppType = try WebApp.WebAppType(xpcTransportValue: webAppType)
			openWebApp(webAppType)
		} catch {
			Logger.logError(error, messagePrefix: "Failed to open app mode")
		}
	}

	func updatedState() async -> RemoteControlState.XPCTransportType {
		let remoteControlState: RemoteControlState = await MainActor.run { state }
		do {
			return try remoteControlState.xpcTransportValue
		} catch {
			Logger.logError(error, messagePrefix: "Failed to serialize remote control state")
			return RemoteControlState.XPCTransportType()
		}
	}
}

extension RemoteReceiver: Sendable {}
