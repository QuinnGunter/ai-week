//
//  WebApp.WindowManager.swift
//  mmhmm
//
//  Created by Beni Federer on 08.08.25.
//

import AppKit

import Common

extension WebApp {
	/// A window manager for a CEF browser window containing a main app view,
	/// which is a window that can present a loading indicator and has a toolbar.
	///
	/// This class is intentionally not based on `NSWindowController` since becoming either a controller,
	/// a delegate, or a parent window of a CEF browser window ends up being a big fat mess due to
	/// either CEF crashes or AppKit complications.
	@MainActor
	class WindowManager {
		required init(appState: AppState, window: NSWindow? = nil) {
			toolbarDelegate = WindowManager.ToolbarDelegate(
				appState: appState,
				toolboxButtonConfiguration: toolboxButtonConfiguration,
				representedWebApp: Self.representedWebApp
			)

			if let window {
				self.window = window
				configureWindow(window)
			}
		}

		/// The type of web app the manager represents.
		class var representedWebApp: WebApp.WebAppType { .mmhmm }

		/// The name the window frame is autosaved under.
		class var frameAutosaveName: NSWindow.FrameAutosaveName { "" }

		/// The currently controlled window.
		weak var window: NSWindow? {
			didSet {
				guard let window else {
					browserID = nil
					NotificationCenter
						.default
						.removeObserver(self,
										name: NSWindow.didResizeNotification,
										object: oldValue)
					return
				}
				configureWindow(window)
			}
		}

		/// The browser ID of the CEF browser hosted in `window`.
		var browserID: Int?

		/// The configuration of the titlebar's toolbox button.
		private(set) var toolboxButtonConfiguration = WebApp.WindowManager.ToolboxButtonView.Configuration()

		// swiftlint:disable:next weak_delegate
		private var toolbarDelegate: WindowManager.ToolbarDelegate

		/// The loading indicator presented until the window has finished loading.
		private var loadingView: NSView?

		/// The controller of the titlebar accessory view presenting connected camera consumers.
		private var titlebarAccessoryViewController: CameraExtensionTitleBarAccessoryViewController?

		/// Whether the controller is presenting the `window`.
		var isPresenting: Bool {
			get {
				!(window?.isHidden ?? true)
			}
			set {
				defer {
					Task { @MainActor in
						Application.cefAppDelegate.browser.updateHybridWithAppWindows()
					}
				}

				guard newValue else {
					window?.isHidden = true
					return
				}

				guard let window else {
					wantsWindow()
					return
				}

				if window.isFullScreen || window.isMiniaturized {
					window.makeKeyAndOrderFront(nil)
				} else {
					window.isHidden = false
				}
			}
		}

		/// Whether the controlled window is presenting the `loadingView`.
		var isLoading: Bool {
			get {
				loadingView != nil
			}
			set {
				switch newValue {
				case true:
					loadingView = window?.contentView?.addLoadingSubview()
				case false:
					loadingView?.removeFromSuperview()
					loadingView = nil
				}
			}
		}

		/// Whether the controlled window has the toolbar.
		var showsToolbar: Bool {
			get {
				if let toolbar = window?.toolbar {
					return toolbar.isVisible
				} else {
					Logger.logMessage("Failed to get main app window toolbar.", level: .fault)
					return false
				}
			}
			set {
				guard let toolbar = window?.toolbar else {
					Logger.logMessage("Failed to get main app window toolbar.", level: .fault)
					return
				}

				switch newValue {
				case true:
					titlebarAccessoryViewController = CameraExtensionTitleBarAccessoryViewController()
					toolbarDelegate.virtualCameraStatusView = titlebarAccessoryViewController?.view
					toolbarDelegate.resetToolbarItems(in: toolbar)
					toolbar.isVisible = true
				case false:
					titlebarAccessoryViewController = nil
					toolbar.isVisible = false
				}
			}
		}

		/// Resizes the window.
		///
		/// This method replaces zero size values with
		/// the screen maximum bounds.
		///
		/// - Parameter size: The targeted window size.
		func resize(to size: CGSize) {
			guard let window else {
				Logger.logMessage("Failed to resize main app window to \(size), because there is no window.", level: .error)
				return
			}

			let originAdjustedFrame: CGRect = window.originFlippedZeroSizeLengthsReplacedFrame(with: size, forContentRect: false)
			guard originAdjustedFrame != window.frame else { return }

			setFrame(originAdjustedFrame, ofWindow: window)
		}

		/// Sends `performClose` to `window`.
		///
		/// This method ensures the window is put into a closable state, before trying to close it.
		func closeWindow() {
			window?.close()
			window = nil
		}

		// MARK: - Required overrides

