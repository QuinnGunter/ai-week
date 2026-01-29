//
//  RemoteControlWindowManager.swift
//  mmhmm
//
//  Created by Beni Federer on 10.09.24.
//

import AppKit

import Common

// MARK: - Public API

/// A window manager for a CEF popup browser window containing the web remote view.
///
/// This class is intentionally not based on `NSWindowController` since becoming either a controller,
/// a delegate, or a parent window of a CEF popup browser window ends up being a big fat mess due to
/// either CEF crashes or AppKit complications.
@MainActor
class RemoteControlWindowManager {
	init(window: NSWindow) {
		self.window = window
		configureWindow(window)
		registerObservers()
	}

	/// The currently controlled window.
	weak var window: NSWindow? {
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

	/// The browser ID associated with the remote control window.
	var browserID: Int?

	/// The loading indicator presented until the window has finished loading.
	private var loadingView: NSView?

	/// The controller of the titlebar accessory view presenting connected camera consumers.
	private var titlebarAccessoryViewController: CameraExtensionTitleBarAccessoryViewController? {
		didSet {
			updateConsumerTitleBarAccessoryView()
		}
	}

	/// Sends `performClose` to `window`.
	///
	/// This method ensures the window is put into a closable state, before trying to close it.
	func closeWindow() {
		window?.performClose(self)
	}

	func removeLoadingIndicator() {
		loadingView?.removeFromSuperview()
	}
}

// MARK: - Private API

extension RemoteControlWindowManager {
	private func configureWindow(_ window: NSWindow) {
		window.isRemoteWindow = true
		window.collectionBehavior = [.fullScreenAuxiliary, .moveToActiveSpace, .fullScreenAllowsTiling, .canJoinAllApplications]
		window.title = String(localized: "Speaker Notes", comment: "Speaker Notes")
		window.level = .floating
		titlebarAccessoryViewController = window.addCameraExtensionTitleBarAccessoryView()

		// #1429: When the remote control window starts in full screen, calling
		// `window.styleMask.subtracting(.fullScreen)` throws the NSException
		// "NSWindowStyleMaskFullScreen cleared on a window outside of a full screen transition."
		// The full screen transition, however, is not accessible to us because
		// when a new window is opened in full screen, it does not post any full screen
		// window notifications.
		//
		// Instead, we toggle full screen when the window is in full screen
		// at this point, which is when the window was just opened.
		if window.isFullScreen {
			window.toggleFullScreen(nil)
		}

		loadingView = window.contentView?.addLoadingSubview()
	}

	private func registerObservers() {
		let defaultCenter = NotificationCenter.default
		defaultCenter.addObserver(forName: NSWindow.willCloseNotification, object: window, queue: .main) { [weak self] _ in
			MainActor.assumeIsolated {
				self?.windowWillClose()
			}
		}
		defaultCenter.addObserver(forName: NSWindow.didResizeNotification, object: window, queue: .main) { [weak self] _ in
			MainActor.assumeIsolated {
				self?.windowDidResize()
			}
		}
	}

	private func unregisterObservers() {
		// swiftlint:disable:next notification_center_detachment
		NotificationCenter.default.removeObserver(self)
	}

	/// The minimum window width required to let the accessory view appear in the
	/// window titlebar, while the window title string equivalent in width to the
	/// string "Remote Control" is not being cut off.
	private static let accessoryViewMinimumWindowWidth: CGFloat = 750

	private func updateConsumerTitleBarAccessoryView() {
		guard let window, let titlebarAccessoryViewController else { return }

		if window.titlebarAccessoryViewControllers.contains(titlebarAccessoryViewController) == false, window.frame.width > Self.accessoryViewMinimumWindowWidth {
			window.addTitlebarAccessoryViewController(titlebarAccessoryViewController)
		} else if let index: Int = window.titlebarAccessoryViewControllers.firstIndex(of: titlebarAccessoryViewController), window.frame.width <= Self.accessoryViewMinimumWindowWidth {
			window.removeTitlebarAccessoryViewController(at: index)
		}
	}
}

// MARK: - NSWindowDelegate Simulated Overrides

extension RemoteControlWindowManager {
	func windowWillClose() {
		window = nil
		titlebarAccessoryViewController = nil
		loadingView = nil
	}

	func windowDidResize() {
		updateConsumerTitleBarAccessoryView()
	}
}

extension NSWindow.FrameAutosaveName {
	fileprivate static let remoteWindow = "WebRemoteWindow"
}

extension NSWindow {
	public var isRemoteWindow: Bool {
		get { frameAutosaveName == NSWindow.FrameAutosaveName.remoteWindow }
		set { setFrameAutosaveName(newValue ? NSWindow.FrameAutosaveName.remoteWindow : "") }
	}
}
