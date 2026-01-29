//
//  CMIODeviceID+Extensions.swift
//  CameraExtension
//
//  Created by Beni Federer on 06.02.25.
//

import CoreMediaIO
import Foundation

import CameraExtensionCommon
import Common

extension CMIODeviceID {
	public static func deviceID(withUUID uuid: UUID) -> CMIODeviceID? {
		CMIODeviceID(kCMIOObjectSystemObject)
			.objectIDs(forSelector: CMIOObjectPropertySelector(kCMIOObjectPropertyOwnedObjects))?
			.first { $0.stringProperty(forSelector: CMIOObjectPropertySelector(kCMIODevicePropertyDeviceUID)) == uuid.uuidString }
	}

	/// Repeatedly attempts to retrieve the device ID for a given UUID.
	///
	/// - Parameters:
	///   - deviceUUID: The UUID of the device to retrieve the ID for.
	///   - attempts: The number of attempts to make retrieving the device ID. Defaults to 60.
	///   - interval: The time interval in between attempts. Defaults to 1 second.
	/// - Returns: The device ID.
	/// - Throws: An error describing the failure, e. g.
	///           `DeviceIDRetrievalError.deviceIDUnavailableAfterMultipleAttempts`.
	public static func retrieveDeviceID(withUUID deviceUUID: UUID,
										attempts: Int = 60,
										interval: ContinuousClock.Instant.Duration = .seconds(1))
	async throws -> CMIODeviceID {
		var attemptCount: Int = 0
		while attemptCount < attempts {
			guard let deviceID = CMIODeviceID.deviceID(withUUID: deviceUUID) else {
				attemptCount += 1
				try await Task.sleep(for: interval)
				continue
			}

			return deviceID
		}

		throw DeviceIDRetrievalError.deviceIDUnavailableAfterMultipleAttempts
	}

	public func streamID(withName streamName: String) -> CMIOStreamID? {
		let streamIDs: [CMIOStreamID] = objectIDs(forSelector: CMIOObjectPropertySelector(kCMIODevicePropertyStreams)) ?? []

		return streamIDs.first {
			$0.stringProperty(forSelector: CMIOObjectPropertySelector(kCMIOObjectPropertyName)) == streamName
		}
	}
}

extension CMIODeviceID {
	public enum DeviceIDRetrievalError: Int {
		case deviceIDUnavailableAfterMultipleAttempts
	}
}

extension CMIODeviceID.DeviceIDRetrievalError: BaseError {
	public static let domain: String = String(describing: Self.self)

	public var errorMessage: String {
		switch self {
		case .deviceIDUnavailableAfterMultipleAttempts:
			"Camera extension is unavailable after multiple attempts."
		}
	}
}
