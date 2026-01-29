//
//  os.Logger.Configuration.swift
//  mmhmm
//
//  Created by Beni Federer on 13.05.25.
//

import struct os.Logger

extension os.Logger {
	struct Configuration {
		let subsystem: String
		let category: String
		let logsDebugMessages: Bool
	}

	static let airtimeSubsystem = "airtime.app"
}

extension os.Logger {
	init(with configuration: Configuration) {
		self = Self(subsystem: configuration.subsystem, category: configuration.category)
	}
}
