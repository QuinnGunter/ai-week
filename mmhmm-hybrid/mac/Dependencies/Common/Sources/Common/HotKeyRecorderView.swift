//
//  HotKeyRecorderView.swift
//  Airtime Menu
//
//  Created by Beni Federer on 03.11.25.
//

import Carbon
import SwiftUI

import Common

public struct HotKeyRecorderView: View {
	@Binding public var hotKey: HotKey?
	@Binding public var isRecording: Bool
	@State private var displayText: String = "Click to record"
	@FocusState private var isFocused: Bool

	public init(hotKey: Binding<HotKey?>, isRecording: Binding<Bool>) {
		_hotKey = hotKey
		_isRecording = isRecording
	}

	public var body: some View {
		HStack(spacing: 0) {
			HotKeyRecorderTextField(
				hotKey: $hotKey,
				isRecording: $isRecording,
				displayText: $displayText,
				isFocused: $isFocused
			)
			.help("Click to record a new hotkey combination. Press any key combination with modifiers (⌘, ⌥, ⌃, ⇧) or press Esc to cancel.")

			if hotKey != nil && !isRecording {
				Button(action: {
					hotKey = nil
				}, label: {
					Image(systemName: "xmark.circle.fill")
						.foregroundStyle(.secondary)
						.imageScale(.small)
				})
				.buttonStyle(.plain)
				.padding(.leading, 8)
				.help("Clear hotkey")
			}
		}
	}
}

struct HotKeyRecorderTextField: NSViewRepresentable {
	@Binding var hotKey: HotKey?
	@Binding var isRecording: Bool
	@Binding var displayText: String
	@FocusState.Binding var isFocused: Bool

	func makeNSView(context: Context) -> RecordingTextField {
		let textField = RecordingTextField()
		textField.coordinator = context.coordinator
		textField.placeholderString = "Click to record"
		textField.isEditable = false
		textField.isBordered = false
		textField.wantsLayer = true
		textField.drawsBackground = true
		textField.bezelStyle = .roundedBezel
		textField.focusRingType = .none
		textField.alignment = .center
		textField.heightAnchor.constraint(equalToConstant: 22).isActive = true
		textField.layer?.backgroundColor = NSColor.controlBackgroundColor.cgColor
		textField.layer?.cornerRadius = 4

		if let hotKey = hotKey {
			textField.stringValue = hotKey.keyComboDescription
			textField.textColor = .labelColor
		} else {
			textField.stringValue = ""
		}

		return textField
	}

	func updateNSView(_ textField: RecordingTextField, context: Context) {
		textField.coordinator = context.coordinator

		if isRecording {
			textField.stringValue = displayText
			textField.textColor = .placeholderTextColor
		} else if let hotKey = hotKey {
			textField.stringValue = hotKey.keyComboDescription
			textField.textColor = .labelColor
		} else {
			textField.stringValue = ""
			textField.textColor = .labelColor
		}

		if isRecording {
			textField.layer?.backgroundColor = NSColor.darkGray.cgColor
			textField.layer?.borderWidth = 2
			textField.layer?.borderColor = NSColor.controlAccentColor.cgColor
		} else {
			textField.layer?.backgroundColor = NSColor.controlBackgroundColor.cgColor
			textField.layer?.borderWidth = 0
		}
	}

	func makeCoordinator() -> Coordinator {
		Coordinator(hotKey: $hotKey, isRecording: $isRecording, displayText: $displayText, isFocused: $isFocused)
	}

	class Coordinator: NSObject {
		@Binding var hotKey: HotKey?
		@Binding var isRecording: Bool
		@Binding var displayText: String
		@FocusState.Binding var isFocused: Bool
		private var localMonitor: Any?

		init(hotKey: Binding<HotKey?>, isRecording: Binding<Bool>, displayText: Binding<String>, isFocused: FocusState<Bool>.Binding) {
			_hotKey = hotKey
			_isRecording = isRecording
			_displayText = displayText
			_isFocused = isFocused
		}

		func startRecording() {
			isRecording = true
			isFocused = true
			displayText = "Keys or Esc..."

			localMonitor = NSEvent.addLocalMonitorForEvents(matching: [.keyDown, .flagsChanged]) { [weak self] event in
				guard let self else { return event }
				self.handleKeyEvent(event)

				// Prevent the key event from being processed further
				return nil
			}
		}

		func stopRecording(clearHotKey: Bool = false) {
			isRecording = false
			isFocused = false

			if let localMonitor {
				NSEvent.removeMonitor(localMonitor)
				self.localMonitor = nil
			}

			if clearHotKey {
				hotKey = nil
			}

			if let hotKey {
				displayText = hotKey.keyComboDescription
			} else {
				displayText = "Click to record"
			}
		}

