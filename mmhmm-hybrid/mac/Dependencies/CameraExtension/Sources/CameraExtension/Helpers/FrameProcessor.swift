//
//  FrameProcessor.swift
//  CameraExtension
//
//  Created by Jakub Gluszkiewicz on 24/10/2023.
//  Made glorious by Beni Federer on 27/10/2023.
//

import CoreMediaIO

import CameraExtensionCommon
import Common

/// Serves as a frame buffer pump between a sink stream (producer) and a source stream (consumer),
/// that introduces a small delay to smooth out unsteady frame rates of the sink.
class FrameProcessor {
	private static let supportedFrameRateRange: ClosedRange<Int> = 15...60
	private static let targetDelayInFrames: Int = 1
	private static let frameBufferQueueSize: Int = targetDelayInFrames + 1
	private static let unavailableFrameLoggingThreshold: Int = 10
	private static let repeatingUnavailableFrameLoggingThreshold: Int = 100

	private let sendingQueue = DispatchQueue(label: "app.mmhmm.cameraExtension.frameProcessor.sending", qos: .userInteractive)
	private let consumingQueue = DispatchQueue(label: "app.mmhmm.cameraExtension.frameProcessor.consumption", qos: .userInteractive)
	private let sendingTimer: DispatchSourceTimer
	private let consumingTimer: DispatchSourceTimer
	private let sourceStream: StreamSource
	private let sinkStream: StreamSink
	private let client: CMIOExtensionClient
	private let group = DispatchGroup()

	private var unavailableFrameCounter: Int = 0
	private var frameBuffers: BoundedSafeQueue<CMSampleBuffer>

	init(sourceStream: StreamSource, sinkStream: StreamSink, streamingClient: CMIOExtensionClient, frameRate: Int) throws {
		guard Self.supportedFrameRateRange.contains(frameRate) else {
			throw Error.unsupportedFrameRate
		}

		client = streamingClient
		self.sourceStream = sourceStream
		self.sinkStream = sinkStream

		frameBuffers = try BoundedSafeQueue(capacity: Self.frameBufferQueueSize, policy: .newest)
		sendingTimer = DispatchSource.makeTimerSource(flags: .strict, queue: sendingQueue)
		consumingTimer = DispatchSource.makeTimerSource(flags: .strict, queue: consumingQueue)

		let frameDuration: TimeInterval = 1.0 / Double(frameRate)
		sendingTimer.schedule(deadline: .now(), repeating: frameDuration, leeway: .seconds(0))
		consumingTimer.schedule(deadline: .now(), repeating: frameDuration, leeway: .seconds(0))

		sendingTimer.setEventHandler(qos: .userInteractive, handler: consumeFrameFromSource)
		sendingTimer.resume()

		consumingTimer.setEventHandler(qos: .userInteractive, handler: sendFrameToSink)
		consumingTimer.resume()
	}

	private func consumeFrameFromSource() {
		group.enter()
		defer { group.leave() }

		sinkStream.stream?.consumeSampleBuffer(from: client) { [weak self] sampleBuffer, _, _, _, error in
			guard let self else { return }
			guard let sampleBuffer else {
				sourceStream.addLogEntry("Failed consuming sample buffer, because it was nil.")
				return
			}
			guard error == nil else {
				sourceStream.addLogEntry("Error consuming sample buffer: \(error.unsafelyUnwrapped.localizedDescription)")
				return
			}

			do {
				try frameBuffers.enqueue(sampleBuffer)
			} catch BoundedSafeQueue<CMSampleBuffer>.Error.queueIsFull {
				sourceStream.addLogEntry("Dropped sample buffer.")
			} catch {
				sourceStream.addLogEntry("Failed consuming sample buffer: \(error.localizedDescription)")
			}
		}
	}

	private func sendFrameToSink() {
		group.enter()
		defer { group.leave() }

		// Dequeue a frame if the target delay is met. This introduces an intentional delay to guarantee a steady output stream.
		guard let frame = frameBuffers.dequeue(countPredicate: { $0 > Self.targetDelayInFrames }) else {
			unavailableFrameCounter += 1

			if unavailableFrameCounter <= Self.unavailableFrameLoggingThreshold || unavailableFrameCounter % Self.repeatingUnavailableFrameLoggingThreshold == 0 {
				sourceStream.addLogEntry("Failed dequeueing sample buffer, attempt #\(unavailableFrameCounter)")
			}

			return
		}

		// `clock_gettime_nsec_np(CLOCK_UPTIME_RAW)` is the preferred version of `mach_absolute_time()`.
		let nowInNanoseconds: UInt64 = clock_gettime_nsec_np(CLOCK_UPTIME_RAW)
		sourceStream.stream?.send(frame, discontinuity: [], hostTimeInNanoseconds: nowInNanoseconds)

		unavailableFrameCounter = 0
	}

	func stop() {
		consumingTimer.cancel()
		sendingTimer.cancel()
		if group.wait(timeout: .now() + .seconds(1)) == .success {
			sourceStream.addLogEntry("Finished consuming and sending frames.")
		} else {
			sourceStream.addLogEntry("Failed stopping consuming and sending frames, finishing nonetheless.")
		}
	}
}

// MARK: - Errors

extension FrameProcessor {
	enum Error: Int, BaseError {
		case unsupportedFrameRate = 1
	}
}

extension FrameProcessor.Error {
	static let domain: String = "CameraExtension.FrameProcessor"

	var errorMessage: String {
		switch self {
		case .unsupportedFrameRate: "Frame rate is unsupported."
		}
	}
}
