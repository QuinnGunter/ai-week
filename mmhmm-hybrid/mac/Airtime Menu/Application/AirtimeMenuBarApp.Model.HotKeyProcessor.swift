//
//  AirtimeMenuBarApp.Model.HotKeyProcessor.swift
//  mmhmm
//
//  Created by Beni Federer on 04.11.25.
//

import Foundation

import Common

protocol HotKeyProcessorDelegate: AnyObject {
	func executeHotKeyAction(_ action: AirtimeMenuBarApp.Model.HotKeyAction)
}

extension AirtimeMenuBarApp.Model {
	/// Represents an action that can be triggered by a hotkey.
	enum HotKeyAction: String, Codable, CaseIterable {
		case toggleScreenRecorder
		case recordScreen
		case recordWindow
		#if DEBUG
		case dummyAction
		#endif

		var displayName: String {
			switch self {
			case .toggleScreenRecorder: "Create or stop a screen recording"
			case .recordScreen: "Record an entire screen"
			case .recordWindow: "Record a window"
			#if DEBUG
			case .dummyAction: "Dummy Action"
			#endif
			}
		}

		var helpText: String? {
			switch self {
			case .toggleScreenRecorder: "Opens Screen Recorder to start a recording, or stops the recording if one is running."
			case .recordScreen: "Opens Screen Recorder to start a recording of an entire screen."
			case .recordWindow: "Opens Screen Recorder to start a recording of a specific window."
			#if DEBUG
			case .dummyAction: "This is a placeholder action for testing purposes."
			#endif
			}
		}
	}

	struct HotKeyRegistration: Identifiable, Codable, Equatable {
		let id: UUID
		var hotKey: HotKey?
		let actionIdentifier: HotKeyAction

		init(id: UUID = UUID(), hotKey: HotKey?, actionIdentifier: HotKeyAction) {
			self.id = id
			self.hotKey = hotKey
			self.actionIdentifier = actionIdentifier
		}

		var description: String {
			actionIdentifier.displayName
		}

		var help: String? {
			actionIdentifier.helpText
		}

		// MARK: - Equatable

		static func == (lhs: HotKeyRegistration, rhs: HotKeyRegistration) -> Bool {
			// swiftformat:disable indent
			lhs.id == rhs.id &&
			lhs.hotKey == rhs.hotKey &&
			lhs.actionIdentifier == rhs.actionIdentifier
			// swiftformat:enable indent
		}
	}

