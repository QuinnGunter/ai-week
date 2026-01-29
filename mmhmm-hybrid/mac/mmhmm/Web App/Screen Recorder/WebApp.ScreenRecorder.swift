//
//  WebApp.ScreenRecorder.swift
//  mmhmm
//
//  Created by Beni Federer on 04.08.25.
//

import AppKit

extension WebApp {
	struct ScreenRecorderConfiguration: WebAppConfigurationProtocol {
		static let webAppType: WebApp.WebAppType = .screenRecorder
	}
}

extension WebApp {
	@MainActor
	class ScreenRecorder: Base<ScreenRecorderConfiguration>, ObservableObject {
		@Published private(set) var isRecording: Bool = false

		func toggleRecording() {
			let event: OutboundEvent = isRecording ? .userStoppedRecording : .userStartedRecording
			emitEvent(event)
		}

		func recordScreen() {
			emitEvent(OutboundEvent.userRequestedRecordingScreen)
		}

		func recordWindow() {
			emitEvent(OutboundEvent.userRequestedRecordingWindow)
		}

		override func handleEvent(withName name: String, payload: [String: Any]) -> Bool {
			guard super.handleEvent(withName: name, payload: payload) == false else { return true }

			switch name {
			case StateUpdateEvent.name:
				do {
					let data = try JSONSerialization.data(withJSONObject: payload)
					let stateUpdate = try JSONDecoder().decode(StateUpdateEvent.Payload.self, from: data)

					guard stateUpdate.isRecording != isRecording else {
						Logger.logMessage("ScreenRecorder state unchanged: isRecording = \(stateUpdate.isRecording)", level: .debug)
						return true
					}

					isRecording = stateUpdate.isRecording
					Logger.logMessage("ScreenRecorder state updated: isRecording = \(stateUpdate.isRecording)", level: .debug)
				} catch {
					Logger.logError(error, messagePrefix: "Failed to decode state update")
				}
			default:
				return false
			}

			return true
		}

		private func emitEvent(_ event: WebAppEventRepresentable, foregroundingWindow: Bool = true) {
			do {
				try emit(event: event)
				if foregroundingWindow {
					Task { @MainActor in
						windowManager.isPresenting = true
						NSApp.activate()
					}
				}
			} catch {
				Logger.logError(error, messagePrefix: "Failed to emit ScreenRecorder event")
			}
		}
	}
}

extension WebApp.ScreenRecorder {
	fileprivate struct StateUpdateEvent: Decodable, Sendable {
		static let name = "stateUpdate"

		let name: String
		let payload: Payload

		struct Payload: Decodable, Sendable {
			let isRecording: Bool
		}
	}

	fileprivate enum OutboundEvent: String {
		case userStartedRecording
		case userStoppedRecording
		case userRequestedRecordingScreen
		case userRequestedRecordingWindow
	}
}

extension WebApp.ScreenRecorder.OutboundEvent: WebAppEventRepresentable {
	var name: String { rawValue }

	var payload: any Encodable & Sendable {
		switch self {
		default: [String: String]()
		}
	}
}
