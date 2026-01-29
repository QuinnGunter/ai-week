//
//  BroadcastWindowManager.swift
//  mmhmm
//
//  Created by Beni Federer on 09.04.24.
//

import AppKit

// MARK: - Public API

/// A window manager for a CEF popup browser window containing the MALK broadcast view.
///
/// This class is intentionally not based on `NSWindowController` since becoming either a controller,
/// a delegate, or a parent window of a CEF popup browser window ends up being a big fat mess due to
/// either CEF crashes or AppKit complications.
@MainActor
class BroadcastWindowManager: NSObject {
	init(window: NSWindow) {
		self.window = window

		super.init()

		configureWindow(window)
		registerObservers()

		NotificationCenter.default.addObserver(forName: .enterBroadcastMode, object: nil, queue: .main) { _ in
			MainActor.assumeIsolated {
				Application.cefAppDelegate.browser.creator.openBroadcastWindow()
			}
		}

		NotificationCenter.default.addObserver(forName: .exitBroadcastMode, object: nil, queue: .main) { [weak self] _ in
			MainActor.assumeIsolated {
				self?.closeWindow()
			}
		}
	}

	/// The currently controlled window.
	@objc weak var window: NSWindow? {
		didSet {
			unregisterObservers()

			guard let window else {
				browserID = nil
				return
			}

			configureWindow(window)
			registerObservers()
		}
	}

	/// Whether the controller is presenting the `window`.
	var isPresenting: Bool {
		get {
			!(window?.isHidden ?? true)
		}
		set {
			window?.isHidden = !newValue
		}
	}

	/// The browser ID associated with the broadcast window.
	var browserID: Int?

	private var trackingArea: NSTrackingArea?
	private var nonNormalFrameErrorCount: Int = .zero

	private static let defaultFrame: NSRect = NSRect(origin: CGPoint(x: 100, y: 100), size: NSWindow.defaultWindowMinSize)
	private static let minimumSize = NSSize(width: 512, height: 288)
	private static let aspectRatio = NSSize(width: 16, height: 9)
	private static let windowStyleMask: NSWindow.StyleMask = [.borderless, .fullSizeContentView, .closable, .miniaturizable, .resizable]

	/// Sends `performClose` to `window`.
	///
	/// This method ensures the window is put into a closable state, before trying to close it.
	func closeWindow() {
		guard let window else { return }
		window.isTitlebarHidden = false
		window.performClose(self)
	}
}

// MARK: - Private API

extension BroadcastWindowManager {
	private func configureWindow(_ window: NSWindow) {
		guard UserDefaults.standard.suppressBroadcastWindowManagement == false else { return }

		// Determine first presentation before doing anything else.
		let firstPresentation: Bool = broadcastWindowFrameWasNeverSaved

		window.isBroadcastWindow = true
		window.aspectRatio = Self.aspectRatio
		window.collectionBehavior = .fullScreenPrimary
		window.minSize = Self.minimumSize
		window.isTitlebarHidden = true
		if window.isFullScreen == false {
			window.styleMask = Self.windowStyleMask
		}
		window.title = NSLocalizedString("Broadcast", comment: "Broadcast")

		// The default frame is only used on first presentation.
		// Any subsequent presentation uses the autosaved window frame.
		let frame: NSRect =
			if firstPresentation {
				Self.defaultFrame
			} else {
				window.frame
			}

		// The initial window frame needs to respect the aspect ratio,
		// otherwise the window is filled up with white background
		// outside of the 16:9 broadcast content. This is only applicable
		// until the user resized the window once, giving AppKit the
		// chance to save the frame for future presentations. The resizing
		// action will always respect the window's 16:9 aspect ratio.
		//
		// Although this is technically only required on the very first
		// presentation, it is still done every time, just in case.
		let aspectRatioedFrame: NSRect = frame.maintainingAspectRatio(Self.aspectRatio)

		// The final frame must be calculated after the titlebar was hidden,
		// otherwise the frame calculation is off by the height of the titlebar.

		// #1156: Sentry caught a few occurrences where a frame consisting of `nan`s caused an `NSInternalInconsistencyException`.
		if aspectRatioedFrame.isNormal, window.frame.isNormal {
			window.setFrame(aspectRatioedFrame, display: true)
		} else if nonNormalFrameErrorCount < 2 {
			// Track if this error can occur more than once per session.
			// If not, this is likely to be a launch issue.
			nonNormalFrameErrorCount += 1
			Logger.logMessage("Failed to set window frame because of non-normal frame (\(nonNormalFrameErrorCount)): \(aspectRatioedFrame) \(window.frame)", level: .error)
		}

		updateTrackingArea()
	}

