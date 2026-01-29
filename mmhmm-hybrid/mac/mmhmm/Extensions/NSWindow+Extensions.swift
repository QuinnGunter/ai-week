//
//  NSWindow+Extensions.swift
//  mmhmm
//
//  Created by Matthew Tonkin on 30/10/2022.
//

import AppKit

extension NSWindow {
	static func floatingWindow(withContentViewController contentViewController: NSViewController) -> NSWindow {
		let window = NSWindow(contentViewController: contentViewController)
		window.layoutIfNeeded()
		window.title = ""
		window.titlebarAppearsTransparent = true

		let styleMasksToRemove: [NSWindow.StyleMask.Element] = [.closable, .miniaturizable, .resizable]
		styleMasksToRemove.forEach { window.styleMask.remove($0) }

		let styleMasksToInsert: [NSWindow.StyleMask.Element] = [.fullSizeContentView]
		styleMasksToInsert.forEach { window.styleMask.insert($0) }

		window.isMovableByWindowBackground = true
		window.center()

		return window
	}

	func presentViewControllerAsSheet(_ viewController: NSViewController, completionHandler: ((NSApplication.ModalResponse) -> Void)? = nil) {
		let window: NSWindow = Self.floatingWindow(withContentViewController: viewController)
		beginSheet(window, completionHandler: completionHandler)
	}

	var isKindOfCEFWindowClass: Bool {
		guard let cefWindowClass: AnyClass = NSClassFromString("NativeWidgetMacNSWindow") else {
			assertionFailure("NativeWidgetMacNSWindow must be loaded.")
			return false
		}

		return isKind(of: cefWindowClass)
	}

	func addCameraExtensionTitleBarAccessoryView() -> CameraExtensionTitleBarAccessoryViewController {
		let consumerAccessory = CameraExtensionTitleBarAccessoryViewController()
		consumerAccessory.layoutAttribute = .right
		addTitlebarAccessoryViewController(consumerAccessory)
		return consumerAccessory
	}

	/// The default minimum size for windows.
	static let defaultWindowMinSize = NSSize(width: 320, height: 600)

	/// The maximum size of the window deemed as compact, e.g. for mini mode.
	static let compactWindowMaxSize = NSSize(width: 700, height: 400)

	/// Whether the window is floating above other windows.
	var isFloating: Bool {
		get {
			level == .floating
		}
		set {
			level = if newValue {
				.floating
			} else {
				.normal
			}
		}
	}

	/// Whether the window is omitted in screen shares.
	var isOmittedInScreenShares: Bool {
		get {
			sharingType == .none
		}
		set {
			sharingType = if newValue {
				.none
			} else {
				.readOnly
			}
		}
	}
}
