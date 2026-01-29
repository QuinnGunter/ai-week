//
//  DeviceSource.swift
//  CameraExtension
//
//  Copyright © 2022 mmhmm, inc. All rights reserved.
//

import CoreMediaIO
import IOKit.audio
import os.log

import CameraExtensionCommon
import Common

class DeviceSource: NSObject {
	/// How many times the camera tries to pull frame buffers within one frame interval until it gives up.
	private static let pullRetryCountMax: Int = 5
	/// The landing page is always streamed in an RGB format to make it work consistently on ARM and Intel platforms.
	/// Conversion is automatically performed by CMIO, if the camera extension publishes a different streaming format.
	private static let landingPageCodec: OSType = kCVPixelFormatType_32BGRA

	let configuration: Configuration
	let streamLogger: StreamLogger
	private(set) var device: CMIOExtensionDevice?

	var streamSource: StreamSource?
	var streamSink: StreamSink?

	private let timerQueue = DispatchQueue(label: "app.mmhmm.cameraExtension.device.source.timer", qos: .userInteractive)
	private let syncQueue = DispatchQueue(label: "app.mmhmm.cameraExtension.device.source.sync", qos: .userInteractive)
	private var landingPageBuffer: CVPixelBuffer
	private let videoDescription: CMFormatDescription
	private let landingPageVideoDescription: CMFormatDescription
	private var timer: DispatchSourceTimer?
	private var streamingCounter: UInt32 = 0
	private var client: CMIOExtensionClient?
	private var isRunning: Bool = false
	private var waitedForFirstFrame: Bool = false

	init(configuration: Configuration, logger: Logger) throws {
		self.configuration = configuration
		let throttle = Throttle.FilteredValue<String>(throttledValue: LogConstants.bufferRetriesFailed, throttleInterval: 60.0) { "\($0.0) (throttled: \($0.1))" }
		streamLogger = try StreamLogger(messagePrefix: configuration.logMessagePrefix, throttle: throttle, logger: logger)
		videoDescription = try configuration.videoDescription

		streamLogger.pushLogEntry("Buffer pool created.")

		landingPageBuffer = try Self.initializeLandingPageBuffer(configuration: configuration, pixelFormat: Self.landingPageCodec)
		landingPageVideoDescription = try type(of: configuration).makeVideoFormatDescription(codecType: Self.landingPageCodec, dimensions: configuration.resolution)

		streamLogger.pushLogEntry("Landing page initialized.")

		super.init()

		let device = CMIOExtensionDevice(localizedName: configuration.name,
										 deviceID: configuration.deviceUUID,
										 legacyDeviceID: configuration.deviceUUID.uuidString,
										 source: self)

		streamLogger.pushLogEntry("Device \(configuration.name) created.")

		let streamSource = try StreamSource(device: device, configuration: configuration, delegate: self)
		streamSink = try StreamSink(device: device, configuration: configuration, delegate: self)

		streamLogger.pushLogEntry("Stream source and stream sink initialized and added to device.")

		self.streamSource = streamSource
		self.device = device

		let streamLoggerMode = try streamLoggerMode(streamSource: streamSource)
		try streamLogger.start(mode: streamLoggerMode)

		streamLogger.pushLogEntry("Log delivery started.")
		streamLogger.pushLogEntry("Device source successfully initialized.")
	}
}

extension DeviceSource: StreamSourceDelegate {
	/// Starts a source stream from the camera extension to a stream consumer.
	func startStreamingSource() {
		syncQueue.sync {
			updateTimer(withStateChange: .consumerConnecting)
		}
	}

	/// Stops a source stream from the camera extension to a stream consumer.
	func stopStreamingSource() {
		syncQueue.sync {
			updateTimer(withStateChange: .consumerDisconnecting)
		}
	}
}

extension DeviceSource: StreamSinkDelegate {
	/// Starts a sink stream from the producer to the camera extension.
	func startStreamingSink(client: CMIOExtensionClient) {
		syncQueue.sync {
			updateTimer(withStateChange: .producerConnecting(client: client))
		}
	}

	/// Stops a sink stream from the producer to the camera extension.
	func stopStreamingSink() {
		syncQueue.sync {
			updateTimer(withStateChange: .producerDisconnecting)
		}
	}
}

extension DeviceSource: CMIOExtensionDeviceSource {
	var availableProperties: Set<CMIOExtensionProperty> {
		return [.deviceTransportType, .deviceModel]
	}

