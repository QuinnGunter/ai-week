//
//  LoggerProtocol.swift
//  mmhmm
//
//  Created by Beni Federer on 17.07.24.
//

import Foundation
import struct os.OSLogType

/// A protocol that can be shared between build targets to ensure
/// different logger implementations have identical API.
protocol LoggerProtocol: Actor {
	// swiftlint:disable:next function_parameter_count
	nonisolated func logError(_ error: Swift.Error,
							  messagePrefix: String?,
							  level: OSLogType,
							  targets: LoggerTargets,
							  location: String?,
							  file: String,
							  function: String,
							  line: UInt)

	// swiftlint:disable:next function_parameter_count
	nonisolated func logMessage(_ message: String,
								level: OSLogType,
								targets: LoggerTargets,
								location: String?,
								file: String,
								function: String,
								line: UInt)
}

struct LoggerTargets: OptionSet {
	let rawValue: Int

	// swiftformat:disable consecutiveSpaces
	static let console		= LoggerTargets(rawValue: 1 << 1)
	static let file			= LoggerTargets(rawValue: 1 << 2)
	static let cloud		= LoggerTargets(rawValue: 1 << 3)
	static let debugCheck	= LoggerTargets(rawValue: 1 << 4)
	// swiftformat:enable consecutiveSpaces

	static let all: LoggerTargets = [.console, .file, .cloud, .debugCheck]
	static let local: LoggerTargets = [.console, .file, .debugCheck]
	static let uncheckedAll: LoggerTargets = [.console, .file, .cloud]
	static let uncheckedLocal: LoggerTargets = [.console, .file]
}
