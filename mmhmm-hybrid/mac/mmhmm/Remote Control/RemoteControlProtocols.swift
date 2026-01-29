//
//  RemoteControlProtocols.swift
//  mmhmm
//
//  Created by Beni Federer on 15.05.25.
//

import Foundation

import Common

/// Base protocol to be implemented by the remote control.
@objc protocol RemoteControllingBase {
	func openSettings()
	func update(with state: RemoteControlState.XPCTransportType)
	func version() async -> String
}

/// Protocol to be implemented by the remote control XPC proxy.
@objc protocol RemoteControllingXPCProtocol: RemoteControllingBase, XPCBaseProtocol {}

/// Protocol to be implemented by the local remote control, if required.
protocol RemoteControlling: RemoteControllingBase {}

/// Base protocol to be implemented by the remotely controlled entity,
/// i.e. the receiver of commands issued by the remote control.
@objc protocol RemoteControlledBase {
	/// Creator: select previous slide
	func previousSlide()

	/// Creator: select next slide
	func nextSlide()

	/// Creator: toggle slide visibility
	func toggleSlideVisible()

	/// Creator: toggle camera enabled
	func toggleCameraEnabled()

	/// Creator: toggle presenter fullscreen
	func togglePresenterFullscreen()

	/// Creator: toggle gestures enabled
	func toggleGesturesEnabled()

	/// Airtime: quit the application
	func quitApp()

	/// Screen Recorder: start/stop screen recording
	func toggleScreenRecorder()

	/// Screen Recorder: start screen recording of the entire screen
	func recordScreen()

	/// Screen Recorder: start window recording
	func recordWindow()
}

/// Protocol to be implemented by the remote receiver XPC proxy.
@objc protocol RemoteControlledXPCProtocol: RemoteControlledBase, XPCBaseProtocol {
	func updatedState() async -> RemoteControlState.XPCTransportType
	func openWebApp(_ webAppType: WebApp.WebAppType.XPCTransportType)
}

/// Protocol to be implemented by the local remote receiver, if required.
protocol RemoteControlled: RemoteControlledBase {
	@MainActor var state: RemoteControlState { get }
	func openWebApp(_ webAppType: WebApp.WebAppType)
}