	func deviceProperties(forProperties properties: Set<CMIOExtensionProperty>) throws -> CMIOExtensionDeviceProperties {
		let deviceProperties = CMIOExtensionDeviceProperties(dictionary: [:])
		if properties.contains(.deviceTransportType) {
			deviceProperties.transportType = kIOAudioDeviceTransportTypeVirtual
		}
		if properties.contains(.deviceModel) {
			deviceProperties.model = configuration.model
		}
		return deviceProperties
	}

	func setDeviceProperties(_ deviceProperties: CMIOExtensionDeviceProperties) throws {}
}

extension DeviceSource {
	private static func initializeLandingPageBuffer(configuration: Configuration, pixelFormat: OSType) throws -> CVPixelBuffer {
		let extensionBundle = Bundle(for: self)

		// Load the image
		guard let imageURL = extensionBundle.url(forResource: configuration.landingPageAssetName, withExtension: configuration.landingPageAssetExtension) else {
			throw Error.landingPageAssetNotFound
		}

		guard
			let imageSource = CGImageSourceCreateWithURL(imageURL as CFURL, nil),
			var cgImage = CGImageSourceCreateImageAtIndex(imageSource, 0, nil)
		else {
			throw Error.imageLoadingFailed
		}

		// Resize the image if necessary
		if let resizedImage: CGImage = try? cgImage.resized(toSize: configuration.resolution.cgSize) {
			cgImage = resizedImage
		}

		// Create a pixel buffer
		let bufferWidth = Int(configuration.resolution.width)
		let bufferHeight = Int(configuration.resolution.height)
		let pixelBufferAttributes = [kCVPixelBufferIOSurfacePropertiesKey: [:]] as CFDictionary
		var landingPageBuffer: CVPixelBuffer?

		let error: CVReturn = CVPixelBufferCreate(kCFAllocatorDefault, bufferWidth, bufferHeight, pixelFormat, pixelBufferAttributes, &landingPageBuffer)
		guard error == kCVReturnSuccess, let landingPageBuffer else {
			throw Error.acquiringPixelBufferFailed(error)
		}

		// Draw the image into the pixel buffer
		CVPixelBufferLockBaseAddress(landingPageBuffer, [])

		let pixelData: UnsafeMutableRawPointer? = CVPixelBufferGetBaseAddress(landingPageBuffer)
		guard let context = CGContext(data: pixelData,
									  width: bufferWidth,
									  height: bufferHeight,
									  bitsPerComponent: 8,
									  bytesPerRow: CVPixelBufferGetBytesPerRow(landingPageBuffer),
									  space: CGColorSpaceCreateDeviceRGB(),
									  bitmapInfo: CGImageAlphaInfo.noneSkipFirst.rawValue | CGBitmapInfo.byteOrder32Little.rawValue)
		else {
			throw Error.acquiringGraphicsContextFailed
		}

		context.draw(cgImage, in: CGRect(x: 0, y: 0, width: bufferWidth, height: bufferHeight))

		CVPixelBufferUnlockBaseAddress(landingPageBuffer, [])

		return landingPageBuffer
	}

	private func streamLoggerMode(streamSource: StreamSource) throws -> StreamLogger.Mode {
		guard let stream: CMIOExtensionStream = streamSource.stream else {
			throw Error.streamUnexpectedlyNil
		}

		let streamLoggerMode: StreamLogger.Mode

		switch configuration.logCollectionMode {
		case .push:
			streamLoggerMode = .push(stream: stream)
		case .pull:
			streamLoggerMode = .pull
		}

		return streamLoggerMode
	}

	private enum StateChange {
		case consumerConnecting
		case consumerDisconnecting
		case producerConnecting(client: CMIOExtensionClient)
		case producerDisconnecting
	}

	/// Updates the timer depending on the passed in state.
	///
	/// - Important: Must be called on `syncQueue`.
	///
	/// - Parameter stateChange: An enum case describing the current state change.
	private func updateTimer(withStateChange stateChange: StateChange) {
		dispatchPrecondition(condition: .onQueue(syncQueue))

		switch stateChange {
		case .consumerConnecting:
			streamingCounter += 1
			if streamingCounter == 1 {
				// First consumer, a stream must be started.
				timer?.cancel()
				switch client {
				case .none:
					// No producer, stream the landing page.
					timer = makeScheduledLandingPageTimer()
				case .some:
					// Stream the producer.
					timer = makeScheduledPullPushTimer()
				}
				timer?.resume()
			}
		case .consumerDisconnecting:
			streamingCounter -= 1
			if streamingCounter <= 0 {
				// No consumer, all streams can be stopped.
				timer?.cancel()
				timer = nil

				// Just in case CMIO lets stops underrun.
				streamingCounter = 0
			}
		case let .producerConnecting(client):
			self.client = client
			if streamingCounter > 0 {
				// Consumers are connected, stream the producer.
				timer?.cancel()
				timer = makeScheduledPullPushTimer()
				timer?.resume()
			}
		case .producerDisconnecting:
			// Producer disconnected, stop streaming the producer.
			timer?.cancel()
			if streamingCounter > 0 {
				// Consumers are connected, stream the landing page
				timer = makeScheduledLandingPageTimer()
				timer?.resume()
			}
			client = nil
		}

		streamLogger.pushLogEntry("Updated state: connected consumers: \(streamingCounter), producer: \(client == nil ? "0" : "1"), stream: \(timer == nil ? "inactive" : "active")")
	}

