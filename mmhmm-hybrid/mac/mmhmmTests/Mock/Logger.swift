//
//  Logger.swift
//  mmhmmTests
//
//  Created by Beni Federer on 17.07.24.
//

import Foundation

import struct os.OSLogType

// swiftlint:disable:next identifier_name
let Logger = MockLogger()

actor MockLogger: LoggerProtocol {
	nonisolated func logError(_ error: Swift.Error,
							  messagePrefix: String? = nil,
							  level: OSLogType = .error,
							  targets: LoggerTargets = .all,
							  location: String? = nil,
							  file: String = #fileID,
							  function: String = #function,
							  line: UInt = #line) {}

	nonisolated func logMessage(_ message: String,
								level: OSLogType,
								targets: LoggerTargets = .all,
								location: String? = nil,
								file: String = #fileID,
								function: String = #function,
								line: UInt = #line) {}
}
