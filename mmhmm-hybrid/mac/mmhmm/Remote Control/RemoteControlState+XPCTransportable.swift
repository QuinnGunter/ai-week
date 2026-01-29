//
//  RemoteControlState+XPCTransportable.swift
//  mmhmm
//
//  Created by Beni Federer on 22.05.25.
//

import Foundation

import Common

extension RemoteControlState: XPCTransportable {
	typealias XPCTransportType = NSData

	convenience init(xpcTransportValue: XPCTransportType) throws {
		let decoded: Self = try JSONDecoder().decode(Self.self, from: xpcTransportValue as Data)
		self.init(
			slideStatus: decoded.slideStatus,
			hasPreviousSlide: decoded.hasPreviousSlide,
			hasNextSlide: decoded.hasNextSlide,
			slideVisible: decoded.slideVisible,
			cameraEnabled: decoded.cameraEnabled,
			presenterFullscreen: decoded.presenterFullscreen,
			gesturesEnabled: decoded.gesturesEnabled,
			isSignedIn: decoded.isSignedIn,
			virtualCameraIsAvailable: decoded.virtualCameraIsAvailable,
			screenRecorderIsRecording: decoded.screenRecorderIsRecording,
			webApps: decoded.webApps
		)
	}

	var xpcTransportValue: XPCTransportType {
		get throws {
			try JSONEncoder().encode(self) as NSData
		}
	}
}
