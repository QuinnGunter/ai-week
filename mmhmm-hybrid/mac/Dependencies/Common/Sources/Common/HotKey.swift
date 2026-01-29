//
//  HotKey.swift
//  Common
//
//  Created by Beni Federer on 07.10.25.
//

import Carbon
import SwiftUI

/// A global hotkey combination.
public struct HotKey: Hashable, Sendable, Codable {
	/// The modifier keys for the hotkey.
	public let modifiers: UInt32

	/// The key code for the hotkey.
	public let keyCode: UInt32

	/// A user-friendly description of the hotkey.
	public let userFriendlyDescription: String

	/// A menu-friendly representation of the hotkey combination.
	public let keyComboDescription: String

	/// Creates a new `HotKey` instance.
	public init(modifiers: UInt32, keyCode: UInt32, userFriendlyDescription: String, keyComboDescription: String) {
		self.modifiers = modifiers
		self.keyCode = keyCode
		self.userFriendlyDescription = userFriendlyDescription
		self.keyComboDescription = keyComboDescription
	}
}

extension HotKey: Equatable {
	public static func == (lhs: HotKey, rhs: HotKey) -> Bool {
		lhs.modifiers == rhs.modifiers && lhs.keyCode == rhs.keyCode
	}
}

extension HotKey {
	public static let commandOptionShiftR: Self = Self(
		modifiers: UInt32(cmdKey | optionKey | shiftKey),
		keyCode: UInt32(kVK_ANSI_R),
		userFriendlyDescription: "Cmd-Option-Shift-R",
		keyComboDescription: "⌘⌥⇧R"
	)

	public static let commandShiftTwo: Self = Self(
		modifiers: UInt32(cmdKey | shiftKey),
		keyCode: UInt32(kVK_ANSI_2),
		userFriendlyDescription: "Cmd-Shift-2",
		keyComboDescription: "⌘⇧2"
	)

	public static let commandShiftSix: Self = Self(
		modifiers: UInt32(cmdKey | shiftKey),
		keyCode: UInt32(kVK_ANSI_6),
		userFriendlyDescription: "Cmd-Shift-6",
		keyComboDescription: "⌘⇧6"
	)

	public static let commandShiftSeven: Self = Self(
		modifiers: UInt32(cmdKey | shiftKey),
		keyCode: UInt32(kVK_ANSI_7),
		userFriendlyDescription: "Cmd-Shift-7",
		keyComboDescription: "⌘⇧7"
	)
}

extension HotKey: CustomStringConvertible {
	public var description: String {
		"modifiers: \(modifiers), keyCode: \(keyCode)"
	}
}

extension HotKey {
	/// Converts the HotKey to a SwiftUI KeyboardShortcut.
	public var shortcut: KeyboardShortcut? {
		if let keyEquivalent: KeyEquivalent = keyCode.keyEquivalent {
			KeyboardShortcut(keyEquivalent, modifiers: modifiers.modifiers)
		} else {
			nil
		}
	}
}

