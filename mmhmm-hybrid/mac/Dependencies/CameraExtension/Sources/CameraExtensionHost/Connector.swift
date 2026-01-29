//
//  Connector.swift
//  CameraExtensionHost
//
//  Created by Matthew Tonkin on 16/10/2023.
//  Copyright © 2023 mmhmm, inc. All rights reserved.
//

import CoreMediaIO
import Foundation

import CameraExtensionCommon
import Common

public protocol ConnectorDelegate: AnyObject {
	/// Called on behalf of a `Connector` when the sample buffer queue of its connection to the camera extension is altered.
	///
	/// The call wraps `CMIODeviceStreamQueueAlteredProc`, which is a routine for a stream to call when it alters its buffer queue.
	/// Input streams invoke it following the insertion of a buffer into the queue, and output streams will invoke it upon removal.
	///
	/// - Parameters:
	///   - stream: The stream whose queue has been altered.
	///   - token: The token which was inserted / removed.
	func queueAltered(stream: CMIOStreamID, token: UnsafeMutableRawPointer?)
}

/// A type that initiates a connection to a CMIODevice and sends sample buffers to it.
public struct Connector {
	private let deviceID: CMIODeviceID
	private let sourceStreamID: CMIOStreamID
	private let sinkStreamID: CMIOStreamID
	private let videoFormatDescription: CMFormatDescription
	private let sinkQueue: CMSimpleQueue
	private let logListener: LogListener?
	private let streamingClientsListener: StreamingClientsListener?

	/// Creates a `Connector` instance.
	///
	/// - Note: A successfully initiated connection retains the instance passed as `delegate`.
	///
	/// - Parameters:
	///   - configuration: The configuration describing the connection to initiate.
	///   - streamingClientsHandler: The handler receiving updates to the stream's streaming clients property.
	///   - messageHandler: The handler receiving the stream's log messages.
	///   - delegate: A delegate receiving updates when the connection's buffer queue was altered.
	public init(configuration: Configuration,
				streamingClientsHandler: StreamingClientsListener.ChangeHandler? = nil,
				messageHandler: LogListener.MessageHandler? = nil,
				delegate: ConnectorDelegate? = nil) throws {
		guard let deviceID = CMIODeviceID.deviceID(withUUID: configuration.deviceUUID) else {
			throw Error.failedGettingDeviceID(uuid: configuration.deviceUUID)
		}
		self.deviceID = deviceID

		guard let sourceStreamID: CMIOStreamID = deviceID.streamID(withName: configuration.sourceStreamName) else {
			throw Error.failedRetrievingSourceStreamID(streamName: configuration.sourceStreamName)
		}
		self.sourceStreamID = sourceStreamID

		guard let sinkStreamID: CMIOStreamID = deviceID.streamID(withName: configuration.sinkStreamName) else {
			throw Error.failedRetrievingSinkStreamID(streamName: configuration.sinkStreamName)
		}
		self.sinkStreamID = sinkStreamID

		videoFormatDescription = configuration.videoFormatDescription
		sinkQueue = try Self.copyBufferQueue(ofStream: sinkStreamID, queueAlteredDelegate: delegate)

		let streamStartResult: OSStatus = CMIODeviceStartStream(deviceID, sinkStreamID)
		guard streamStartResult == noErr else {
			throw Error.failedStartingStream(streamStartResult)
		}

		if let streamingClientsHandler {
			streamingClientsListener = try StreamingClientsListener(streamID: sourceStreamID, streamingClientsHandler: streamingClientsHandler)
		} else {
			streamingClientsListener = nil
		}

		if let messageHandler {
			logListener = try LogListener(streamID: sourceStreamID, messageHandler: messageHandler)
		} else {
			logListener = nil
		}
	}

	public func enqueuePixelBuffer(_ pixelBuffer: CVPixelBuffer) throws {
		var sampleBuffer: CMSampleBuffer?
		var timingInfo = CMSampleTimingInfo()
		timingInfo.presentationTimeStamp = CMClockGetTime(CMClockGetHostTimeClock())

		let sampleBufferResult: OSStatus = CMSampleBufferCreateReadyWithImageBuffer(allocator: kCFAllocatorDefault,
																					imageBuffer: pixelBuffer,
																					formatDescription: videoFormatDescription,
																					sampleTiming: &timingInfo,
																					sampleBufferOut: &sampleBuffer)

		guard sampleBufferResult == noErr, let sampleBuffer else {
			throw Error.failedCreatingImageBuffer(sampleBufferResult)
		}

		try enqueueSampleBuffer(sampleBuffer)
	}
}

