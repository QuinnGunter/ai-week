//
//  Logger.swift
//  mmhmm
//
//  Created by Beni Federer on 17.07.24.
//

import Foundation

// Explicitly import `os.Logger` to avoid compiler error `Type 'os' has no member 'Logger'.`
import struct os.Logger
import struct os.OSLogType

import Common

@preconcurrency import Sentry

/// A logger that logs to the unified log system in debug build configuration,
/// to Sentry in release build configuration, and to the log file in either
/// build configuration.
actor ProductionLogger: LoggerProtocol {
	/// The levels that are allowed to be sent to Sentry.
	private static let cloudableSentryLevels: [SentryLevel] = [.info, .error]

	/// The unified log system logger.
	private let logger: os.Logger

	/// The log file writer.
	let fileWriter: FileWriter

	/// Determines whether an error about failing to write to the log file has already been submitted to Sentry.
	private var noLogFileWriteErrorSubmittedToSentryYet: Bool = true

	/// A throttle for log messages.
	private let logMessageThrottle = Throttle.MultipleValues<String>(throttleInterval: 60.0, activationCount: 20)

	/// A throttle for errors being sent to the cloud.
	private let cloudErrorThrottle = Throttle.MultipleValues<ThrottledError>(throttleInterval: 60.0, activationCount: 1, backoffMultiplier: 10)

	/// Determines whether messages are logged at the `.debug` level.
	private let logsDebugLevel: Bool

	init(withFileURL url: URL, configuration: os.Logger.Configuration = .default) {
		logger = os.Logger(with: configuration)
		logsDebugLevel = configuration.logsDebugMessages

		do {
			fileWriter = try FileWriter(url: url)
		} catch {
			fatalError("Starting logger failed: \(error)")
		}

		Task {
			// Ignore this first error, since following log file write errors are being caught.
			try? await fileWriter.writeLogMessageSeparator()
		}

		SentrySDK.start { options in
			options.dsn = "https://e680eedd35b542dfb1d44b4608aa99c1@o405401.ingest.sentry.io/6720536"
			options.environment = Configuration.Release.default.stringValue
			options.enableAppHangTracking = false
			options.enableUncaughtNSExceptionReporting = true
			options.beforeBreadcrumb = { breadcrumb in
				guard Self.cloudableSentryLevels.contains(breadcrumb.level) else { return nil }
				return breadcrumb
			}
			#if DEBUG
			options.debug = true
			#endif
		}

		// This message is logged for all configurations supporting debug messages.
		logMessage("Logging debug messages.", level: .debug)
	}
}

extension ProductionLogger {
	/// Writes a message repeatedly to the log file,
	/// until approximately one mebibyte was written.
	///
	/// Use for testing purposes.
	func logApproximatelyOneMebibyteToFileUnthrottled() {
		for _ in 0..<10000 {
			let message: String = "One hundred bytes of UTF data 0123456789012345678901234567890123456789012345678901234567890123456789"
			logPrefixedMessage(message, level: .info, targets: .file)
		}
	}

	/// Purges all throttled errors and logs them at the `.info` level.
	func flushAndLogThrottledErrors() {
		logPrefixedMessage("--- Flushing throttled errors ---", level: .info, targets: .uncheckedLocal)
		cloudErrorThrottle
			.flushValues(withCountInRange: 1...Int.max)
			.forEach { (throttleResult: (ThrottledError, Throttle.Count)) in
				let message: String = "[throttled: \(throttleResult.1)] " + throttleResult.0.wrappedError.localizedDescription
				logPrefixedMessage(message, level: .info, targets: .uncheckedLocal)
			}
	}

	/// Purges all throttled messages and logs them at the `.info` level.
	func flushAndLogThrottledMessages() {
		logPrefixedMessage("--- Flushing throttled messages ---", level: .info, targets: .uncheckedLocal)
		logMessageThrottle
			.flushValues(withCountInRange: 1...Int.max)
			.forEach { (throttleResult: (String, Throttle.Count)) in
				let message: String = "[throttled: \(throttleResult.1)] " + throttleResult.0
				logPrefixedMessage(message, level: .info, targets: .uncheckedLocal)
			}
	}

