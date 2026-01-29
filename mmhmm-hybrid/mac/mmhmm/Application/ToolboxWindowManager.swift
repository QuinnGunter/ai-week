//
//  ToolboxWindowManager.swift
//  mmhmm
//
//  Created by Beni Federer on 10.09.24.
//

import AppKit

import Common

// MARK: - Public API

/// A window manager for a CEF browser window containing the toolbox used to switch app modes.
///
/// This class is intentionally not based on `NSWindowController` since becoming either a controller,
/// a delegate, or a parent window of a CEF browser window ends up being a big fat mess due to
/// either CEF crashes or AppKit complications.
@MainActor
final class ToolboxWindowManager {
	init(window: NSWindow?) {
		self.window = window
		configureWindow()
	}

	/// The currently controlled window.
	weak var window: NSWindow? {
		didSet {
			configureWindow()
		}
	}

	/// Whether the controller is presenting the `window`.
	var isPresenting: Bool {
		get {
			window != nil
		}
		set {
			if FeatureFlags.MiniModeSupport.hideMainAppWindowWhenOpeningToolbox {
				// While the toolbox window is presented, the main app window is hidden
				NSApp.mainAppWindow?.isHidden = newValue
			}

			guard newValue else {
				closeWindow()
				return
			}

			guard window == nil else {
				window?.makeKeyAndOrderFront(nil)
				return
			}

			CxxBridge.openToolbox()

			// Make sure the initial state used when closing the toolbox is correct when entering the toolbox.
			// There might be spurious state changes due to app mode switches.
			Application.cefAppDelegate.closingLastHybridWindowTerminatesApp = true
		}
	}

	/// The style mask to apply to the window, so that it is just closable, but not resizable or fullscreenable.
	private static let windowStyleMask: NSWindow.StyleMask = [.closable]

	/// Sends `performClose` to `window`.
	///
	/// This method ensures the window is put into a closable state, before trying to close it.
	func closeWindow() {
		window?.styleMask = Self.windowStyleMask
		window?.close()
		window = nil
	}
}

// MARK: - Private API

extension ToolboxWindowManager {
	private func configureWindow() {
		guard let window else { return }

		window.isToolboxWindow = true
		window.title = "Airtime Tools"
		window.titleVisibility = .visible
		window.titlebarAppearsTransparent = true
		window.titlebarSeparatorStyle = .line
		window.backgroundColor = NSColor(named: "BackgroundColor")
		window.collectionBehavior = [.fullScreenNone]

		// Despite `.fullScreenNone` collection behavior, the toolbox presents in fullscreen, when
		// opening from a fullscreen main app window. In this case, fullscreen must be exited manually.
		if window.styleMask.contains(.fullScreen) {
			window.toggleFullScreen(nil)
		}

		window.styleMask = Self.windowStyleMask

		window.makeKeyAndOrderFront(nil)
	}
}

extension ToolboxWindowManager {
	fileprivate static let defaultSize = NSSize(width: 500, height: 380)
}

extension NSWindow.FrameAutosaveName {
	fileprivate static let toolboxWindow: String = "ToolboxWindow"
}

extension NSWindow {
	public var isToolboxWindow: Bool {
		get { frameAutosaveName == NSWindow.FrameAutosaveName.toolboxWindow }
		// swiftlint:disable:next unused_setter_value
		set {
			// The toolbox has a fixed size, so remove any previously stored frame
			// to avoid misalignments when the web view content changes.
			UserDefaults
				.standard
				.removeObject(forKey: "NSWindow Frame \(FrameAutosaveName.toolboxWindow)")

			// Still set the autosave name and default size programmatically.
			setFrameAutosaveName(FrameAutosaveName.toolboxWindow)
			let frame = NSRect(origin: .zero, size: ToolboxWindowManager.defaultSize)
			setFrame(frame, display: false)

			center()
		}
	}
}
