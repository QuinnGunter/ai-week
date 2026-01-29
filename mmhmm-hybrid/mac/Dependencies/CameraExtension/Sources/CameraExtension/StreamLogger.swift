//
//  StreamLogger.swift
//  CameraExtension
//
//  Created by Beni Federer on 13.12.23.
//

import CoreMediaIO
import OSLog

import CameraExtensionCommon
import Common

enum LogBehavior {
	case streamAndSystemConsole
	case streamOnly
}

class StreamLogger {
	enum Mode {
		case push(stream: CMIOExtensionStream)
		case pull
	}

	enum State {
		case initialized
		case pushing(stream: CMIOExtensionStream, queue: DispatchQueue, timer: DispatchSourceTimer)
		case pulled
	}

	private static let logQueuePullInterval: TimeInterval = 0.2
	private static let logQueuePullQueueLabel: String = "app.mmhmm.cameraExtension.device.source.logging"

	private static let dateFormatter: DateFormatter = {
		let dateFormatter = DateFormatter()
		dateFormatter.dateFormat = "yyyy-MM-dd HH:mm:ss.SSS"
		return dateFormatter
	}()

	private var state: State = .initialized
	private let logMessagePrefix: String
	private let systemLogger: Logger?
	private let logQueue: BoundedSafeQueue<String>
	private let throttle: any StringThrottleProtocol

	init(messagePrefix: String?, throttle: (any StringThrottleProtocol)?, logger: Logger?) throws {
		logMessagePrefix = messagePrefix ?? ""
		systemLogger = logger
		logQueue = try BoundedSafeQueue()
		// Throttle a log message with a potentially high volume of entries to occur once per 60 seconds in the system console.
		self.throttle = throttle ?? Throttle.Passthrough()
	}

	func start(mode: Mode) throws {
		guard case .initialized = state else {
			throw Error.alreadyStarted
		}

		if case let .push(stream) = mode {
			let logQueuePullQueue = DispatchQueue(label: Self.logQueuePullQueueLabel, qos: .utility)
			let logQueuePullTimer = try makeScheduledLogQueuePullTimer(stream: stream, queue: logQueuePullQueue)
			state = .pushing(stream: stream, queue: logQueuePullQueue, timer: logQueuePullTimer)
			logQueuePullTimer.resume()
		} else {
			state = .pulled
		}
	}

	func pushLogEntry(_ entry: String, logBehavior: LogBehavior = .streamAndSystemConsole) {
		let dateString = Self.dateFormatter.string(from: Date())
		let decoratedLogMessage: String = "\(logMessagePrefix) \(dateString) \(entry)"
		try? logQueue.enqueue(decoratedLogMessage)

		if logBehavior == .streamAndSystemConsole, let systemLogger, let throttledMessage: String = throttle.add(value: entry) {
			// Log just the message to the system console. The console adds category, subsystem, and date information automatically.
			systemLogger.info("\(throttledMessage, privacy: .public)")
		}
	}

	func popLogEntry() -> String {
		guard case .pulled = state else { return LogConstants.unsupportedLogCollectionModeMessage }
		return logQueue.dequeue() ?? LogConstants.noLogMessagesAvailableMessage
	}
}

extension StreamLogger {
	private func makeScheduledLogQueuePullTimer(stream: CMIOExtensionStream, queue: DispatchQueue) throws -> DispatchSourceTimer {
		let timer = DispatchSource.makeTimerSource(queue: queue)
		// As a precaution, make sure to wait a short amount of time, so that the whole CMIO device has been wired up correctly.
		// For example calling `notifyPropertiesChanged` on a stream that was not yet added to a device, leads to a crash.
		// This assumes that the timer is `resume()`d right away, otherwise the wait time will just add a startup delay to log collection.
		let setupWaitTime: DispatchTime = .now().advanced(by: .milliseconds(500))
		timer.schedule(deadline: setupWaitTime, repeating: Self.logQueuePullInterval)
		timer.setEventHandler { [weak self] in
			self?.pullLogQueue(stream: stream)
		}
		return timer
	}

	/// Dequeues all available log messages and sends them to `streamSource.stream` notifying the stream.
	///
	/// - Important: Must be called on `logQueuePullQueue`.
	private func pullLogQueue(stream: CMIOExtensionStream) {
		// Working around a potential race condition:
		// The `notifyPropertiesChanged` API sets the stream property and notifies the stream of the change.
		// When data is set very quickly, the receiver side will eventually be too slow to pick up every change.
		// This results in dropped logs. Therefore, collect all logs and push them as one.
		var allMessages: [String] = []
		while let message: String = logQueue.dequeue() {
			allMessages.append(message)
		}

		guard !allMessages.isEmpty else { return }

		let joinedMessages: String = allMessages.joined(separator: Property.logMessagesSeparator)
		send(logMessage: joinedMessages, toStream: stream)
	}

	private func send(logMessage: String, toStream stream: CMIOExtensionStream) {
		let propertyState: CMIOExtensionPropertyState<AnyObject> = CMIOExtensionPropertyState(value: logMessage as NSString)
		stream.notifyPropertiesChanged([Property.log.property: propertyState])
	}
}

// MARK: - Errors

extension StreamLogger {
	enum Error: BaseErrorWithAssociatedValues {
		case alreadyStarted
	}
}

extension StreamLogger.Error {
	static let allCases: [StreamLogger.Error] = [
		.alreadyStarted,
	]

	static let domain: String = "CameraExtension.StreamLogger"

	var errorMessage: String {
		switch self {
		case .alreadyStarted: "Logger can't be started because it is already running."
		}
	}
}
