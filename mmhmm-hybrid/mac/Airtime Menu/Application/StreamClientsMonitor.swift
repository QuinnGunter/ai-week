//
//  StreamClientsMonitor.swift
//  Airtime Menu
//
//  Created by Beni Federer on 14.05.25.
//

import CoreMediaIO

import CameraExtensionHost
import Common

final class StreamClientsMonitor {
	init?(streamClientsListChangeHandler: @escaping ChangeHandler) {
		self.streamClientsListChangeHandler = streamClientsListChangeHandler

		do {
			try configureStreamClientsListener()
		} catch let error as Error where error == .failedToRetrieveDeviceID {
			Logger.logMessage("Virtual camera extension is not installed: \(error.localizedDescription)", level: .info)
			return nil
		} catch {
			Logger.logError(error, messagePrefix: "Failed to configure stream clients listener.")
			return nil
		}
	}

	typealias ChangeHandler = (Change, StreamClientsMonitor) -> Void

	var streamClientsListChangeHandler: ChangeHandler

	private(set) var streamClients: Set<pid_t> = []

	private var streamClientsListener: StreamingClientsListener?

	private func configureStreamClientsListener() throws {
		guard let deviceID: CMIODeviceID = CMIODeviceID.deviceID(withUUID: VirtualCameraExtension.deviceUUID) else {
			throw Error.failedToRetrieveDeviceID
		}

		guard let sourceStreamID: CMIOStreamID = deviceID.streamID(withName: VirtualCameraExtension.sourceStreamName) else {
			throw Error.failedToRetrieveStreamID
		}

		streamClientsListener = try StreamingClientsListener(streamID: sourceStreamID, queue: .global(qos: .userInteractive)) { [weak self] (pids: [pid_t]) in
			guard let self else { return }

			let oldPIDs: Set<pid_t> = streamClients
			let newPIDs: Set<pid_t> = Set(pids)
			let change: Change = if newPIDs.count > oldPIDs.count {
				.addedClients(newPIDs.subtracting(oldPIDs))
			} else {
				.removedClients(oldPIDs.subtracting(newPIDs))
			}

			self.streamClients = Set(pids)
			self.streamClientsListChangeHandler(change, self)
		}
	}
}

extension StreamClientsMonitor {
	enum Change {
		case addedClients(Set<pid_t>)
		case removedClients(Set<pid_t>)
	}

	enum Error: Int {
		case failedToRetrieveDeviceID
		case failedToRetrieveStreamID
	}
}

extension StreamClientsMonitor.Error: BaseError {
	static let domain: String = String(describing: Self.self)

	var errorMessage: String {
		switch self {
		case .failedToRetrieveDeviceID: "Failed to retrieve device ID."
		case .failedToRetrieveStreamID: "Failed to retrieve stream ID."
		}
	}
}
