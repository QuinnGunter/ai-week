//
//  StreamSink.swift
//  CameraExtension
//
//  Copyright © 2022 mmhmm, inc. All rights reserved.
//

import CoreMediaIO

import CameraExtensionCommon
import Common

/// A sink stream, i.e. a stream that consumes sample buffers for playback.
class StreamSink: NSObject {
//	let device: CMIOExtensionDevice
	private(set) var stream: CMIOExtensionStream?

	private weak var delegate: StreamSinkDelegate?
	private let streamFormat: CMIOExtensionStreamFormat
	private let configuration: Configuration
	private var client: CMIOExtensionClient?

	/// Creates a sink stream and adds the stream to the passed in device.
	init(device: CMIOExtensionDevice, configuration: Configuration, delegate: StreamSinkDelegate) throws {
		self.delegate = delegate
		streamFormat = try configuration.videoStreamFormat
		self.configuration = configuration

		super.init()

		let stream = CMIOExtensionStream(localizedName: configuration.sinkStreamName,
										 streamID: configuration.sinkStreamUUID,
										 direction: .sink,
										 clockType: .hostTime,
										 source: self)
		try device.addStream(stream)
		self.stream = stream
	}
}

extension StreamSink: CMIOExtensionStreamSource {
	var formats: [CMIOExtensionStreamFormat] {
		return [streamFormat]
	}

	var availableProperties: Set<CMIOExtensionProperty> {
		return [
			.streamActiveFormatIndex,
			.streamFrameDuration,
			.streamSinkBufferQueueSize,
			.streamSinkBuffersRequiredForStartup,
			.streamSinkBufferUnderrunCount, // ???: Not available in getter, docs say the "system updates this value", maybe get rid of it?
			.streamSinkEndOfData, // ???: Not available in getter, maybe get rid of it?
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
		if properties.contains(.streamSinkBufferQueueSize) {
			streamProperties.sinkBufferQueueSize = 1
		}
		if properties.contains(.streamSinkBuffersRequiredForStartup) {
			streamProperties.sinkBuffersRequiredForStartup = 1
		}
		return streamProperties
	}

	func setStreamProperties(_ streamProperties: CMIOExtensionStreamProperties) throws {}

	func authorizedToStartStream(for client: CMIOExtensionClient) -> Bool {
		self.client = client
		return true
	}

	func startStream() throws {
		guard let delegate else {
			throw Error.noDelegateToStartStream
		}
		guard let client else {
			throw Error.noClientToStartStream
		}
		delegate.startStreamingSink(client: client)
	}

	func stopStream() throws {
		guard let delegate else {
			throw Error.noDelegateToStopStream
		}
		delegate.stopStreamingSink()
	}
}

// MARK: - Errors

extension StreamSink {
	enum Error: Int, BaseError {
		case noDelegateToStartStream = 1
		case noDelegateToStopStream
		case noClientToStartStream
	}
}

extension StreamSink.Error {
	static let domain: String = "CameraExtension.StreamSink"

	var errorMessage: String {
		switch self {
		case .noDelegateToStartStream: "Missing delegate to start stream."
		case .noDelegateToStopStream: "Missing delegate to stop stream."
		case .noClientToStartStream: "No client to start a stream for."
		}
	}
}