	/// Logs the specified error.
	///
	/// # Levels
	///
	/// * If `.cloud` is a target, errors at the `.fault` level are sent to the
	///   cloud immediately.
	/// * Errors at other levels are logged as messages using `localizedDescription`.
	///   Refer to the `logMessage` function documentation for additional information.
	///
	/// # Throttling
	///
	/// Errors sent to the cloud are throttled with a backoff multiplier,
	/// so that recurring errors are reduced into one and slowed down by a
	/// magnitude for each new throttle interval, starting with 60 seconds.
	///
	/// - Parameters:
	///   - error: The error to log.
	///   - messagePrefix: A string giving details about what operation the error resulted from.
	///                    Keep this concise, as the string is used as a log message prefix,
	///                    e.g. "Failed reading configuration file"
	///   - level: The level at which to log. Defaults to `.error`.
	///            Messages at the `.fault` level targeting `.cloud` are sent immediately.
	///   - targets: The targets to log to. Defaults to `.all`.
	///   - location: Added to the log message as a prefix.
	///   - file: If `location` is `nil`, used to generate a log message prefix.
	///   - function: If `location` is `nil`, used to generate a log message prefix for the `.debug` level.
	///   - line: If `location` is `nil`, used to generate a log message prefix for the `.debug` level.
	nonisolated func logError(_ error: Swift.Error,
							  messagePrefix: String? = nil,
							  level: OSLogType = .error,
							  targets: LoggerTargets = .all,
							  location: String? = nil,
							  file: String = #fileID,
							  function: String = #function,
							  line: UInt = #line) {
		Task {
			await isolatedLogError(error,
								   messagePrefix: messagePrefix,
								   level: level,
								   targets: targets,
								   location: location,
								   file: file,
								   function: function,
								   line: line)
		}
	}

	/// Logs the specified message.
	///
	/// # Levels
	///
	/// * If `.cloud` is a target, messages at the `.fault` level are sent to the
	///   cloud immediately. Messages at other levels are added as breadcrumbs
	///   and sent with the next `.fault` level message.
	/// * If `.debugCheck` is a target, messages at the `.error` and `.fault` levels
	///   fail a runtime assertion in debug builds.
	/// * Messages at the `.debug` level are only logged if `logsDebugLevel` is `true`.
	///
	/// # Source Location
	///
	/// A source location prefix can be specified explicitly or generated automatically
	/// from the log location. The generated source location is derived from the leading
	/// part of the filename, e.g. the prefix `[TheThing]` is generated from both
	/// `MyModule/TheThing.swift` and `MyModule/Extensions/TheThing.Foo+Bar.swift`.
	///
	/// # Throttling
	///
	/// Recurring log messages exceeding an initial count of three occurrences are
	/// throttled, so that identical messages are reduced into one for a throttle
	/// interval of 60 seconds.
	///
	/// - Parameters:
	///   - message: The message to log.
	///   - level: The level at which to log.
	///            Messages at the `.fault` level targeting `.cloud` are sent immediately.
	///   - targets: The targets to log to. Defaults to `.all`.
	///   - location: Added to the log message as a prefix.
	///   - file: If `location` is `nil`, used to generate a log message prefix.
	///   - function: If `location` is `nil`, used to generate a log message prefix for the `.debug` level.
	///   - line: If `location` is `nil`, used to generate a log message prefix for the `.debug` level.
	nonisolated func logMessage(_ message: String,
								level: OSLogType,
								targets: LoggerTargets = .all,
								location: String? = nil,
								file: String = #fileID,
								function: String = #function,
								line: UInt = #line) {
		Task {
			await isolatedLogMessage(message,
									 level: level,
									 targets: targets,
									 location: location,
									 file: file,
									 function: function,
									 line: line)
		}
	}
}