	actor HotKeyProcessor {
		init(delegate: HotKeyProcessorDelegate) {
			self.delegate = delegate
		}

		private enum State {
			case idle
			case running
		}

		private let hotKeyManager = HotKey.GlobalManager()
		private var registrations: [HotKeyRegistration] = []
		private var state: State = .idle
		private weak var delegate: HotKeyProcessorDelegate?

		var isRunning: Bool {
			state == .running
		}

		func start(registrations: [HotKeyRegistration]) async {
			guard state == .idle else {
				Logger.logMessage("Hotkey processor is already running.", level: .error)
				return
			}

			do {
				try await hotKeyManager.start { (error: Swift.Error) in
					Logger.logError(error, messagePrefix: "Hotkey manager failed")
				}
			} catch {
				Logger.logError(error, messagePrefix: "Failed to start hotkey manager", level: .error)
			}

			do {
				for registration: HotKeyRegistration in registrations {
					try await registerHotKey(registration)
				}
				self.registrations = registrations

				state = .running

				Logger.logMessage("Started hotkey manager.", level: .debug)
			} catch {
				Logger.logError(error, messagePrefix: "Failed to register hotkeys", level: .error)
				await hotKeyManager.stop()
			}
		}

		func stop() async {
			guard state == .running else {
				Logger.logMessage("Hotkey processor is not running.", level: .error)
				return
			}

			await hotKeyManager.stop()
			do {
				try await hotKeyManager.unregisterAllHotkeys()
			} catch {
				Logger.logError(error, messagePrefix: "Failed to unregister all hotkeys", level: .error)
			}

			state = .idle

			Logger.logMessage("Stopped hotkey manager.", level: .debug)
		}

		/// Updates the hotkey registrations by comparing old and new values.
		func updateRegistrations(with newRegistrations: [HotKeyRegistration]) async {
			// Build maps for easier comparison
			let oldMap = Dictionary(uniqueKeysWithValues: registrations.map { ($0.id, $0) })
			let newMap = Dictionary(uniqueKeysWithValues: newRegistrations.map { ($0.id, $0) })

			// Find registrations that were removed
			let removedIDs = Set(oldMap.keys).subtracting(Set(newMap.keys))
			for id: UUID in removedIDs {
				guard let registration = oldMap[id], let hotKey = registration.hotKey else { continue }
				await unregisterHotkey(hotKey)
			}

			// Find registrations that were modified or added
			for (id, newRegistration): (UUID, HotKeyRegistration) in newMap {
				let oldRegistration: HotKeyRegistration? = oldMap[id]

				// If the hotkey changed, unregister the old one
				if let oldHotKey: HotKey = oldRegistration?.hotKey, oldHotKey != newRegistration.hotKey {
					await unregisterHotkey(oldHotKey)
				}

				// If there's a new hotkey and it's different from the old one, register it
				if let newHotKey: HotKey = newRegistration.hotKey, newHotKey != oldRegistration?.hotKey {
					do {
						try await registerHotKey(newRegistration)
					} catch {
						Logger.logError(error, messagePrefix: "Failed to register hotkey \(newHotKey.userFriendlyDescription)", level: .error)
					}
				}
			}

			registrations = newRegistrations
		}

		private func registerHotKey(_ registration: HotKeyRegistration) async throws {
			guard let hotKey: HotKey = registration.hotKey else { return }
			try await hotKeyManager.registerHotkey(hotKey, action: { [weak self] in
				Task { [weak self] in
					await self?.notifyDelegateOfHotKeyAction(registration.actionIdentifier)
				}
			})
			Logger.logMessage("Registered hotkey \(hotKey.userFriendlyDescription) for action \(registration.actionIdentifier.rawValue)", level: .info)
		}

		private func unregisterHotkey(_ hotKey: HotKey) async {
			do {
				try await hotKeyManager.unregisterHotkey(hotKey)
				Logger.logMessage("Unregistered hotkey \(hotKey.userFriendlyDescription)", level: .info)
			} catch {
				Logger.logError(error, messagePrefix: "Failed to unregister hotkey \(hotKey.userFriendlyDescription)", level: .error)
			}
		}

		private func notifyDelegateOfHotKeyAction(_ hotKeyAction: HotKeyAction) {
			delegate?.executeHotKeyAction(hotKeyAction)
		}
	}
}

extension Array where Element == AirtimeMenuBarApp.Model.HotKeyRegistration {
	typealias HotKeyRegistration = AirtimeMenuBarApp.Model.HotKeyRegistration

	/// Compares two arrays of HotKeyRegistration for functional equality,
	/// ignoring the unique IDs.
	func isFunctionallyEqual(to other: [HotKeyRegistration]) -> Bool {
		guard count == other.count else { return false }

		for (current, other) in zip(self, other) {
			if current.hotKey != other.hotKey || current.actionIdentifier != other.actionIdentifier {
				return false
			}
		}

		return true
	}

	#if DEBUG
	static var `default`: [HotKeyRegistration] {
		[
			HotKeyRegistration(
				hotKey: .commandShiftTwo,
				actionIdentifier: .toggleScreenRecorder
			),
			HotKeyRegistration(
				hotKey: .commandShiftSix,
				actionIdentifier: .recordScreen
			),
			HotKeyRegistration(
				hotKey: .commandShiftSeven,
				actionIdentifier: .recordWindow
			),
			HotKeyRegistration(
				hotKey: .commandOptionShiftR,
				actionIdentifier: .dummyAction
			),
		]
	}
	#else
	static var `default`: [HotKeyRegistration] {
		[
			HotKeyRegistration(
				hotKey: .commandShiftTwo,
				actionIdentifier: .toggleScreenRecorder
			),
			HotKeyRegistration(
				hotKey: .commandShiftSix,
				actionIdentifier: .recordScreen
			),
			HotKeyRegistration(
				hotKey: .commandShiftSeven,
				actionIdentifier: .recordWindow
			),
		]
	}
	#endif
}
