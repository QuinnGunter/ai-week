//
//  NSWindow+Extensions.swift
//  Common
//
//  Created by Beni Federer on 10.03.25.
//

import AppKit

extension NSWindow {
	/// Creates a window frame with the passed in size,
	/// preparing it for a resizing action presented from
	/// the bottom right corner.
	///
	/// Also replaces a zero width or a zero height with a value
	/// fitting the bounds of the screen the window is currently on.
	///
	/// - Parameters:
	///   - size: The target size.
	///   - forContentRect: Interpret `size` as the window's content
	///                     rect size, instead of its frame size.
	/// - Returns: The resized frame rectangle.
	public func originFlippedZeroSizeLengthsReplacedFrame(with size: NSSize, forContentRect: Bool = true) -> CGRect {
		let currentFrame: CGRect = frame
		let resizedFrame = CGRect(
			origin: currentFrame.origin,
			size: size
		).zeroSizeLengthsReplacedWithScreenBoundsMax(ofWindow: self)

		guard resizedFrame != currentFrame else { return currentFrame }

		// Find the origin's new Y coordinate

		let heightDifference: CGFloat = if forContentRect {
			frameRect(forContentRect: resizedFrame).height - currentFrame.height
		} else {
			resizedFrame.height - currentFrame.height
		}

		let adjustedY: CGFloat = if heightDifference == 0 {
			resizedFrame.minY
		} else {
			resizedFrame.minY - heightDifference
		}

		let adjustedOrigin = CGPoint(x: resizedFrame.origin.x, y: adjustedY)
		let originAdjustedFrame = CGRect(origin: adjustedOrigin, size: resizedFrame.size)

		return originAdjustedFrame
	}

	/// Resizes the window from the lower right corner,
	/// instead of the default upper right.
	///
	/// In other words, when resizing the window is anchored
	/// in the upper left corner, instead of the lower left,
	/// which is due to the screen's [origin position on
	/// macOS](https://developer.apple.com/library/archive/documentation/General/Conceptual/Devpedia-CocoaApp/CoordinateSystem.html).
	///
	/// Additionally:
	///
	/// * A zero width or a zero height is replaced with a value
	///   fitting the bounds of the screen the window is currently on.
	/// * The origin is moved so that the window is fully within
	///   the screen bounds.
	/// * Any excess frame beyond the screen bounds is clipped.
	///
	/// - Parameter size: The size to apply to the window,
	///                   compensating for UI elements like
	///                   the titlebar.
	/// - Parameter forContentRect: Interpret `size` as the window's
	///                             content rect size, instead of its
	///                             frame size.
	/// - Parameter display: Passed through to `NSWindow.setFrame`.
	/// - Parameter animate: Passed through to `NSWindow.setFrame`.
	public func resizeTo(size: NSSize, forContentRect: Bool = true, display: Bool = true, animate: Bool = true) {
		let originAdjustedFrame: CGRect = originFlippedZeroSizeLengthsReplacedFrame(with: size, forContentRect: forContentRect)
		guard originAdjustedFrame != frame else { return }

		// Determine and set the potentially screen-adjusted, resized frame

		let movedInsideScreenBoundsFrame: CGRect = if forContentRect {
			frameRect(forContentRect: originAdjustedFrame)
				.movedInsideScreenBounds(ofWindow: self)
		} else {
			originAdjustedFrame
				.movedInsideScreenBounds(ofWindow: self)
		}

		NotificationCenter
			.default
			.post(
				Notification(
					name: NSWindow.willResizeToNotification,
					object: self,
					userInfo: ["newFrame": movedInsideScreenBoundsFrame]
				)
			)

		setFrame(
			movedInsideScreenBoundsFrame,
			display: display,
			animate: animate
		)
	}

	public var isHidden: Bool {
		get {
			!isVisible && !isMiniaturized
		}
		set {
			if newValue {
				orderOut(nil)
			} else {
				makeKeyAndOrderFront(nil)
			}
		}
	}

	public var isFullScreen: Bool {
		get {
			styleMask.contains(.fullScreen)
		}
		set {
			guard newValue != isFullScreen else { return }
			toggleFullScreen(nil)
		}
	}
}

extension NSWindow {
	/// A notification sent before ``resizeTo`` sets the updated window frame.
	///
	/// NSWindow does have a ``didResizeNotification``, but not a `willResizeNotification`.
	public static let willResizeToNotification = Notification.Name(rawValue: "NSWindowWillResizeToNotification")
}