	private func registerObservers() {
		let defaultCenter = NotificationCenter.default
		defaultCenter.addObserver(self, selector: #selector(windowWillClose), name: NSWindow.willCloseNotification, object: window)

		guard UserDefaults.standard.suppressBroadcastWindowManagement == false else { return }

		defaultCenter.addObserver(self, selector: #selector(windowDidBecomeKey), name: NSWindow.didBecomeKeyNotification, object: window)
		defaultCenter.addObserver(self, selector: #selector(windowDidEnterFullScreen), name: NSWindow.didEnterFullScreenNotification, object: window)
		defaultCenter.addObserver(self, selector: #selector(windowDidExitFullScreen), name: NSWindow.didExitFullScreenNotification, object: window)
		defaultCenter.addObserver(self, selector: #selector(windowDidResignMain), name: NSWindow.didResignMainNotification, object: window)
		defaultCenter.addObserver(self, selector: #selector(windowDidResignKey), name: NSWindow.didResignKeyNotification, object: window)
		defaultCenter.addObserver(self, selector: #selector(windowDidResize), name: NSWindow.didResizeNotification, object: window)
		defaultCenter.addObserver(self, selector: #selector(windowDidEndLiveResize), name: NSWindow.didEndLiveResizeNotification, object: window)
	}

	private func unregisterObservers() {
		// swiftlint:disable:next notification_center_detachment
		NotificationCenter.default.removeObserver(self)
	}

	// This should be a static property, but the internally used API can only be called on an `NSWindow` instance.
	private var broadcastWindowFrameWasNeverSaved: Bool {
		window?.setFrameUsingName(.broadcastWindow) ?? false == false
	}

	private var isTitlebarHidden: Bool {
		get { window?.isTitlebarHidden ?? false }
		set { window?.isTitlebarHidden = newValue }
	}

	private func updateTrackingArea() {
		guard let contentView: NSView = window?.contentView else {
			assertionFailure("Missing content view.")
			return
		}

		if let trackingArea {
			contentView.removeTrackingArea(trackingArea)
		}

		let updatedTrackingArea = NSTrackingArea(rect: contentView.visibleRect,
												 options: [.mouseEnteredAndExited, .activeAlways],
												 owner: self)
		contentView.addTrackingArea(updatedTrackingArea)
		trackingArea = updatedTrackingArea
	}
}

// MARK: - NSResponder Messages

extension BroadcastWindowManager {
	@objc func mouseExited(_ event: NSEvent) {
		isTitlebarHidden = true
	}

	@objc func mouseEntered(_ event: NSEvent) {
		isTitlebarHidden = false
	}
}

// MARK: - NSWindowDelegate Overrides

extension BroadcastWindowManager: NSWindowDelegate {
	@objc func windowDidBecomeKey(_ notification: Notification) {
		isTitlebarHidden = true

		// Fix titlebar buttons going missing when foregrounding broadcast window,
		// but take care not to react to the event while fullscreen to avoid triggering
		// an AppKit runtime exception.
		guard let window, window.isFullScreen == false else { return }
		window.styleMask = Self.windowStyleMask
	}

	@objc func windowDidEnterFullScreen(_ notification: Notification) {
		isTitlebarHidden = false
	}

	@objc func windowDidExitFullScreen(_ notification: Notification) {
		window?.styleMask = Self.windowStyleMask
		isTitlebarHidden = true
	}

	@objc func windowDidResignMain(_ notification: Notification) {
		isTitlebarHidden = true
	}

	@objc func windowDidResignKey(_ notification: Notification) {
		isTitlebarHidden = true
	}

	@objc func windowDidResize(_ notification: Notification) {
		updateTrackingArea()
	}

	// Fixes an edge case where the titlebar does not disappear
	// properly after resizing ended.
	@objc func windowDidEndLiveResize(_ notification: Notification) {
		isTitlebarHidden = true
	}

	@objc func windowWillClose(_ notification: Notification) {
		window = nil
	}
}

extension NSWindow.FrameAutosaveName {
	fileprivate static let broadcastWindow = "BroadcastWindow"
}

extension NSWindow {
	public var isBroadcastWindow: Bool {
		get { frameAutosaveName == NSWindow.FrameAutosaveName.broadcastWindow }
		set { setFrameAutosaveName(newValue ? NSWindow.FrameAutosaveName.broadcastWindow : "") }
	}
}

extension UserDefaults {
	private static let suppressBroadcastWindowManagementKey: String = "SuppressBroadcastWindowManagement"

	@objc dynamic var suppressBroadcastWindowManagement: Bool {
		get { bool(forKey: Self.suppressBroadcastWindowManagementKey) }
		set { set(newValue, forKey: Self.suppressBroadcastWindowManagementKey) }
	}

	@objc class func keyPathsForValuesAffectingSuppressBroadcastWindowManagement() -> Set<String> {
		return Set([suppressBroadcastWindowManagementKey])
	}
}

extension Notification.Name {
	static let enterBroadcastMode = Self(rawValue: "Enter Broadcast Mode")
	static let exitBroadcastMode = Self(rawValue: "Exit Broadcast Mode")
}
