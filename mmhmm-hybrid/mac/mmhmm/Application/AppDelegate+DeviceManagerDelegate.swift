//
//  AppDelegate+DeviceManagerDelegate.swift
//  mmhmm
//
//  Created by Beni Federer on 23.10.25.
//

import CameraExtensionHost

extension AppDelegate: DeviceManagerDelegate {
	func deviceManagerRequestsRelaunch(_ deviceManager: DeviceManager) {
		showRelaunchRequestAlertConditionally()
	}

	func deviceManagerRequestsReboot(_ deviceManager: DeviceManager) {
		showRebootRequestAlert()
	}

	func streamingClientConnected(_ client: StreamingClient, isFirst: Bool) {
		do {
			let streamingClientDetailsJsonString: String = try client.details.jsonString
			let ipcMessage = StringInterprocessMessage(type: "camera_app_connected", stringValue: streamingClientDetailsJsonString, isFlagged: isFirst, sendAnalytics: false)
			InterprocessMessenger.shared.send(ipcMessage)
		} catch {
			Logger.logError(error, messagePrefix: "Failed to send connected event to web app", level: .fault)
		}

		let event = Analytics.CameraEvent(withConnectedClient: client)
		Analytics.shared.logCameraEvent(event)
	}

	func streamingClientDisconnected(_ client: StreamingClient, isLast: Bool) {
		do {
			let streamingClientDetailsJsonString: String = try client.details.jsonString
			let ipcMessage = StringInterprocessMessage(type: "camera_app_disconnected", stringValue: streamingClientDetailsJsonString, isFlagged: isLast, sendAnalytics: false)
			InterprocessMessenger.shared.send(ipcMessage)

			let event = Analytics.CameraEvent(withDisconnectedClient: client)
			Analytics.shared.logCameraEvent(event)
		} catch {
			Logger.logError(error, messagePrefix: "Failed to send disconnected event to web app", level: .fault)
		}
	}
}

extension Analytics.CameraEvent {
	fileprivate init(withConnectedClient client: StreamingClient) {
		let bundleID: String = if client.details.appID.isEmpty {
			StreamClient.applicationTitle(forProcessName: client.details.appName)
		} else {
			client.details.appID
		}
		let info = ConnectInfo(clientBundleID: bundleID, sessionID: client.sessionID)
		self = .connected(withInfo: info)
	}

	fileprivate init(withDisconnectedClient client: StreamingClient) {
		let duration: TimeInterval = -client.connectionDate.timeIntervalSinceNow
		let bundleID: String = if client.details.appID.isEmpty {
			StreamClient.applicationTitle(forProcessName: client.details.appName)
		} else {
			client.details.appID
		}
		let info = DisconnectInfo(clientBundleID: bundleID, sessionID: client.sessionID, duration: duration)
		self = .disconnected(withInfo: info)
	}
}
