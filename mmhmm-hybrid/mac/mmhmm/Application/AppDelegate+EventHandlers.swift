//
//  AppDelegate+EventHandlers.swift
//  mmhmm
//
//  Created by Beni Federer on 16.01.25.
//

import AppKit
import Combine

// MARK: - Combine subscriptions

extension AppDelegate {
	func subscribeToChangeEvents() -> Set<AnyCancellable> {
		var subscriptions: Set<AnyCancellable> = []

		// macOS toggled dark mode

		UserDefaults
			.standard
			.publisher(for: \.AppleInterfaceStyle)
			.sink { [weak self] _ in
				guard let theme = self?.browser.camera.theme ?? self?.browser.creator.theme else { return }
				NSApp.appearance = theme.appearance
			}.store(in: &subscriptions)

		return subscriptions
	}
}

// MARK: - AppleEvent Handling

extension AppDelegate {
	func registerInternetAppleEventHandler() {
		NSAppleEventManager
			.shared()
			.setEventHandler(self,
							 andSelector: #selector(handleInternetAppleEvent),
							 forEventClass: UInt32(kInternetEventClass),
							 andEventID: UInt32(kAEGetURL))
	}

	@objc private func handleInternetAppleEvent(_ event: NSAppleEventDescriptor, withReplyEvent replyEvent: NSAppleEventDescriptor) {
		guard
			let stringValue: String = event.paramDescriptor(forKeyword: keyDirectObject)?.stringValue,
			let url = URL(string: stringValue)
		else {
			Logger.logMessage("Unhandled event: \(String(describing: event))", level: .error)
			return
		}

		Logger.logMessage("Handling Apple Event URL: \(url)", level: .info)

		browser.openURL(url: url)
	}
}
