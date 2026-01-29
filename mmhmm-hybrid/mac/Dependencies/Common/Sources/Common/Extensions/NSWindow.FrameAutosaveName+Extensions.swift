//
//  NSWindow.FrameAutosaveName+Extensions.swift
//  Common
//
//  Created by Beni Federer on 19.09.25.
//

import AppKit

extension NSWindow.FrameAutosaveName {
	public var frame: NSRect? {
		let defaultsKey: String = "NSWindow Frame \(self)"

		guard let frameString = UserDefaults.standard.string(forKey: defaultsKey) else {
			// No saved frame for this autosave name
			return nil
		}

		// The frame string format is typically "x y w h screenX screenY screenW screenH"
		// Extract the first four values (x, y, width, height)
		let components: [Substring] = frameString.split(separator: " ")
		guard
			components.count >= 4,
			let xCoordinate = Double(components[0]),
			let yCoordinate = Double(components[1]),
			let width = Double(components[2]),
			let height = Double(components[3])
		else {
			return nil
		}

		return NSRect(x: xCoordinate, y: yCoordinate, width: width, height: height)
	}
}