		/// Override this method to perform additional configuration before the window is set up, e.g.
		/// `window.isMainAppWindow = true`.
		func willConfigureWindow(_ window: NSWindow) {
			fatalError("Subclasses must override willConfigureWindow()")
		}

		/// Override this method to get notified that the manager wants to get a window to present.
		///
		/// This method is called when the manager does not have a window while `isPresenting` gets set to `true`.
		func wantsWindow() {
			fatalError("Subclasses must override requestsWindow()")
		}

		var defaultFrame: NSRect { .null }

		var defaultTitle: String { Bundle.main.localizedInfoDictionary?["CFBundleDisplayName"] as? String ?? "Airtime" }

		var titleVisibility: NSWindow.TitleVisibility {
			if NSApplication.isLiquidGlassAvailable {
				.visible
			} else {
				.hidden
			}
		}

		// MARK: - Private API

		private func configureWindow(_ window: NSWindow) {
			willConfigureWindow(window)

			window.title = defaultTitle
			// #1167 - Setting the first responder to nil fixes a bug where key presses are not handed to the web app unless the user clicks inside the window first
			window.makeFirstResponder(nil)
			window.titlebarAppearsTransparent = true
			window.titlebarSeparatorStyle = .line
			window.backgroundColor = NSColor(named: "Colors/BackgroundColor")

			window.titleVisibility = titleVisibility

			let toolbar = NSToolbar(identifier: Self.representedWebApp.rawValue)
			toolbar.delegate = toolbarDelegate
			toolbar.allowsUserCustomization = false
			window.toolbar = toolbar
			window.toolbar?.isVisible = false

			isLoading = true

			NotificationCenter
				.default
				.addObserver(forName: NSWindow.didResizeNotification,
							 object: window,
							 queue: .main) { [weak self] notification in
					guard let self, let window = notification.object as? NSWindow else { return }
					MainActor.assumeIsolated {
						window.titleVisibility = window.frame.size.width < 470 ? .hidden : self.titleVisibility
					}
				}
		}

		/// Sets the frame of the specified window's frame while adjusting the
		/// targeted frame size to fit the screen the window is being presented on.
		///
		/// - Parameters:
		///   - frame: The frame to set.
		///   - window: The window the frame of which to set.
		private func setFrame(_ frame: CGRect, ofWindow window: NSWindow) {
			if let toolbar: NSToolbar = window.toolbar {
				// Fix a layout glitch, which occurs when switching between a window size, which is wide enough to
				// accommodate the virtual camera status button, to a narrow window size. The virtual camera
				// status button would be moved out of the toolbar into its context menu, while the button's
				// width autolayout constraint would remain active, causing all other toolbar items to being
				// pushed to the left and into the default window control buttons.
				//
				// The issue is not reliably reproducible and appears to be caused by bad timing between the
				// `titlebarAccessoryViewController` hiding the message label by activating an autolayout constraint
				// after the layout for the resized toolbar has already been calculated. However, the issue can
				// be reproduced reliably by setting a configuration override which adds the override indicator
				// button to the toolbar in debug, engineering and test builds.

				// Update the message label constraint with the new frame, before it is being set.
				titlebarAccessoryViewController?.updateMessageLabelVisibility(withWindowFrame: frame)

				// Remove and add the toolbar items again to make the toolbar update its layout.
				toolbarDelegate.resetToolbarItems(in: toolbar)
			}

			// The resized frame should fully fit inside a screen.
			//
			// However, which screen should be selected in case of overflow is not obvious.
			// Selecting a screen based on the new frame can easily lead to surprises,
			// so is not a viable option. There are generally two other possibilities:
			//
			// 1. The screen containing most of the old frame.
			// 2. The screen containing the origin of the old frame.
			//
			// Option 1 makes sense in most cases, since option 2 could potentially move
			// the window to a screen which only contains a small portion of the old frame.
			// However, macOS allows moving windows across the edge of a screen so that
			// most of the window is on one of the two displays, but not visible. Which
			// screen shows the visible portion of such a window depends not on the amount
			// of frame area, but on which screen the user released the drag gesture which
			// moved the window across the edge of the screen. The result of the latter
			// is opaque and lacks a usable API, so can't be used here.
			let oldFrame: CGRect = window.frame
			let screenContainingMostOfOldFrame: NSScreen? = NSScreen
				.screens
				.filter { $0.visibleFrame.intersects(oldFrame) }
				.sorted { $0.visibleFrame.intersection(oldFrame).area > $1.visibleFrame.intersection(oldFrame).area }
				.first

			let frameToSet: CGRect = if let screenContainingMostOfOldFrame {
				frame.movedInsideBounds(ofScreen: screenContainingMostOfOldFrame)
			} else {
				frame.movedInsideScreenBounds(ofWindow: window)
			}

			window.setFrame(frameToSet, display: true, animate: false)
		}
	}
}
