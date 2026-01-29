//
//  DeviceManager+CameraHelperDelegate.swift
//  mmhmm
//
//  Created by Beni Federer on 10.06.24.
//

import Foundation

import CameraExtensionHost

extension DeviceManager: CameraHelperDelegate {
	nonisolated func streamingClientConnected(_ cameraHelper: CameraHelper, client: StreamingClient, isFirst: Bool) {
		Logger.logMessage("\(client.details.appName) connected as \(isFirst ? "first" : "a") virtual camera client.", level: .info)

		let streamingClients: [StreamingClient] = cameraHelper.streamingClients

		Task { @MainActor in
			cameraExtensionStateProvider.state = .installed(streamClients: streamingClients)
		}

		Task {
			await notifyDelegateOfConnectedClient(client, isFirst: isFirst)
			await updateHybridWithVirtualCamera()
		}
	}

	nonisolated func streamingClientDisconnected(_ cameraHelper: CameraHelper, client: StreamingClient, isLast: Bool) {
		Logger.logMessage("\(client.details.appName) disconnected\(isLast ? " as the last virtual camera client" : "").", level: .info)

		let streamingClients: [StreamingClient] = cameraHelper.streamingClients

		Task { @MainActor in
			cameraExtensionStateProvider.state = .installed(streamClients: streamingClients)
		}

		Task {
			await notifyDelegateOfDisconnectedClient(client, isLast: isLast)
			await updateHybridWithVirtualCamera()
		}
	}
}

extension DeviceManager {
	private func notifyDelegateOfConnectedClient(_ client: StreamingClient, isFirst: Bool) {
		guard virtualCameraProducerStarted else { return }
		Task { @MainActor in
			delegate?.streamingClientConnected(client, isFirst: isFirst)
		}
	}

	private func notifyDelegateOfDisconnectedClient(_ client: StreamingClient, isLast: Bool) {
		guard virtualCameraProducerStarted else { return }
		Task { @MainActor in
			delegate?.streamingClientDisconnected(client, isLast: isLast)
		}
	}

	/// Sends a virtual camera disconnect event to the web app.
	///
	/// Call this method to initially disable the virtual camera feed
	/// in the web app once the hybrid bridge has been initialized.
	///
	/// The web app starts with the virtual camera enabled for backwards
	/// compatibility reasons. It needs to be explicitly told to disable
	/// the virtual camera on startup, if no clients are connected.
	///
	/// The disconnect event is not sent, if stream clients are
	/// currently connected to the camera system extension. In
	/// other words, the disconnect event is only sent, if one of
	/// the following conditions is true.
	/// * The camera extension has no stream clients.
	/// * The camera helper indicating the availability of the
	/// camera extension on the system does not exist.
	private func sendCameraDisconnectEvent() {
		guard cameraHelper?.streamingClients.isEmpty ?? true else { return }

		Logger.logMessage("Sending virtual camera disconnect event to web app.", level: .info)

		do {
			let client = StreamingClient(application: .current, pid: ProcessInfo().processIdentifier)
			let streamingClientDetailsJsonString: String = try client.details.jsonString
			let ipcMessage = StringInterprocessMessage(type: "camera_app_disconnected", stringValue: streamingClientDetailsJsonString, isFlagged: true, sendAnalytics: false)
			InterprocessMessenger.shared.send(ipcMessage)
		} catch {
			Logger.logError(error, messagePrefix: "Failed to send initial disconnect event to web app", level: .fault)
		}
	}

	/// Notifies the delegate about connected stream clients, which in turn
	/// updates the web app and analytics backend.
	///
	/// Call this when a virtual camera producer web app, like Malk apps, have started.
	func startVirtualCameraProducer() {
		guard virtualCameraProducerStarted == false else {
			Logger.logMessage("Virtual camera producer already started, skipping.", level: .info)
			return
		}

		if let cameraHelper, cameraHelper.streamingClients.isEmpty == false {
			cameraHelper.streamingClients.enumerated().forEach { index, client in
				// Indicating first client starts the virtual camera stream in Malk apps.
				let isFirst: Bool = index == 0
				Task { @MainActor in
					delegate?.streamingClientConnected(client, isFirst: isFirst)
				}
			}
		} else {
			// Malk apps initially enable the camera, which must be stopped, if no clients exist.
			sendCameraDisconnectEvent()
		}

		virtualCameraProducerStarted = true
	}

	/// Notifies the delegate about disconnected stream clients, which in turn
	/// updates the web app and analytics backend.
	///
	/// Call this when a virtual camera producer web app, like Malk apps, have stopped.
	func stopVirtualCameraProducer() {
		guard virtualCameraProducerStarted else {
			Logger.logMessage("Virtual camera producer is not running, skipping.", level: .info)
			return
		}

		if let cameraHelper {
			cameraHelper.streamingClients.enumerated().forEach { index, client in
				// Indicating last client stops the virtual camera stream in Malk apps.
				let isLast: Bool = index == cameraHelper.streamingClients.count - 1
				Task { @MainActor in
					delegate?.streamingClientDisconnected(client, isLast: isLast)
				}
			}
		}

		virtualCameraProducerStarted = false
	}
}