	/// Creates a timer than is scheduled to send the landing page at a low interval.
	///
	/// - Returns: A timer which, once resumed, pushes the landing page every `1/idleFrameRate` seconds to consumers.
	private func makeScheduledLandingPageTimer() -> DispatchSourceTimer {
		let frameInterval: TimeInterval = 1.0 / Double(configuration.idleFrameRate)

		let timer = DispatchSource.makeTimerSource(flags: .strict, queue: timerQueue)
		timer.schedule(deadline: .now(), repeating: frameInterval, leeway: .seconds(0))
		timer.setEventHandler { [weak self] in
			guard let self, let streamSourceStream = streamSource?.stream else {
				return
			}

			var sampleBuffer: CMSampleBuffer?
			var timingInfo = CMSampleTimingInfo(duration: .zero,
												presentationTimeStamp: CMClock.hostTimeClock.time,
												decodeTimeStamp: .zero)
			let imageBufferError: OSStatus = CMSampleBufferCreateForImageBuffer(allocator: kCFAllocatorDefault,
																				imageBuffer: landingPageBuffer,
																				dataReady: true,
																				makeDataReadyCallback: nil,
																				refcon: nil,
																				formatDescription: landingPageVideoDescription,
																				sampleTiming: &timingInfo,
																				sampleBufferOut: &sampleBuffer)
			if imageBufferError == noErr, let sampleBuffer {
				// `clock_gettime_nsec_np(CLOCK_UPTIME_RAW)` is the preferred version of `mach_absolute_time()`.
				let nowInNanoseconds: UInt64 = clock_gettime_nsec_np(CLOCK_UPTIME_RAW)
				streamSourceStream.send(sampleBuffer, discontinuity: [], hostTimeInNanoseconds: nowInNanoseconds)
			} else {
				streamLogger.pushLogEntry("Error creating sample buffer \(imageBufferError)")
			}
		}

		return timer
	}

	/// Creates a timer than is scheduled to pull frames from the producer and push them to consumers at frame rate.
	///
	/// - Returns: A timer which, once resumed, pulls and pushes one frame every `1/frameRate` seconds to consumers.
	private func makeScheduledPullPushTimer() -> DispatchSourceTimer {
		// Reset this flag whenever a new stream from the producer gets started.
		waitedForFirstFrame = false

		let frameInterval: TimeInterval = 1.0 / Double(configuration.frameRate)

		// Retry only within the first half of a frame interval to avoid eating into the next frame interval due to lag on behalf of the dispatch scheduler.
		// Otherwise, retries that are scheduled late might pull the frame buffer intended for the next regular pull cycle, which causes that cycle to trigger
		// a new cascade of retries and so on. While this might help with reducing sub-frame interval lag to a minimum, it would put additional strain on the
		// dispatch scheduler, which eventually might lead to degraded overall performance due to contention around stream pulling.
		let retryInterval: TimeInterval = frameInterval * 0.5 / Double(Self.pullRetryCountMax)

		let timer = DispatchSource.makeTimerSource(flags: .strict, queue: timerQueue)
		timer.schedule(deadline: .now(), repeating: frameInterval, leeway: .seconds(0))
		timer.setEventHandler { [weak self] in
			self?.pullPushFrame(retryInterval: retryInterval, retryCount: Self.pullRetryCountMax)
		}

		return timer
	}

