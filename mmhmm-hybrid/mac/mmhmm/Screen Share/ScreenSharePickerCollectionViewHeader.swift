//
//  ScreenSharePickerCollectionViewHeader.swift
//  mmhmm
//
//  Created by Matthew Tonkin on 27/9/2022.
//  Copyright © 2022 mmhmm, inc. All rights reserved.
//

import Cocoa

class ScreenSharePickerCollectionViewHeader: NSView, NSCollectionViewElement {
	static let identifier = NSUserInterfaceItemIdentifier(rawValue: "ScreenSharePickerCollectionViewHeader")

	override init(frame frameRect: NSRect) {
		super.init(frame: frameRect)
		commonInit()
	}

	required init?(coder: NSCoder) {
		super.init(coder: coder)
		commonInit()
	}

	private func commonInit() {
		textField.translatesAutoresizingMaskIntoConstraints = false
		addSubview(textField)
		textField.leadingAnchor.constraint(equalTo: leadingAnchor, constant: 20).isActive = true
		textField.centerYAnchor.constraint(equalTo: centerYAnchor).isActive = true
	}

	override func draw(_ dirtyRect: NSRect) {
		NSColor.windowBackgroundColor.setFill()
		bounds.fill()
	}

	var title: String {
		get {
			return textField.stringValue
		}
		set {
			textField.stringValue = newValue
		}
	}

	private lazy var textField: NSTextField = {
		let textField = NSTextField(labelWithString: "")
		textField.font = NSFont.boldSystemFont(ofSize: 13)
		return textField
	}()
}
