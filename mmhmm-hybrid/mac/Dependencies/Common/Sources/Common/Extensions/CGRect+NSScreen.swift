//
//  CGRect+NSScreen.swift
//  Common
//
//  Created by Beni Federer on 11.03.25.
//

import AppKit

extension CGRect {
	/// Flips a `CGRect` representing view bounds retrieved
	/// via Core Graphics API like `CGDisplayBounds` or
	/// `CGWindowListCopyWindowInfo` from the non-flipped
	/// coordinate space (origin is top left) to AppKit's
	/// flipped coordinate space (origin is bottom left).
	///
	/// Returns `nil` if `NSScreen.screens` is empty.
	public var asAppKitFlippedBounds: CGRect? {
		if let menuBarScreen = NSScreen.screenContainingMenuBar {
			CGRect(
				origin: CGPoint(
					x: origin.x,
					y: menuBarScreen.frame.height - origin.y - size.height
				),
				size: size
			)
		} else {
			nil
		}
	}
}
