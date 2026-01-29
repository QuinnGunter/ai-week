//
//  StreamSource.swift
//  CameraExtension
//
//  Copyright © 2022 mmhmm, inc. All rights reserved.
//

import Combine
import CoreMediaIO

import CameraExtensionCommon
import Common

/// A source stream, i.e. a stream that provides sample buffers for capture.
class StreamSource: NSObject {
	private(set) var stream: CMIOExtensionStream?
	private(set) var streamingClients: Set<CMIOExtensionClient> = [] {
		didSet {
			guard streamingClients != oldValue, let stream else {
				return
			}

			addLogEntry("Connected consumers: \(streamingClients.count)")
			stream.notifyPropertiesChanged([Property.streamingClients.property: streamingClientsPropertyState])
		}
	}

	private weak var delegate: StreamSourceDelegate?
	private let streamFormat: CMIOExtensionStreamFormat
	private let configuration: Configuration
	private var log: String = ""
	private var logDequeue = 1
	private var streamingClientsObserver: AnyCancellable?

	/// Creates a source stream and adds the stream to the passed in device.
	init(device: CMIOExtensionDevice, configuration: Configuration, delegate: StreamSourceDelegate) throws {
		self.delegate = delegate
		streamFormat = try configuration.videoStreamFormat
		self.configuration = configuration

		super.init()
		let stream = CMIOExtensionStream(localizedName: configuration.sourceStreamName,
										 streamID: configuration.cameraStreamUUID,
										 direction: .source,
										 clockType: .hostTime,
										 source: self)
		try device.addStream(stream)
		self.stream = stream

		streamingClientsObserver = stream.publisher(for: \.streamingClients).sink { [weak self] (streamingClients: [CMIOExtensionClient]) in
			self?.streamingClients = Set(streamingClients)
		}
	}
}

extension StreamSource: CMIOExtensionStreamSource {
	var formats: [CMIOExtensionStreamFormat] {
		return [streamFormat]
	}

	var availableProperties: Set<CMIOExtensionProperty> {
		return [
			.streamActiveFormatIndex,
			.streamFrameDuration,
			Property.streamingClients.property,
			Property.log.property,
		]
	}

	func streamProperties(forProperties properties: Set<CMIOExtensionProperty>) throws -> CMIOExtensionStreamProperties {
		let streamProperties = CMIOExtensionStreamProperties(dictionary: [:])
		if properties.contains(.streamActiveFormatIndex) {
			streamProperties.activeFormatIndex = 0
		}
		if properties.contains(.streamFrameDuration) {
			streamProperties.frameDuration = configuration.frameDuration
		}
		if properties.contains(Property.streamingClients.property) {
			streamProperties.setPropertyState(streamingClientsPropertyState, forProperty: Property.streamingClients.property)
		}
		if properties.contains(Property.log.property) {
			streamProperties.setPropertyState(CMIOExtensionPropertyState(value: log as NSString), forProperty: Property.log.property)
		}
		return streamProperties
	}

	func setStreamProperties(_ streamProperties: CMIOExtensionStreamProperties) throws {
		if streamProperties.propertiesDictionary[Property.log.property] != nil {
			guard let delegate else { return }
			log = delegate.streamLogger.popLogEntry()
		}
	}

	func authorizedToStartStream(for client: CMIOExtensionClient) -> Bool {
		return true
	}

	func startStream() throws {
		guard let delegate else {
			throw Error.noDelegateToStartStream
		}
		delegate.startStreamingSource()
	}

	func stopStream() throws {
		guard let delegate else {
			throw Error.noDelegateToStopStream
		}
		delegate.stopStreamingSource()
	}

	func addLogEntry(_ message: String) {
		delegate?.streamLogger.pushLogEntry(message, logBehavior: .streamAndSystemConsole)
	}
}

extension StreamSource {
	private var streamingClientsPropertyString: String {
		streamingClients
			.map { String($0.pid) }
			.joined(separator: Property.streamingClientsSeparator)
	}

	private var streamingClientsPropertyState: CMIOExtensionPropertyState<AnyObject> {
		return CMIOExtensionPropertyState(value: streamingClientsPropertyString as NSString)
	}
}

// MARK: - Errors

extension StreamSource {
	enum Error: Int, BaseError {
		case noDelegateToStartStream = 1
		case noDelegateToStopStream
	}
}

extension StreamSource.Error {
	static let domain: String = "CameraExtension.StreamSource"

	var errorMessage: String {
		switch self {
		case .noDelegateToStartStream: "Missing delegate to start stream."
		case .noDelegateToStopStream: "Missing delegate to stop stream."
		}
	}
}