extension HotKey {
	/// A manager for registering and handling global hotkeys.
	///
	/// This manager uses Carbon APIs to register global hotkeys and handle their events.
	/// It supports registering multiple hotkeys, each with its own action, and provides error handling
	/// through a user-defined error handler.
	///
	/// While Carbon is a legacy API, it doesn't require the user to grant permissions when listening
	/// for global hotkeys on macOS. While Apple has deprecated Carbon, the event listening API is still
	/// available and deprecation appears to concern only certain parts of Carbon, see e.g.
	/// https://github.com/keepassxreboot/keepassxc/issues/3393#issuecomment-540459929
	final public actor GlobalManager {
		/// The type of action to perform when a hotkey is pressed.
		public typealias Action = @Sendable () -> Void

		/// The type of error handler to call when an error occurs.
		public typealias ErrorHandler = @Sendable (Swift.Error) -> Void

		private struct Registration {
			let action: Action
			let hotKeyRef: EventHotKeyRef
			let hotKeyID: EventHotKeyID
		}

		private var registrations: [HotKey: Registration] = [:]
		private var eventHandlerRef: EventHandlerRef?
		private var nextHotKeyID: UInt32 = 1
		private var errorHandler: ErrorHandler?
		private static let signatureFourCC: OSType = "ARTM".fourCharCode ?? OSType(0x4152_544D)

		// MARK: - Public API

		public init() {}

		/// Starts the global hotkey manager.
		///
		/// - Parameter errorHandler: An optional closure to call when an error occurs.
		/// - Throws: An error if the manager is already started or if the event handler could not be installed.
		public func start(errorHandler: ErrorHandler?) throws {
			guard eventHandlerRef == nil else { throw Error.alreadyStarted }

			self.errorHandler = errorHandler

			var eventType = EventTypeSpec(
				eventClass: OSType(kEventClassKeyboard),
				eventKind: OSType(kEventHotKeyPressed)
			)

			let status: OSStatus = InstallEventHandler(
				GetApplicationEventTarget(),
				{ (_: EventHandlerCallRef?, event: EventRef?, userData: UnsafeMutableRawPointer?) -> OSStatus in
					guard let userData else { return noErr }
					let manager: GlobalManager = Unmanaged<GlobalManager>.fromOpaque(userData).takeUnretainedValue()

					var hotkeyID = EventHotKeyID()
					let status: OSStatus = GetEventParameter(
						event,
						OSType(kEventParamDirectObject),
						OSType(typeEventHotKeyID),
						nil,
						MemoryLayout<EventHotKeyID>.size,
						nil,
						&hotkeyID
					)

					let hotKeyEvent: Result<EventHotKeyID, Error> = if status == noErr {
						.success(hotkeyID)
					} else {
						.failure(Error.failedToGetHotKeyIDFromEvent(status: status))
					}

					manager.handleHotKeyEvent(hotKeyEvent)

					return noErr
				},
				1,
				&eventType,
				Unmanaged.passUnretained(self).toOpaque(),
				&eventHandlerRef
			)

			guard status == noErr else {
				self.errorHandler = nil
				throw Error.failedToInstallEventHandler(status: status)
			}
		}

		/// Stops the global hotkey manager, allowing it to be restarted.
		///
		/// This method does not unregister all hotkeys, call
		/// `unregisterHotkey(_:)` or `unregisterAllHotkeys()` to do so.
		public func stop() {
			guard let eventHandlerRef else { return }
			RemoveEventHandler(eventHandlerRef)
			self.eventHandlerRef = nil
		}

		/// Cleans up the global hotkey manager by unregistering all hotkeys and stopping the manager.
		public func cleanup() throws {
			stop()
			try unregisterAllHotkeys()
		}

		/// Registers a global hotkey with an associated action.
		///
		/// - Parameters:
		///   - hotkey: The hotkey to register.
		///   - action: The action to perform when the hotkey is pressed.
		/// - Throws: An error if the hotkey is already registered or if its registration fails.
		public func registerHotkey(_ hotkey: HotKey, action: @escaping Action) throws {
			guard registrations[hotkey] == nil else {
				throw Error.hotkeyAlreadyRegistered
			}

			let hotkeyID = EventHotKeyID(signature: Self.signatureFourCC, id: nextHotKeyID)
			nextHotKeyID += 1

			var hotkeyRef: EventHotKeyRef?
			let status: OSStatus = RegisterEventHotKey(
				hotkey.keyCode,
				hotkey.modifiers,
				hotkeyID,
				GetApplicationEventTarget(),
				0,
				&hotkeyRef
			)

			guard status == noErr else {
				throw Error.failedToRegisterHotkey(status: status)
			}

			guard let hotkeyRef = hotkeyRef else {
				throw Error.failedToRegisterHotkey(status: -1)
			}

			registrations[hotkey] = Registration(action: action, hotKeyRef: hotkeyRef, hotKeyID: hotkeyID)
		}

		/// Unregisters a previously registered global hotkey.
		///
		/// - Parameter hotkey: The hotkey to unregister.
		/// - Throws: An error if the hotkey is not registered or if the unregistration fails.
		public func unregisterHotkey(_ hotkey: HotKey) throws {
			guard let registration: Registration = registrations[hotkey] else {
				throw Error.hotkeyNotRegistered
			}

			let status: OSStatus = UnregisterEventHotKey(registration.hotKeyRef)
			guard status == noErr else {
				throw Error.failedToUnregisterHotkey(status: status)
			}

			registrations[hotkey] = nil
		}

		/// Unregisters all previously registered global hotkeys.
		public func unregisterAllHotkeys() throws {
			for hotkey in Array(registrations.keys) {
				try unregisterHotkey(hotkey)
			}
		}

		// MARK: - Event Handling

		private nonisolated func handleHotKeyEvent(_ event: Result<EventHotKeyID, Error>) {
			switch event {
			case let .success(hotkeyID):
				Task { await handleHotkeyID(hotkeyID) }
			case let .failure(error):
				Task { await errorHandler?(error) }
			}
		}

		private func handleHotkeyID(_ hotkeyID: EventHotKeyID) {
			guard let registration: Registration = registrations.first(where: { $0.value.hotKeyID.signature == hotkeyID.signature && $0.value.hotKeyID.id == hotkeyID.id })?.value else {
				errorHandler?(Error.noRegistrationFoundForHotkeyID(hotkeyID: hotkeyID))
				return
			}

			registration.action()
		}
	}
}

extension HotKey.GlobalManager {
	enum Error: Swift.Error {
		case alreadyStarted
		case failedToInstallEventHandler(status: OSStatus)
		case failedToRegisterHotkey(status: OSStatus)
		case failedToUnregisterHotkey(status: OSStatus)
		case failedToGetHotKeyIDFromEvent(status: OSStatus)
		case hotkeyAlreadyRegistered
		case hotkeyNotRegistered
		case noRegistrationFoundForHotkeyID(hotkeyID: EventHotKeyID)
	}
}

extension HotKey.GlobalManager.Error: BaseErrorWithAssociatedValues {
	static let domain: String = String(describing: Self.self)

	static let allCases: [Self] = [
		.alreadyStarted,
		.failedToInstallEventHandler(status: -1),
		.failedToRegisterHotkey(status: -1),
		.failedToUnregisterHotkey(status: -1),
		.failedToGetHotKeyIDFromEvent(status: -1),
		.hotkeyAlreadyRegistered,
		.hotkeyNotRegistered,
		.noRegistrationFoundForHotkeyID(hotkeyID: EventHotKeyID(signature: 0, id: 0)),
	]

	var errorMessage: String {
		switch self {
		case .alreadyStarted:
			return "The hotkey manager is already started."
		case let .failedToInstallEventHandler(status):
			return "Failed to install event handler with status code: \(status)."
		case let .failedToRegisterHotkey(status):
			return "Failed to register hotkey with status code: \(status)."
		case let .failedToUnregisterHotkey(status):
			return "Failed to unregister hotkey with status code: \(status)."
		case let .failedToGetHotKeyIDFromEvent(status):
			return "Failed to get hotkey ID from event with status code: \(status)."
		case .hotkeyAlreadyRegistered:
			return "The hotkey is already registered."
		case .hotkeyNotRegistered:
			return "The hotkey is not registered."
		case let .noRegistrationFoundForHotkeyID(hotkeyID):
			return "No registration found for hotkey ID: \(hotkeyID)."
		}
	}
}
