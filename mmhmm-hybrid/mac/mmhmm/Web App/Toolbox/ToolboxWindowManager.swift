//
//  ToolboxWindowManager.swift
//  mmhmm
//
//  Created by Beni Federer on 10.09.24.
//

import AppKit

import Common

extension WebApp {
	@MainActor
	final class ToolboxWindowManager: WindowManager {
		override static var representedWebApp: WebApp.WebAppType { .toolbox }

		override static var frameAutosaveName: NSWindow.FrameAutosaveName { NSWindow.FrameAutosaveName.toolboxWindow }

		override func willConfigureWindow(_ window: NSWindow) {
			window.isToolboxWindow = true
			window.collectionBehavior = [.fullScreenNone]

			// Despite `.fullScreenNone` collection behavior, the toolbox presents in fullscreen, when
			// opening from a fullscreen main app window. In this case, fullscreen must be exited manually.
			if window.isFullScreen {
				window.toggleFullScreen(nil)
			}

			// Explicitly set the style mask only after fullscreen was toggled to avoid an NSException,
			// "NSWindowStyleMaskFullScreen cleared on a window outside of a full screen transition."
			window.styleMask = Self.windowStyleMask
		}

		override func wantsWindow() {}

		fileprivate static let defaultFrame = NSRect(
			origin: .zero,
			size: NSSize(width: 480, height: 440)
		)

		override var defaultFrame: NSRect { Self.defaultFrame }

		override var defaultTitle: String { "Airtime Tools" }

		override var titleVisibility: NSWindow.TitleVisibility { .visible }

		/// The style mask to apply to the window, so that it is just closable, but not resizable or fullscreenable.
		private static let windowStyleMask: NSWindow.StyleMask = [.closable]

		/// Whether the controller is presenting the `window`.
		override var isPresenting: Bool {
			get {
				!(window?.isHidden ?? true)
			}
			set {
				if newValue {
					// Show the toolbox window.
					window?.isHidden = false

					if let keyWindow: NSWindow = NSApp.keyWindow, keyWindow.isFullScreen {
						keyWindow.isFullScreen = false
						keyWindow.orderBack(nil)
					}

					return
				} else {
					// The toolbox window should never be closed to avoid flickering
					// when reloading the toolbox web page. Instead it is hidden.
					window?.isHidden = true
					return
				}
			}
		}

		/// Ensures the window is put into a closable state, before trying to close it.
		override func closeWindow() {
			window?.styleMask = Self.windowStyleMask
			window?.close()
			window = nil
		}
	}
}

extension NSWindow.FrameAutosaveName {
	fileprivate static let toolboxWindow: String = "ToolboxWindow"
}

extension NSWindow {
	public var isToolboxWindow: Bool {
		get { frameAutosaveName == NSWindow.FrameAutosaveName.toolboxWindow }
		set {
			guard newValue else {
				setFrameAutosaveName("")
				return
			}

			// The toolbox has a fixed size, so remove any previously stored frame
			// to avoid misalignments when the web view content changes.
			Self.removeFrame(usingName: FrameAutosaveName.toolboxWindow)

			// Still set the autosave name and default size programmatically.
			setFrameAutosaveName(FrameAutosaveName.toolboxWindow)
			setFrame(WebApp.ToolboxWindowManager.defaultFrame, display: false)

			center()
		}
	}
}
