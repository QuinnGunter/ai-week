//
//  CGRect+Extensions.swift
//  Common
//
//  Created by Beni Federer on 11.03.25.
//

import AppKit

extension CGRect {
	/// Replaces a zero width or a zero height with a value fitting
	/// the bounds of the screen the window is currently on and moves
	/// its origin so that it is fully within the screen bounds.
	///
	/// Use this to transform window sizes when zero indicates
	/// an unlimited dimension. Zero is an invalid window length.
	///
	/// - Parameter window: The window, the screen of which is used
	///                     to determine the bounds to fit to.
	/// - Returns: The recalculated rectangle.
	@MainActor public func zeroSizeLengthsReplacedWithScreenBoundsMax(ofWindow window: NSWindow) -> CGRect {
		guard width.isZero || height.isZero else { return self }

		let maximizedOrigin = CGPoint(
			x: width.isZero ? 0 : minX,
			y: height.isZero ? 0 : minY
		)

		return CGRect(
			origin: maximizedOrigin,
			size: size.zeroLengthsReplacedWithScreenBoundsMax(ofWindow: window)
		)
	}

	/// Creates a rectangle which is within the bounds of the screen
	/// the passed in window is currently on and clips any excess.
	///
	/// This method takes multiple display setups into account. In
	/// these, a screen origin might not be at (0, 0), and so windows
	/// on secondary displays might have frames well beyond the pure
	/// screen size.
	///
	/// - Parameter window: The window, the screen of which is used
	///                     to determine the bounds to move inside of.
	/// - Returns: The recalculated rectangle.
	@MainActor public func movedInsideScreenBounds(ofWindow window: NSWindow) -> CGRect {
		guard let screen = window.screen else { return self }
		return movedInsideBounds(ofScreen: screen)
	}

	// swiftlint:disable:next function_body_length
	@MainActor public func movedInsideBounds(ofScreen screen: NSScreen) -> CGRect {
		let screenBounds: CGRect = screen.visibleFrame

		guard screenBounds.contains(origin) || screenBounds.maxX == minX || screenBounds.maxY == minY else {
			let deltaX: CGFloat = if minX.isLess(than: screenBounds.maxX - 1) {
				max(screenBounds.minX - minX, 0)
			} else {
				-(minX - screenBounds.minX)
			}

			let deltaY: CGFloat = if minY.isLess(than: screenBounds.maxY - 1) {
				max(screenBounds.minY - minY, 0)
			} else {
				-(minY - screenBounds.minY)
			}

			return offsetBy(dx: deltaX, dy: deltaY).movedInsideBounds(ofScreen: screen)
		}

		let oppositeOrigin = CGPoint(x: maxX, y: maxY)

		if screenBounds.contains(oppositeOrigin) {
			return self
		}

		let screenXRange: ClosedRange<CGFloat> = screenBounds.origin.x...(screenBounds.origin.x + screenBounds.width)
		let (newX, newWidth): (CGFloat, CGFloat) = if screenXRange.contains(maxX) {
			(minX, width)
		} else {
			{
				let trailingExcessWidth: CGFloat = maxX - screenXRange.upperBound
				let leadingUnusedScreenWidth: CGFloat = minX - screenXRange.lowerBound
				if leadingUnusedScreenWidth > 0, leadingUnusedScreenWidth > trailingExcessWidth {
					// Move excess width to the left
					return (minX - trailingExcessWidth, width)
				} else {
					// Take the whole screen width
					return (screenXRange.lowerBound, screenBounds.width)
				}
			}()
		}

		let screenYRange: ClosedRange<CGFloat> = screenBounds.origin.y...(screenBounds.origin.y + screenBounds.height)
		let (newY, newHeight): (CGFloat, CGFloat) = if screenYRange.contains(maxY) {
			(minY, height)
		} else {
			{
				let topExcessHeight: CGFloat = maxY - screenYRange.upperBound
				let bottomUnusedScreenHeight: CGFloat = minY - screenYRange.lowerBound
				if bottomUnusedScreenHeight > 0, bottomUnusedScreenHeight > topExcessHeight {
					// Move excess height to the bottom
					return (minY - topExcessHeight, height)
				} else {
					// Take the whole screen height
					return (screenYRange.lowerBound, screenBounds.height)
				}
			}()
		}

		return CGRect(
			x: newX,
			y: newY,
			width: newWidth,
			height: newHeight
		)
	}
}
