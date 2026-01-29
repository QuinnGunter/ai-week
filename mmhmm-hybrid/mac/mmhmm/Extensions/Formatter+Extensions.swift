//
//  Formatter+Extensions.swift
//  mmhmm
//
//  Created by Beni Federer on 26.03.24.
//

import Foundation

extension Formatter {
	static var fileByteCountFormatter: ByteCountFormatter {
		let formatter = ByteCountFormatter()
		formatter.countStyle = .file
		return formatter
	}

	static var memoryByteCountFormatter: ByteCountFormatter {
		let formatter = ByteCountFormatter()
		formatter.countStyle = .memory
		return formatter
	}

	static var localDateFormatter: DateFormatter {
		let formatter = DateFormatter()
		formatter.timeZone = .autoupdatingCurrent
		formatter.dateStyle = .medium
		formatter.timeStyle = .short
		return formatter
	}

	static var utcDateFormatter: DateFormatter {
		let formatter = DateFormatter()
		formatter.timeZone = TimeZone(abbreviation: "UTC")
		formatter.dateStyle = .medium
		formatter.timeStyle = .short
		return formatter
	}

	static var timeIntervalFormatter: DateComponentsFormatter {
		let formatter = DateComponentsFormatter()
		formatter.allowedUnits = [.day, .hour]
		return formatter
	}
}
