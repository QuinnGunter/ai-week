//
//  SelectableCollectionViewItem.swift
//  mmhmm
//
//  Created by Matthew Tonkin on 18/7/20.
//  Copyright © 2020 mmhmm, inc. All rights reserved.
//

import Cocoa

class SelectableCollectionViewItem: NSCollectionViewItem {
	open class var imageViewCornerRadius: CGFloat {
		return 8
	}

	// swiftlint:disable:next private_outlet - This property needs to be visible in a subclass.
	@IBOutlet var background: SelectableCollectionViewItemBackground? {
		didSet {
			background?.item = self
			background?.isSelected = isSelected
			background?.highlightState = highlightState
		}
	}

	override var imageView: NSImageView? {
		didSet {
			imageView?.wantsLayer = true
			imageView?.layer?.cornerRadius = Self.imageViewCornerRadius
		}
	}

	override var isSelected: Bool {
		didSet {
			guard isSelected != oldValue else {
				return
			}

			background?.isSelected = isSelected
			updateTextViewColor()
		}
	}

	var drawContextualMenuHighlight: Bool = false {
		didSet {
			guard drawContextualMenuHighlight != oldValue else {
				return
			}

			background?.drawContextualMenuHighlight = drawContextualMenuHighlight
			updateTextViewColor()
		}
	}

	override var highlightState: NSCollectionViewItem.HighlightState {
		didSet {
			guard highlightState != oldValue else {
				return
			}

			background?.highlightState = highlightState
		}
	}

	private func updateTextViewColor() {
		let textFieldDrawsBackground: Bool = background?.drawingProperties.drawTextFieldBackground ?? false
		textField?.textColor = (isSelected || drawContextualMenuHighlight) && textFieldDrawsBackground ? NSColor.white : NSColor.textColor
	}
}

class SelectableCollectionViewItemBackground: NSView {
	weak var item: NSCollectionViewItem?

	struct DrawingProperties {
		let imageViewCornerRadius: CGFloat
		let imageViewSelectionBorderWidth: CGFloat
		let drawTextFieldBackground: Bool
		let textFieldCornerRadius: CGFloat
	}

	var drawingProperties: DrawingProperties = DrawingProperties(imageViewCornerRadius: 8,
																 imageViewSelectionBorderWidth: 4,
																 drawTextFieldBackground: false,
																 textFieldCornerRadius: 4) {
		didSet {
			needsDisplay = true
		}
	}

	var isSelected: Bool = false {
		didSet {
			guard isSelected != oldValue else {
				return
			}

			needsDisplay = true
		}
	}

	var drawContextualMenuHighlight: Bool = false {
		didSet {
			guard drawContextualMenuHighlight != oldValue else {
				return
			}

			needsDisplay = true
		}
	}

	var highlightState: NSCollectionViewItem.HighlightState = .none {
		didSet {
			guard highlightState != oldValue else {
				return
			}

			needsDisplay = true
		}
	}

	override func draw(_ dirtyRect: NSRect) {
		guard let window else {
			super.draw(dirtyRect)
			return
		}

		let selectionHighlightColor: NSColor
		if window.isKeyWindow,
		   let firstResponderView: NSView = window.firstResponder as? NSView,
		   isDescendant(of: firstResponderView),
		   isSelected == true {
			selectionHighlightColor = NSColor.controlAccentColor
		} else {
			selectionHighlightColor = NSColor.disabledControlTextColor
		}

		if let imageView: NSImageView = item?.imageView, imageView.image != nil {
			if isSelected || drawContextualMenuHighlight {
				drawBorder(aroundView: imageView,
						   width: drawingProperties.imageViewSelectionBorderWidth,
						   radius: drawingProperties.imageViewCornerRadius,
						   color: selectionHighlightColor)
			}
		}

		if let textField: NSTextField = item?.textField, drawingProperties.drawTextFieldBackground {
			let textFieldFrame: NSRect = convert(textField.bounds, from: textField)
			if isSelected || drawContextualMenuHighlight {
				selectionHighlightColor.setFill()
				NSBezierPath(roundedRect: textFieldFrame,
							 xRadius: drawingProperties.textFieldCornerRadius,
							 yRadius: drawingProperties.textFieldCornerRadius).fill()
			}
		}

		super.draw(dirtyRect)
	}

	func drawBorder(aroundView view: NSView, width: CGFloat, radius: CGFloat, color: NSColor) {
		let effectiveFrame: NSRect = convert(view.bounds, from: view).insetBy(dx: -width / 2, dy: -width / 2)
		let effectiveRadius: CGFloat = radius + width / 2
		let borderPath = NSBezierPath(roundedRect: effectiveFrame, xRadius: effectiveRadius, yRadius: effectiveRadius)
		borderPath.lineWidth = width
		color.setStroke()
		borderPath.stroke()
	}
}
