//
//  WebApp.EventProxy.swift
//  mmhmm
//
//  Created by Beni Federer on 28.10.25.
//

import Foundation

extension WebApp {
	@MainActor
	class EventProxy {
		static let shared = EventProxy()

		func handleEvent(with payload: [String: Any], inBrowserWithID browserID: Int32) {
			Logger.logMessage("Received proxy event from browser with ID \(browserID): \(payload)", level: .debug)

			guard let webApp: WebAppProtocol = Application.cefAppDelegate.browser.webAppManagingBrowser(withID: Int(browserID)) else {
				Logger.logMessage("No WebApp found for browser ID \(browserID)", level: .error)
				return
			}

			let eventNameKey = String(mmhmm.EventProxyKeys.eventName)
			let eventPayloadKey = String(mmhmm.EventProxyKeys.eventPayload)

			guard let eventName = payload[eventNameKey] as? String else {
				Logger.logMessage("Invalid event name in payload", level: .error)
				return
			}

			guard let eventPayload = payload[eventPayloadKey] as? [String: Any] else {
				Logger.logMessage("Invalid event payload structure", level: .error)
				return
			}

			let handled: Bool = webApp.handleEvent(withName: eventName, payload: eventPayload)

			if handled == false {
				Logger.logMessage("Unhandled proxy event '\(eventName)' in WebApp of type \(type(of: webApp))", level: .error)
			}
		}

		func emit(event: WebAppEventRepresentable, inBrowser browserID: Int32) throws {
			try CxxBridge.emitEvent(
				browserID,
				std.string(event.name),
				std.string(event.payload.jsonString)
			)
		}
	}
}

protocol WebAppEventRepresentable: Sendable {
	var name: String { get }
	var payload: Encodable & Sendable { get }
}

extension WebApp.EventProxy {
	struct GenericEvent: WebAppEventRepresentable {
		let name: String
		let payload: any Encodable & Sendable

		init(name: String, payload: Encodable & Sendable) {
			self.name = name
			self.payload = payload
		}
	}
}

public struct EventProxyBridge {
	/// Zero sized value types cannot be exposed to C++ yet.
	public let cxxInteropDummy: String = ""

	public static func handleEvent(payload: std.string, browserID: Int32) {
		guard let jsonData = String(payload).data(using: .utf8) else {
			Logger.logMessage("Failed to convert payload string to data", level: .error)
			return
		}

		do {
			guard let dictionaryPayload = try JSONSerialization.jsonObject(with: jsonData, options: []) as? [String: Any] else {
				Logger.logMessage("Failed to cast JSON payload", level: .error)
				return
			}

			Task { @MainActor in
				WebApp.EventProxy.shared.handleEvent(with: dictionaryPayload, inBrowserWithID: browserID)
			}
		} catch {
			Logger.logMessage("Failed to parse JSON payload: \(error)", level: .error)
		}
	}
}
