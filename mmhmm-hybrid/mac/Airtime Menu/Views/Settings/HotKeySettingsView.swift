//
//  HotKeySettingsView.swift
//  mmhmm
//
//  Created by Beni Federer on 04.11.25.
//

import SwiftUI

import Common

struct HotKeySettingsView: View {
	@ObservedObject var model: AirtimeMenuBarApp.Model

	var body: some View {
		VStack(spacing: 0) {
			Text("To change a shortcut, click its box and press the desired key combination to record it or Escape to cancel.")
				.font(.caption)
				.foregroundStyle(.secondary)
				.padding(.vertical, 8)
				.frame(maxWidth: .infinity, alignment: .leading)

			Divider()

			ForEach(Array(AirtimeMenuBarApp.Model.HotKeyAction.allCases.enumerated()), id: \.element) { index, action in
				HotKeyActionRow(
					action: action,
					model: model
				)

				if index < AirtimeMenuBarApp.Model.HotKeyAction.allCases.count - 1 {
					Divider()
				}
			}

			Divider()

			HStack {
				Spacer()

				Button("Restore Defaults") {
					model.resetHotKeyRegistrations()
				}
				.disabled(model.hotKeyRegistrationsAreDefaults)
				.id(model.hotKeyRegistrations.map(\.id))
			}
			.padding(.top, 8)
		}
		.padding(.horizontal, 8)
	}
}

struct HotKeyActionRow: View {
	let action: AirtimeMenuBarApp.Model.HotKeyAction
	@ObservedObject var model: AirtimeMenuBarApp.Model
	@State private var isRecording = false
	@State private var hotKeyListeningNeedsResume = false
	@State private var shouldFlash = false

	private var currentHotKey: HotKey? {
		model.hotKeyRegistrations.first { $0.actionIdentifier == action }?.hotKey
	}

	var body: some View {
		HStack(alignment: .top, spacing: 16) {
			VStack(alignment: .leading, spacing: 4) {
				Text(action.displayName)
					.font(.body)
				if let help = action.helpText {
					Text(help)
						.font(.caption)
						.foregroundStyle(.secondary)
						.fixedSize(horizontal: false, vertical: true)
				}
			}
			.frame(maxWidth: .infinity, alignment: .leading)

			Spacer()

			HotKeyRecorderView(
				hotKey: Binding(
					get: { currentHotKey },
					set: { newHotKey in
						hotKeyListeningNeedsResume = false

						if let newHotKey, let conflictingRegistration = model.hotKeyRegistrations.first(where: {
							$0.hotKey == newHotKey && $0.actionIdentifier != action
						}) {
							// This hotkey is already used by another action.

							NotificationCenter.default.post(
								name: .flashHotKeyRow,
								object: nil,
								userInfo: ["action": conflictingRegistration.actionIdentifier]
							)

							model.resumeHotKeyListening()
							return
						}

						// Update registrations and resume listening when a hotkey was recorded.
						model.resumeHotKeyListening(withUpdatedHotKey: newHotKey, for: action)
					}
				),
				isRecording: $isRecording
			)
			.frame(width: 125)
			.id("\(action.rawValue)-\(currentHotKey?.keyComboDescription ?? "none")")
			.padding(12)
			.background(shouldFlash ? Color.accentColor.opacity(0.75) : Color.clear)
			.animation(.easeInOut(duration: 0.2), value: shouldFlash)
		}
		.onReceive(NotificationCenter.default.publisher(for: .flashHotKeyRow)) { notification in
			guard let conflictingAction = notification.userInfo?["action"] as? AirtimeMenuBarApp.Model.HotKeyAction,
				  conflictingAction == action else {
				return
			}

			// Start blinking
			shouldFlash = true

			// Stop blinking after a short duration
			Task {
				try? await Task.sleep(for: .seconds(1))
				shouldFlash = false
			}
		}
		.padding(.vertical, 12)
		.onChangeCompat(of: isRecording) { newValue in
			if newValue {
				// Suspend all hotkey listening while recording
				hotKeyListeningNeedsResume = true
				model.suspendHotKeyListening()
			} else {
				// Resume hotkey listening when recording was cancelled
				guard hotKeyListeningNeedsResume else { return }
				hotKeyListeningNeedsResume = false
				model.resumeHotKeyListening()
			}
		}
		.onChangeCompat(of: currentHotKey) { _ in
			// If the hotkey changes externally (e.g., from "Restore Defaults"),
			// cancel any active recording to keep the UI in sync
			if isRecording {
				// Set this to false first to prevent resumeHotKeyListening from being called
				hotKeyListeningNeedsResume = false
				isRecording = false
			}
		}
	}
}

struct HotKeySettingsView_Previews: PreviewProvider {
	static var previews: some View {
		HotKeySettingsView(model: AirtimeMenuBarApp.Model())
	}
}

extension Notification.Name {
	static let flashHotKeyRow = Notification.Name("flashHotKeyRow")
}
