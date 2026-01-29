//
//  NSWindow+Titlebar.swift
//  mmhmm
//
//  Created by Beni Federer on 10.04.24.
//

import AppKit

extension NSWindow {
	private var titlebar: NSView? {
		guard isVisible else { return nil }

		// The view that has both the titlebar and the divider line between titlebar and content view
		// is the `NSTitlebarContainerView`, which is at the same position in the view hierarchy in both,
		// CEF and AppKit windows.
		guard
			let titlebarContainerViewClass: AnyClass = NSClassFromString("NSTitlebarContainerView"),
			let titlebarContainerView: NSView = contentView?.superview?.subviews.first(where: {
				$0.isKind(of: titlebarContainerViewClass)
			})
		else {
			// Depending on context, this error does not seem to cause UX issues,
			// but let's log it to stay on top of tracking any potential glitches.
			Logger.logMessage("Failed to identify titlebar.", level: .error, targets: .uncheckedAll)
			return nil
		}

		return titlebarContainerView
	}

	var isTitlebarHidden: Bool {
		get {
			titlebar?.alphaValue.isZero ?? false
		}
		set {
			// Fullscreen mode needs the titlebar, so as long as it is active,
			// switching to other apps must not hide anything. Due to an edge
			// case with the resizing notification handler, making the titlebar
			// visible while in full screen mode must still be allowed, though.
			guard (isFullScreen && newValue) == false, let titlebar else {
				return
			}

			// Blend the titlebar in and out smoothly.
			NSAnimationContext.current.duration = 0.2
			let targetAlphaValue: Double = if newValue { 0.0 } else { 1.0 }

			titlebar.animator().alphaValue = targetAlphaValue

			NSWindow.ButtonType.allCases.forEach {
				standardWindowButton($0)?.animator().alphaValue = targetAlphaValue
			}
		}
	}
}
