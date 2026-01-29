//
//  NSAlert+Extensions.swift
//  mmhmm
//
//  Created by Matthew Tonkin on 24/10/2022.
//

import Cocoa

extension NSAlert {
	static func showAlert(withMessageText messageText: String, informativeText: String? = nil) {
		let alert = NSAlert()
		alert.messageText = messageText
		alert.informativeText = informativeText ?? ""
		alert.runModal()
	}

	static func showRelaunchAlert(withMessageText messageText: String, informativeText: String? = nil) {
		let alert = NSAlert()
		alert.messageText = messageText
		alert.informativeText = informativeText ?? ""
		alert.addButton(withTitle: NSLocalizedString("Quit & Reopen", comment: "Quit & Reopen"))
		alert.addButton(withTitle: NSLocalizedString("Later", comment: "Later")).keyEquivalent = "\u{1b}"
		if alert.runModal() == .alertFirstButtonReturn {
			do {
				try NSApplication.shared.relaunch()
			} catch {
				NSAlert(error: error).runModal()
			}
		}
	}
}
