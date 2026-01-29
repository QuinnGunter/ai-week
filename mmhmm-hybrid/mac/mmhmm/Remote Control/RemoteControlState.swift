//
//  RemoteControlState.swift
//  mmhmm
//
//  Created by Beni Federer on 20.05.25.
//

import Foundation

/// The state of the remote control.
///
/// Determines, what the control UI presents.
@objc final class RemoteControlState: NSObject, Codable, Sendable {
	let slideStatus: String?
	let hasPreviousSlide: Bool
	let hasNextSlide: Bool
	let slideVisible: Bool
	let cameraEnabled: Bool
	let presenterFullscreen: Bool
	let gesturesEnabled: Bool
	let isSignedIn: Bool
	let virtualCameraIsAvailable: Bool
	let screenRecorderIsRecording: Bool
	let webApps: [WebApp.WebAppType]

	init(slideStatus: String?,
		 hasPreviousSlide: Bool,
		 hasNextSlide: Bool,
		 slideVisible: Bool,
		 cameraEnabled: Bool,
		 presenterFullscreen: Bool,
		 gesturesEnabled: Bool,
		 isSignedIn: Bool,
		 virtualCameraIsAvailable: Bool,
		 screenRecorderIsRecording: Bool,
		 webApps: [WebApp.WebAppType]) {
		self.slideStatus = slideStatus
		self.hasPreviousSlide = hasPreviousSlide
		self.hasNextSlide = hasNextSlide
		self.slideVisible = slideVisible
		self.cameraEnabled = cameraEnabled
		self.presenterFullscreen = presenterFullscreen
		self.gesturesEnabled = gesturesEnabled
		self.isSignedIn = isSignedIn
		self.virtualCameraIsAvailable = virtualCameraIsAvailable
		self.screenRecorderIsRecording = screenRecorderIsRecording
		self.webApps = webApps
	}
}
