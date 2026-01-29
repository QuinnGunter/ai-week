//
//  String+Extensions.swift
//  Common
//
//  Created by Beni Federer on 29.07.25.
//

import Foundation

extension String {
	public var javaScriptEscaped: String {
		// swiftformat:disable:next redundantSelf
		self
			.replacingOccurrences(of: "\\", with: "\\\\")
			.replacingOccurrences(of: "'", with: "\\'")
			.replacingOccurrences(of: "\"", with: "\\\"")
			.replacingOccurrences(of: "\n", with: "\\n")
			.replacingOccurrences(of: "\r", with: "\\r")
			.replacingOccurrences(of: "\t", with: "\\t")
	}

	public var fourCharCode: OSType? {
		let chars = Array(utf8)
		return if chars.count == 4 {
			OSType(chars[0]) << 24 | OSType(chars[1]) << 16 | OSType(chars[2]) << 8 | OSType(chars[3])
		} else {
			nil
		}
	}
}
