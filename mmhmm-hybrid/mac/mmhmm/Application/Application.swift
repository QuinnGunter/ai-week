//
//  Application.swift
//  mmhmm
//
//  Created by Beni Federer on 27.06.24.
//

import Cocoa
import CxxStdlib

import CxxCEF

class Application: NSApplication {
	/// Whether the app is irrevocably terminating.
	///
	/// This variable helps to override behavior targeting
	/// window closing, which can't be easily discerned.
	private(set) static var isTerminating: Bool = false

	override init() {
		super.init()
	}

	@available(*, unavailable)
	required init?(coder: NSCoder) {
		fatalError("init(coder:) has not been implemented")
	}

	override func sendEvent(_ event: NSEvent) {
		// This is essentially what CefScopedSendingEvent does, however Swift
		// does not support unused instances like C++ scope guards.
		let stashedIsHandlingSendEvent = _isHandlingSendEvent
		_isHandlingSendEvent = true
		defer { _isHandlingSendEvent = stashedIsHandlingSendEvent }

		super.sendEvent(event)
	}

	/// Terminates the app the way CEF expects it.
	override func terminate(_: Any?) {
		Self.isTerminating = true

		if cefWindows.isEmpty {
			// No browser windows are open, just stop the CEF run loop.
			let result = mmhmmApp.cefContext.quit()

			if result != noErr {
				// If CEF doesn't want to or can't quit, here's the big gun.
				exit(result)
			}
		} else {
			guard let delegate = Application.shared.delegate as? CEFApplicationDelegate else {
				assertionFailure("Expected a delegate.")
				return
			}

			// Let CEF terminate the app by closing the main app window.
			delegate.tryToTerminateApplication(self)
		}
	}

	// MARK: - CefAppProtocol

	private nonisolated(unsafe) var _isHandlingSendEvent: Bool = false

	// MARK: - Properties

	private var isTerminating: Bool = false

	private var cefWindows: [NSWindow] {
		orderedWindows.filter { $0.isKindOfCEFWindowClass }
	}
}

extension Application: CefAppProtocol {
	nonisolated func isHandlingSendEvent() -> Bool {
		return _isHandlingSendEvent
	}

	nonisolated func setHandlingSendEvent(_ handlingSendEvent: Bool) {
		_isHandlingSendEvent = handlingSendEvent
	}
}

extension Application {
	// Chromium is calling `cancelTerminate:` through `chrome_browser_application_mac::CancelTerminate()`, see:
	// https://source.chromium.org/chromium/chromium/src/+/main:chrome/browser/chrome_browser_application_mac.mm;drc=495cca044b18f7abef2f9496e6b578563f2b6ef1;l=50
	// The original ObjC method is defined there as well:
	// https://source.chromium.org/chromium/chromium/src/+/main:chrome/browser/chrome_browser_application_mac.mm;drc=495cca044b18f7abef2f9496e6b578563f2b6ef1;l=325
	// Note that without the (unused) function parameter `sender: Any?`, the ObjC runtime only sees the Swift derivative `cancelTerminate`,
	// but won't find `cancelTerminate:` and throw an exception.
	@objc func cancelTerminate(_ sender: Any?) {
		// CEF seems happy without anything happening here.
		// If the user cancels, the app does not terminate.
		// If the user accepts to leave, the app quits.
	}
}

extension Application {
	// Detect dynamically if VoiceOver is running. Like Chromium, rely upon the
	// undocumented accessibility attribute @"AXEnhancedUserInterface" which is set
	// when VoiceOver is launched and unset when VoiceOver is closed.
	override class func accessibilitySetValue(_ value: Any?, forAttribute attribute: NSAccessibility.Attribute) {
		guard attribute.rawValue == "AXEnhancedUserInterface", let intValue = value as? Int else { return }
		Logger.logMessage("VoiceOver is now \(intValue != 0 ? "running" : "not running")", level: .debug)
	}
}

extension Application {
	@MainActor
	static var cefAppDelegate: AppDelegate {
		// swiftlint:disable:next force_cast
		Application.shared.delegate as! AppDelegate
	}
}
