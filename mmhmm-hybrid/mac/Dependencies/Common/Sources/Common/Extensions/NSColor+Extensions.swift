//
//  NSColor+Extensions.swift
//  Common
//
//  Created by Beni Federer on 12.06.25.
//

import AppKit

extension NSColor {
	public convenience init(hex: String) {
		let hexTrimmed: String = hex.trimmingCharacters(in: .whitespacesAndNewlines)
		let hexSanitized: String = if hexTrimmed.hasPrefix("#") {
			String(hexTrimmed.dropFirst())
		} else {
			hexTrimmed
		}

		var rgb: UInt64 = 0
		Scanner(string: hexSanitized).scanHexInt64(&rgb)

		let red = CGFloat((rgb & 0xFF0000) >> 16) / 255.0
		let green = CGFloat((rgb & 0x00FF00) >> 8) / 255.0
		let blue = CGFloat(rgb & 0x0000FF) / 255.0

		self.init(red: red, green: green, blue: blue, alpha: 1.0)
	}
}
