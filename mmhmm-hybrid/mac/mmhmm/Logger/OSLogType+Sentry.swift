//
//  OSLogType+Sentry.swift
//  mmhmm
//
//  Created by Beni Federer on 11.12.24.
//

import struct os.OSLogType

import Sentry

extension OSLogType {
	var sentryLevel: SentryLevel {
		switch self {
		case Self.default: .info
		case Self.info: .info
		case Self.debug: .debug
		case Self.error: .error
		case Self.fault: .fatal
		default: .none
		}
	}

	var sentryCategory: String {
		switch self {
		case Self.default: "Default"
		case Self.info: "Info"
		case Self.debug: "Debug"
		case Self.error: "Error"
		case Self.fault: "Fault"
		default: "Unknown"
		}
	}

	var logFilePrefix: String {
		"[" + sentryCategory.uppercased() + "]"
	}
}