extension ProductionLogger {
	private func isolatedLogError(_ error: Swift.Error,
								  messagePrefix: String? = nil,
								  level: OSLogType = .error,
								  targets: LoggerTargets = .all,
								  location: String? = nil,
								  file: String = #fileID,
								  function: String = #function,
								  line: UInt = #line) {
		let filteredTargets: LoggerTargets
		let throttledError = ThrottledError(wrappedError: error as NSError, location: location ?? "\(file):\(function):\(line)")

		if level == .fault, targets.contains(.cloud), let throttleResult: Throttle.ThrottledValueResult = cloudErrorThrottle.add(value: throttledError) {
			let throttledCount: Int = throttleResult.1
			#if DEBUG
			logMessage("[throttled: \(throttledCount)] Ignoring cloud submission of error: \(messagePrefix ?? "") \(error.localizedDescription)",
					   level: .debug,
					   location: location,
					   file: file,
					   function: function,
					   line: line)
			#else
			SentrySDK.capture(error: error) { scope in
				scope.setTag(value: String(throttledCount), key: "throttledCount")
				scope.setTag(value: messagePrefix ?? "", key: "errorSiteInfo")
			}
			#endif
			filteredTargets = targets.subtracting(.cloud)
		} else {
			filteredTargets = targets
		}

		let message: String = if let messagePrefix {
			messagePrefix + ": " + error.localizedDescription
		} else {
			error.localizedDescription
		}

		logMessage(message, level: level, targets: filteredTargets, location: location, file: file)
	}

	private func isolatedLogMessage(_ message: String,
									level: OSLogType,
									targets: LoggerTargets = .all,
									location: String? = nil,
									file: String = #fileID,
									function: String = #function,
									line: UInt = #line) {
		let levelShouldBeLogged: Bool = level != .debug || logsDebugLevel
		guard levelShouldBeLogged else { return }

		let sourceLocationPrefix: String = if let location {
			location
		} else {
			file
				.components(separatedBy: "/")
				.last?
				.components(separatedBy: [".", "+"])
				.first ?? ""
		}

		let sourceLocationPrefixedMessage: String = switch level {
		case .debug:
			"[\(sourceLocationPrefix):\(function):\(line)] \(message)"
		default:
			"[\(sourceLocationPrefix)] \(message)"
		}

		guard let throttleResult: Throttle.ThrottledValueResult = logMessageThrottle.add(value: sourceLocationPrefixedMessage) else { return }
		let throttledLogMessage: String = if throttleResult.1 < 0 {
			throttleResult.0
		} else if throttleResult.1 == 0 {
			"[throttling] " + throttleResult.0
		} else {
			"[throttled: \(throttleResult.1)] " + throttleResult.0
		}

		logPrefixedMessage(throttledLogMessage, level: level, targets: targets)
	}
}

extension ProductionLogger {
	private func logPrefixedMessage(_ message: String, level: OSLogType, targets: LoggerTargets) {
		#if DEBUG
		if targets.contains(.debugCheck), [.error, .fault].contains(level) {
			assertionFailure("Investigate: \(message)")
		}
		#endif
		if targets.contains(.console) {
			logger.log(level: level, "\(message, privacy: .public)")
		}
		if targets.contains(.file) {
			let logLevelPrefixedMessage: String = level.logFilePrefix + " " + message
			Task { await writeToFile(message: logLevelPrefixedMessage) }
		}
		if targets.contains(.cloud) {
			sendMessageToCloud(message, level: level)
		}
	}

	private func writeToFile(message: String) async {
		do {
			try await fileWriter.write(logMessage: message)
		} catch {
			#if DEBUG
			assertionFailure("Failed writing to log file: \(error)")
			#else
			if noLogFileWriteErrorSubmittedToSentryYet {
				SentrySDK.capture(error: error)
				noLogFileWriteErrorSubmittedToSentryYet = false
			}
			#endif
		}
	}

	private func sendMessageToCloud(_ message: String, level: OSLogType) {
		switch level {
		case .fault:
			#if DEBUG
			logger.info("Ignoring cloud submission of message: \(message, privacy: .public)")
			#else
			SentrySDK.capture(message: message)
			#endif
		default:
			let breadcrumb = Sentry.Breadcrumb(level: level.sentryLevel, category: level.sentryCategory)
			breadcrumb.message = message
			SentrySDK.addBreadcrumb(breadcrumb)
		}
	}
}

extension ProductionLogger {
	/// A wrapper for errors required to allow throttling
	/// generic `Swift.Error`s.
	private struct ThrottledError: Swift.Error, Hashable {
		let wrappedError: NSError
		let location: String
	}
}
