//
//  ScreenSharePickerCollectionViewItem.swift
//  mmhmm
//
//  Created by Matthew Tonkin on 27/9/2022.
//  Copyright © 2022 mmhmm, inc. All rights reserved.
//

import Cocoa

@MainActor
protocol ScreenSharePickerCollectionViewItemDelegate: NSObjectProtocol {
	func screenShareCollectionViewItemDoubleClicked(_ screenRecorderCollectionViewItem: ScreenSharePickerCollectionViewItem)
}

class ScreenSharePickerCollectionViewItem: SelectableCollectionViewItem {
	weak var delegate: ScreenSharePickerCollectionViewItemDelegate?

	var source: ScreenShare.Source? {
		didSet {
			guard source != oldValue else {
				return
			}

			guard let source else {
				textField?.stringValue = ""
				imageView?.image = nil
				return
			}

			textField?.stringValue = source.title ?? ""
			imageView?.image = nil
		}
	}

	override class var imageViewCornerRadius: CGFloat {
		return 2
	}

	override var background: SelectableCollectionViewItemBackground? {
		didSet {
			background?.drawingProperties = SelectableCollectionViewItemBackground.DrawingProperties(imageViewCornerRadius: 2,
																									 imageViewSelectionBorderWidth: 4,
																									 drawTextFieldBackground: false,
																									 textFieldCornerRadius: 4)
		}
	}

	override func mouseDown(with event: NSEvent) {
		super.mouseDown(with: event)

		if event.clickCount == 2 {
			delegate?.screenShareCollectionViewItemDoubleClicked(self)
		}
	}

	private(set) var initialImageViewSize: CGSize = CGSize(width: 200, height: 112)

	override var imageView: NSImageView? {
		didSet {
			guard let imageView: NSImageView = imageView else {
				return
			}
			initialImageViewSize = imageView.bounds.size
			imageView.image = nil
		}
	}
}
