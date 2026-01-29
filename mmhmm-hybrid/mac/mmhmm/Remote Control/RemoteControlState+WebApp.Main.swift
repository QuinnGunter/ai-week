//
//  RemoteControlState+WebApp.Main.swift
//  mmhmm
//
//  Created by Beni Federer on 20.05.25.
//

import Foundation

extension RemoteControlState {
	@MainActor
	convenience init(
		appState: AppState,
		creator: WebApp.Creator,
		screenRecorder: WebApp.ScreenRecorder,
		cameraExtensionStateProvider: DeviceManager.CameraExtensionStateProvider
	) {
		self.init(
			slideStatus: creator.slideStatus,
			hasPreviousSlide: creator.hasPreviousSlide,
			hasNextSlide: creator.hasNextSlide,
			slideVisible: creator.slideVisible,
			cameraEnabled: creator.cameraEnabled,
			presenterFullscreen: creator.presenterFullscreen,
			gesturesEnabled: creator.gesturesEnabled,
			isSignedIn: creator.isSignedIn,
			virtualCameraIsAvailable: cameraExtensionStateProvider.state.enablesVirtualCamera,
			screenRecorderIsRecording: screenRecorder.isRecording,
			webApps: appState.webApps
		)
	}
}

extension DeviceManager.CameraExtensionStateProvider.State {
	fileprivate var enablesVirtualCamera: Bool {
		switch self {
		case .installed: true
		default: false
		}
	}
}