		func cancelRecording() {
			stopRecording()
		}

		private func handleKeyEvent(_ event: NSEvent) {
			// Check for Escape key to cancel recording
			if event.type == .keyDown && event.keyCode == UInt16(kVK_Escape) {
				cancelRecording()
				return
			}

			let modifiers: NSEvent.ModifierFlags = event.modifierFlags.intersection(.deviceIndependentFlagsMask)
			let hasModifiers: Bool = modifiers.contains(.command) ||
				modifiers.contains(.option) ||
				modifiers.contains(.shift) ||
				modifiers.contains(.control)

			// For keyDown events, we need both modifiers and a key
			guard event.type == .keyDown, hasModifiers else { return }

			let carbonModifiers: UInt32 = carbonModifiersFrom(modifiers)
			let keyComboDescription: String = keyComboString(from: modifiers, keyCode: UInt32(event.keyCode))
			let userFriendlyDescription: String = userFriendlyString(from: modifiers, keyCode: UInt32(event.keyCode))

			hotKey = HotKey(
				modifiers: carbonModifiers,
				keyCode: UInt32(event.keyCode),
				userFriendlyDescription: userFriendlyDescription,
				keyComboDescription: keyComboDescription
			)

			displayText = keyComboDescription
			stopRecording()
		}

		private func carbonModifiersFrom(_ modifiers: NSEvent.ModifierFlags) -> UInt32 {
			var carbonModifiers: UInt32 = 0

			if modifiers.contains(.command) {
				carbonModifiers |= UInt32(cmdKey)
			}
			if modifiers.contains(.option) {
				carbonModifiers |= UInt32(optionKey)
			}
			if modifiers.contains(.shift) {
				carbonModifiers |= UInt32(shiftKey)
			}
			if modifiers.contains(.control) {
				carbonModifiers |= UInt32(controlKey)
			}

			return carbonModifiers
		}

		private func keyComboString(from modifiers: NSEvent.ModifierFlags, keyCode: UInt32) -> String {
			var result: String = ""

			if modifiers.contains(.control) {
				result += "⌃"
			}
			if modifiers.contains(.option) {
				result += "⌥"
			}
			if modifiers.contains(.shift) {
				result += "⇧"
			}
			if modifiers.contains(.command) {
				result += "⌘"
			}

			result += Int(keyCode).keyCharacter

			return result
		}

		private func userFriendlyString(from modifiers: NSEvent.ModifierFlags, keyCode: UInt32) -> String {
			var parts: [String] = []

			if modifiers.contains(.control) {
				parts.append("Control")
			}
			if modifiers.contains(.option) {
				parts.append("Option")
			}
			if modifiers.contains(.shift) {
				parts.append("Shift")
			}
			if modifiers.contains(.command) {
				parts.append("Cmd")
			}

			parts.append(Int(keyCode).keyCharacter)

			return parts.joined(separator: "-")
		}
	}
}

// Custom NSTextFieldCell subclass to add padding and center text vertically
class PaddedTextFieldCell: NSTextFieldCell {
	override func drawingRect(forBounds rect: NSRect) -> NSRect {
		var newRect: NSRect = super.drawingRect(forBounds: rect)
		newRect = newRect.insetBy(dx: 4, dy: 0)
		let textSize: NSSize = cellSize(forBounds: rect)
		let heightDelta: CGFloat = rect.height - textSize.height

		if heightDelta > 0 {
			newRect.origin.y += heightDelta / 2
		}

		return newRect
	}
}

// Custom NSTextField subclass to handle click events
class RecordingTextField: NSTextField {
	weak var coordinator: HotKeyRecorderTextField.Coordinator?
	private var isCurrentlyFirstResponder = false

	override init(frame frameRect: NSRect) {
		super.init(frame: frameRect)
		cell = PaddedTextFieldCell()
	}

	required init?(coder: NSCoder) {
		super.init(coder: coder)
		cell = PaddedTextFieldCell()
	}

	override func mouseDown(with event: NSEvent) {
		super.mouseDown(with: event)
		// Become first responder and start recording when clicked
		if window?.makeFirstResponder(self) == true {
			coordinator?.startRecording()
		}
	}

	override func becomeFirstResponder() -> Bool {
		isCurrentlyFirstResponder = true
		return true
	}

	override func resignFirstResponder() -> Bool {
		// Stop recording when losing focus
		if isCurrentlyFirstResponder {
			coordinator?.stopRecording()
			isCurrentlyFirstResponder = false
		}
		return true
	}

	override var acceptsFirstResponder: Bool {
		return true
	}
}
