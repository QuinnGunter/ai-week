//
//  CameraHelper.swift
//  mmhmm
//
//  Created by Matthew Tonkin on 27/10/22.
//

import AppKit
import Combine
import CoreMediaIO

import CameraExtensionCommon
import CameraExtensionHost
import Common

protocol CameraHelperDelegate: AnyObject {
	func streamingClientConnected(_ cameraHelper: CameraHelper, client: StreamingClient, isFirst: Bool)
	func streamingClientDisconnected(_ cameraHelper: CameraHelper, client: StreamingClient, isLast: Bool)
}

class CameraHelper: NSObject {
	private static let throttledMessage: String = LogConstants.bufferRetriesFailed
	private static let throttleInterval: TimeInterval = 60

	private(set) weak var delegate: CameraHelperDelegate?

	let deviceID: CMIODeviceID
	private let sourceStreamID: CMIOStreamID
	private var streamingClientsListener: StreamingClientsListener?
	private var logListener: LogListener?
	private let noBufferLogMessageThrottle: Throttle.StringContainingSubstring

	@Published private(set) var streamingClients: [StreamingClient] = []

	init(deviceID: CMIODeviceID) throws {
		noBufferLogMessageThrottle = Throttle.StringContainingSubstring(throttledValue: Self.throttledMessage, throttleInterval: Self.throttleInterval) {
			$0.0 + " (Throttled: \($0.1))"
		}

		self.deviceID = deviceID

		guard let sourceStreamID: CMIOStreamID = deviceID.streamID(withName: VirtualCameraExtension.sourceStreamName) else {
			throw Connector.Error.failedRetrievingSourceStreamID(streamName: VirtualCameraExtension.sourceStreamName)
		}
		self.sourceStreamID = sourceStreamID

		super.init()
	}

	/// Starts the helper.
	///
	/// This method starts listening for streaming client updates,
	/// notifying the specified delegate of the changes.
	///
	/// - Parameter delegate: The delegate.
	func start(withDelegate delegate: CameraHelperDelegate) throws {
		Logger.logMessage("Starting camera helper.", level: .info)

		streamingClientsListener = try StreamingClientsListener(streamID: sourceStreamID, queue: .main) { [weak self, weak delegate] (pids: [pid_t]) in
			guard let self else { return }

			let oldPIDs: Set<pid_t> = Set(streamingClients.map { $0.pid })
			let newPIDs: Set<pid_t> = Set(pids)

			let removedPIDs: Set<pid_t> = oldPIDs.subtracting(newPIDs)
			let addedPIDs: Set<pid_t> = newPIDs.subtracting(oldPIDs)

			let addedClients: [StreamingClient] = addedPIDs
				.map { StreamingClient(application: NSRunningApplication(processIdentifier: $0), pid: $0) }
			let removedClients: [StreamingClient] = streamingClients
				.filter { removedPIDs.contains($0.pid) }
			let filteredStreamingClients: [StreamingClient] = streamingClients
				.filter { removedPIDs.contains($0.pid) == false }

			streamingClients = addedClients + filteredStreamingClients

			guard let delegate else { return }

			notify(delegate: delegate, ofAddedStreamingClients: addedClients, signalFirst: oldPIDs.isEmpty)
			notify(delegate: delegate, ofRemovedStreamingClients: removedClients, signalLast: newPIDs.isEmpty)
		}

		logListener = try LogListener(streamID: sourceStreamID) { [weak self] in
			guard let self, let throttledLogMessage: String = noBufferLogMessageThrottle.add(value: $0) else {
				return
			}
			// This prefix would need to be removed in the camera extension itself,
			// which is harder to get changed due to the extension's heavily reduced update cycle.
			Logger.logMessage(throttledLogMessage, level: .info, location: "CameraExtension")
		}

		self.delegate = delegate
	}

	/// Synchronously stops the helper.
	///
	/// This method stops listening for streaming clients updates,
	/// removes all current clients and notifies the delegate.
	func stop() {
		Logger.logMessage("Stopping camera helper.", level: .info)

		defer {
			streamingClients = []
			delegate = nil
			logListener = nil
		}

		// Ensure no streaming clients are added after stopping
		streamingClientsListener = nil

		guard let delegate else {
			assertionFailure("Delegate must remain available until stopping the camera helper.")
			return
		}

		notify(delegate: delegate, ofRemovedStreamingClients: streamingClients, signalLast: true)
	}

	/// Notifies the delegate about removed streaming clients.
	///
	/// The delegate should use this opportunity to update analytics and the MALK virtual camera feed.
	private func notify(delegate: CameraHelperDelegate, ofRemovedStreamingClients clients: [StreamingClient], signalLast: Bool) {
		clients.forEach { (client: StreamingClient) in
			delegate.streamingClientDisconnected(self, client: client, isLast: signalLast)
		}
	}

	/// Notifies the delegate about added streaming clients.
	///
	/// The delegate should use this opportunity to update analytics and the MALK virtual camera feed.
	private func notify(delegate: CameraHelperDelegate, ofAddedStreamingClients clients: [StreamingClient], signalFirst: Bool) {
		clients.forEach { (client: StreamingClient) in
			delegate.streamingClientConnected(self, client: client, isFirst: signalFirst)
		}
	}
}

// MARK: - Convenience Accessors

extension CameraHelper {
	var uid: String? {
		return deviceID.stringProperty(forSelector: CMIOObjectPropertySelector(kCMIODevicePropertyDeviceUID))
	}

	var name: String? {
		return deviceID.stringProperty(forSelector: CMIOObjectPropertySelector(kCMIOObjectPropertyName))
	}

	var model: String? {
		return deviceID.stringProperty(forSelector: CMIOObjectPropertySelector(kCMIODevicePropertyModelUID))
	}
}

extension CameraHelper {
	enum Error: Int, BaseError {
		case extensionNotFound
	}
}

extension CameraHelper.Error {
	static let domain: String = String(describing: Self.self)
	var errorMessage: String {
		switch self {
		case .extensionNotFound: String(localized: "Camera extension not found.", comment: "Camera extension not found.")
		}
	}
}

extension CameraHelper {
	@MainActor
	static func applicationTitles(forStreamingClients streamingClients: [StreamingClient]) -> Set<String> {
		Set(streamingClients.map { streamingClient in
			guard let application: NSRunningApplication = streamingClient.application, let localizedName = application.localizedName else {
				do {
					return try streamingClient.pid.processName
				} catch {
					logErrorMessage("Failed retrieving streaming client app name: \(error)", forUnresolvedStreamingClient: streamingClient)
				}

				return "An application"
			}
			return localizedName
		})
	}

	@MainActor
	private static var unresolvedStreamingClients = [StreamingClient]()

	@MainActor
	private static func logErrorMessage(_ message: String, forUnresolvedStreamingClient client: StreamingClient) {
		let clientIsKnown: Bool = unresolvedStreamingClients.contains(where: {
			// swiftformat:disable indent
			$0.pid == client.pid ||
			$0.application?.bundleIdentifier == client.application?.bundleIdentifier
			// swiftformat:enable indent
		})
		guard !clientIsKnown else { return }

		unresolvedStreamingClients.append(client)
		let enrichedMessage: String = message + ", Bundle ID: \(client.application?.bundleIdentifier ?? "nil"), Bundle URL: \(client.application?.bundleURL?.absoluteString ?? "nil"), Process ID: \(client.pid)"
		Logger.logMessage(enrichedMessage, level: .error)
	}
}
