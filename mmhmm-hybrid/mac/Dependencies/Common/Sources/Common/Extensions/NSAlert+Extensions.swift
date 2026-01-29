//
//  NSAlert+Extensions.swift
//  Common
//
//  Created by Beni Federer on 28.03.25.
//

import AppKit

extension NSAlert {
	public static func showQuitAlert() {
		let alert = NSAlert()
		alert.alertStyle = .warning
		alert.messageText = "Are you sure you want to quit?"
		alert.addButton(withTitle: String(localized: "Quit"))
		alert.addButton(withTitle: String(localized: "Cancel"))

		if let quitButton = alert.buttons.first {
			quitButton.keyEquivalent = "q"
			quitButton.keyEquivalentModifierMask = .command
			quitButton.hasDestructiveAction = true
		}

		if let cancelButton = alert.buttons.last {
			cancelButton.keyEquivalent = "\u{1b}" // Escape key
		}

		switch alert.runModal() {
		case .alertFirstButtonReturn:
			NSApp.terminate(nil)
		default:
			break
		}
	}
}