extension Connector {
	private static func copyBufferQueue(ofStream streamID: CMIOStreamID, queueAlteredDelegate: ConnectorDelegate? = nil) throws -> CMSimpleQueue {
		let queueAlteredDelegatePointer: UnsafeMutableRawPointer?
		if let queueAlteredDelegate {
			queueAlteredDelegatePointer = UnsafeMutableRawPointer(Unmanaged.passRetained(queueAlteredDelegate as AnyObject).toOpaque())
		} else {
			queueAlteredDelegatePointer = nil
		}

		// A `CMIODeviceStreamQueueAlteredProc` must be registered to copy the buffer queue, regardless if `callbackHandlerPointer` is `nil` or not.
		let queueAlteredProc: CMIODeviceStreamQueueAlteredProc = { (sinkStream: CMIOStreamID, token: UnsafeMutableRawPointer?, queueAlteredDelegatePointer: UnsafeMutableRawPointer?) in
			guard
				let queueAlteredDelegatePointer,
				let queueAlteredDelegate = Unmanaged<AnyObject>.fromOpaque(queueAlteredDelegatePointer).takeUnretainedValue() as? ConnectorDelegate else {
				return
			}

			queueAlteredDelegate.queueAltered(stream: sinkStream, token: token)
		}

		var maybeSimpleQueue: Unmanaged<CMSimpleQueue>?
		let copyQueueResult: OSStatus = CMIOStreamCopyBufferQueue(streamID,
																  queueAlteredProc,
																  queueAlteredDelegatePointer,
																  &maybeSimpleQueue)

		guard copyQueueResult == noErr, let simpleQueue: CMSimpleQueue = maybeSimpleQueue?.takeUnretainedValue() else {
			throw Error.failedCopyBufferQueue(copyQueueResult)
		}

		return simpleQueue
	}

	private func enqueueSampleBuffer(_ sampleBuffer: CMSampleBuffer) throws {
		let pointerRef = UnsafeRawPointer(Unmanaged.passRetained(sampleBuffer).toOpaque())
		try sinkQueue.enqueue(pointerRef)
	}
}

// MARK: - Configuration

extension Connector {
	public struct Configuration {
		/// The UUID by which `CMIODeviceID` API can discover the camera device.
		let deviceUUID: UUID
		/// Stream identifier in reverse domain name notation, used by `CMIODeviceID` API to discover the stream.
		let sourceStreamName: String
		/// Stream identifier in reverse domain name notation, used by `CMIODeviceID` API to discover the stream.
		let sinkStreamName: String
		/// The connection stream's video format.
		let videoFormatDescription: CMFormatDescription
	}
}

extension CameraExtensionCommon.Configuration {
	public var connectorConfiguration: Connector.Configuration {
		get throws {
			let videoFormatDescription: CMFormatDescription = try Self.makeVideoFormatDescription(codecType: codecType.rawValue, dimensions: resolution)
			return Connector.Configuration(deviceUUID: deviceUUID, sourceStreamName: sourceStreamName, sinkStreamName: sinkStreamName, videoFormatDescription: videoFormatDescription)
		}
	}
}

// MARK: - Equatable

extension Connector: Equatable {}

// MARK: - Errors

extension Connector {
	public enum Error: BaseErrorWithAssociatedValues {
		case failedGettingDeviceID(uuid: UUID)
		case failedRetrievingSinkStreamID(streamName: String)
		case failedRetrievingSourceStreamID(streamName: String)
		case failedCreatingImageBuffer(OSStatus)
		case failedStartingStream(OSStatus)
		case failedCopyBufferQueue(OSStatus)
	}
}

extension Connector.Error {
	public static let domain: String = "CameraExtension.Connector"
	public static let allCases: [Connector.Error] = [
		.failedGettingDeviceID(uuid: UUID()),
		.failedRetrievingSinkStreamID(streamName: ""),
		.failedRetrievingSourceStreamID(streamName: ""),
		.failedCreatingImageBuffer(noErr),
		.failedStartingStream(noErr),
		.failedCopyBufferQueue(noErr),
	]

	public var errorMessage: String {
		// Some associated values are omitted from error messages to not leak them through error message presentation in UIs unintentionally.
		switch self {
		case .failedGettingDeviceID: "Cannot find camera."
		case .failedRetrievingSinkStreamID: "Failed retrieving sink stream ID."
		case .failedRetrievingSourceStreamID: "Failed retrieving source stream ID."
		case let .failedCreatingImageBuffer(errorCode): "Failed creating image buffer: \(errorCode)."
		case let .failedStartingStream(errorCode): "Failed starting stream: \(errorCode)."
		case let .failedCopyBufferQueue(errorCode): "Failed copying buffer queue: \(errorCode)."
		}
	}
}
