//
//  Logger+Trampoline.swift
//  mmhmm
//
//  Created by Beni Federer on 17.07.24.
//

import Foundation
import struct os.OSLogType

public struct LoggerTrampoline {
	/// A property seems to be required to allow for cxx-interop.
	/// Without it, the compiler only generates a forward declaration.
	public let cxxInteropDummy: String = ""

	/// Logs a message.
	///
	/// - Parameters:
	///   - message: The message to log.
	///   - level: The level to log at.
	///   - location: The source location logging.
	public static func logMessage(_ message: std.string, level: UInt32, location: std.string) {
		// Workaround to transfer `cef_log_severity_t` from cxx to Swift.
		let severity = cef_log_severity_t(rawValue: level)
		Logger.logMessage(String(message), level: severity.osLogLevel, targets: .uncheckedAll, location: String(location))
	}
}

extension cef_log_severity_t {
	var osLogLevel: OSLogType {
		switch self {
		case LOGSEVERITY_DEFAULT: .default
		case LOGSEVERITY_VERBOSE, LOGSEVERITY_DEBUG: .debug
		case LOGSEVERITY_INFO, LOGSEVERITY_WARNING: .info
		case LOGSEVERITY_ERROR: .error
		case LOGSEVERITY_FATAL: .fault
		default: .default
		}
	}
}
