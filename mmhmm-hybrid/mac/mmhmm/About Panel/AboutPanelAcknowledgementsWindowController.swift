//
//  AboutPanelAcknowledgementsWindowController.swift
//  mmhmm
//
//  Created by Martin Pilkington on 07/10/2020.
//  Copyright © 2020 mmhmm, inc. All rights reserved.
//

import Cocoa

class AboutPanelAcknowledgementsWindowController: NSWindowController {
	override var windowNibName: NSNib.Name? {
		return String(describing: Self.self)
	}

	@IBOutlet private var textView: NSTextView? {
		didSet {
			guard
				let acknowledgementsURL: URL = Bundle.main.url(forResource: "Acknowledgements", withExtension: "rtf"),
				let attributedString = try? NSAttributedString(url: acknowledgementsURL, options: [:], documentAttributes: nil)
			else {
				return
			}
			textView?.textStorage?.setAttributedString(attributedString)
		}
	}

	@IBAction private func done(_ sender: Any?) {
		guard let window else {
			return
		}
		window.sheetParent?.endSheet(window)
	}
}