	/// Pulls a frame buffer from the producer and immediately pushes it to consumers.
	///
	/// If the producer's stream has more than one frame, all will be consumed,
	/// but only the latest one will be pushed to consumers to avoid camera lag.
	///
	/// - Important: This function must be called on `timerQueue`.
	///
	/// - Parameters:
	///   - retryInterval: The interval with which to retry pulling frame buffers.
	///   - retryCount: The count determining how often a retry occurs before giving up.
	private func pullPushFrame(retryInterval: TimeInterval, retryCount: Int) {
		dispatchPrecondition(condition: .onQueue(timerQueue))

		guard let client, let streamSinkStream = streamSink?.stream, let streamSourceStream = streamSource?.stream else {
			return
		}

		let group = DispatchGroup()
		var sampleBuffersAreAvailable: Bool = false

		repeat {
			group.enter()

			streamSinkStream.consumeSampleBuffer(from: client) { [weak self] sampleBuffer, sequenceNumber, discontinuity, hasMoreSampleBuffers, error in
				defer { group.leave() }

				guard let self else { return }
				guard error == nil else {
					streamLogger.pushLogEntry("Error occurred consuming buffers: \(error.unsafelyUnwrapped.localizedDescription)")
					// Guard against an endless loop if no more sample buffers are coming.
					sampleBuffersAreAvailable = false
					return
				}
				guard let sampleBuffer else {
					// The producer stream was pulled too early, so retry.
					// However, make sure that the first frame has been received to give the producer enough time to send frames before pulling its stream.
					// Otherwise, this timer might lock into a frequency where it always fails to pull initially and gets sample buffers only on retry.
					// Instead, retries should only catch late frames from the producer.
					// Note, that this mechanism introduces a variable sub-frame interval delay, which helps evening out the camera's frame rate.

					if waitedForFirstFrame, retryCount > 0 {
						// Uncomment the following line for debugging purposes. It gets triggered too often for production builds.
						// addLogEntry("No buffer, retrying \(retryCount) more times.")

						let newRetryCount = retryCount - 1
						timerQueue.asyncAfter(deadline: .now().advanced(by: .milliseconds(Int(retryInterval * Double(MSEC_PER_SEC))))) { [weak self] in
							self?.pullPushFrame(retryInterval: retryInterval, retryCount: newRetryCount)
						}
					} else {
						if waitedForFirstFrame {
							streamLogger.pushLogEntry(LogConstants.bufferRetriesFailed)
						} else {
							streamLogger.pushLogEntry("Waiting for first buffer.")
						}
					}
					// Guard against an endless loop if no more sample buffers are coming.
					sampleBuffersAreAvailable = false
					return
				}
				guard hasMoreSampleBuffers == false else {
					// Uncomment the following line for debugging purposes.
					// addLogEntry("Has more sample buffers.")

					// Immediately skip forward to the latest available sample buffer to avoid locking into a laggy pull frequency.
					sampleBuffersAreAvailable = true
					return
				}
				// Only uncomment the following line for debugging purposes to avoid getting in the way of the hot path.
				// addLogEntry("Sending sample buffer.")

				// `clock_gettime_nsec_np(CLOCK_UPTIME_RAW)` is the preferred version of `mach_absolute_time()`.
				let nowInNanoseconds: UInt64 = clock_gettime_nsec_np(CLOCK_UPTIME_RAW)
				streamSourceStream.send(sampleBuffer, discontinuity: discontinuity, hostTimeInNanoseconds: nowInNanoseconds)
				let output: CMIOExtensionScheduledOutput = CMIOExtensionScheduledOutput(sequenceNumber: sequenceNumber, hostTimeInNanoseconds: nowInNanoseconds)
				streamSinkStream.notifyScheduledOutputChanged(output)

				waitedForFirstFrame = true
			}

			group.wait()
		} while sampleBuffersAreAvailable
	}
}

// MARK: - Errors

extension DeviceSource {
	enum Error: BaseErrorWithAssociatedValues {
		case streamUnexpectedlyNil
		case creatingPixelBufferPoolFailed(CVReturn)
		case landingPageAssetNotFound
		case imageLoadingFailed
		case acquiringPixelBufferFailed(CVReturn)
		case acquiringGraphicsContextFailed
	}
}

extension DeviceSource.Error {
	static let domain: String = "CameraExtension.DeviceSource"

	static let allCases: [DeviceSource.Error] = [
		.streamUnexpectedlyNil,
		.creatingPixelBufferPoolFailed(kCVReturnSuccess),
		.landingPageAssetNotFound,
		.imageLoadingFailed,
		.acquiringPixelBufferFailed(kCVReturnSuccess),
		.acquiringGraphicsContextFailed,
	]

	var errorMessage: String {
		switch self {
		case .streamUnexpectedlyNil: "Stream was unexpectedly found to be nil."
		case let .creatingPixelBufferPoolFailed(cvError): "Creating the pixel buffer pool failed: \(cvError)"
		case .landingPageAssetNotFound: "Landing page asset was not found."
		case .imageLoadingFailed: "Loading image failed."
		case let .acquiringPixelBufferFailed(cvError): "Acquiring pixel buffer failed: \(cvError)"
		case .acquiringGraphicsContextFailed: "Acquiring graphics context failed."
		}
	}
}
