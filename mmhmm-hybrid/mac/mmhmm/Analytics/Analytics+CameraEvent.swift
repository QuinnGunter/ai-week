//
//  Analytics+CameraEvent.swift
//  mmhmm
//
//  Created by Beni Federer on 25.09.24.
//

import Mixpanel

extension Analytics {
	enum CameraEvent {
		case disconnected(withInfo: DisconnectInfo)
		case connected(withInfo: ConnectInfo)
	}

	nonisolated func logCameraEvent(_ event: CameraEvent) {
		Task { await isolatedLogCameraEvent(event) }
	}
}

extension Analytics {
	private func isolatedLogCameraEvent(_ event: CameraEvent) async {
		switch event {
		case let .disconnected(info as AnalyticsInfo), let .connected(info as AnalyticsInfo):
			await isolatedLogEvent(event.name, properties: info.mixpanelProperties)
		}
	}
}

extension Analytics.CameraEvent {
	struct ConnectInfo {
		let clientBundleID: String
		let sessionID: UUID
	}

	struct DisconnectInfo {
		let clientBundleID: String
		let sessionID: UUID
		let duration: TimeInterval
	}
}

extension Analytics.CameraEvent {
	fileprivate var name: String {
		switch self {
		case .disconnected: "camera.app.disconnected"
		case .connected: "camera.app.connected"
		}
	}
}

protocol AnalyticsInfo {
	var mixpanelProperties: [String: MixpanelType] { get }
}

extension Analytics.CameraEvent.DisconnectInfo: AnalyticsInfo {
	var mixpanelProperties: [String: MixpanelType] {
		[
			"bundle_id": clientBundleID,
			"session_id": sessionID.uuidString,
			"duration": duration,
		]
	}
}

extension Analytics.CameraEvent.ConnectInfo: AnalyticsInfo {
	var mixpanelProperties: [String: MixpanelType] {
		[
			"bundle_id": clientBundleID,
			"session_id": sessionID.uuidString,
		]
	}
}
