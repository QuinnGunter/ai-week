//
//  NSResponder+Extensions.swift
//  mmhmm
//
//  Created by Martin Pilkington on 24/01/2024.
//

import AppKit

extension NSResponder {
	/// Returns true if the responder is a view in the main browser window
	var isMainBrowserView: Bool {
		guard
			let view = self as? NSView,
			let mainWindow: NSWindow = NSApplication.shared.mainWindow,
			mainWindow.className == "CefNSWindow",
			view.window == mainWindow
		else {
			return false
		}
		return true
	}
}
