//
//  RemoteControlScreenRecorderMenuView.swift
//  mmhmm
//
//  Created by Beni Federer on 30.10.25.
//

import SwiftUI

struct RemoteControlScreenRecorderMenuView: View {
	@ObservedObject var model: AirtimeMenuBarApp.Model

	var body: some View {
		VStack {
			Button(title(for: .toggleScreenRecorder)) {
				model.toggleScreenRecorder()
			}
			.disabled(!isEnabled(for: .toggleScreenRecorder))
			.keyboardShortcut(screenRecorderShortcut(for: .toggleScreenRecorder))

			Button(title(for: .recordScreen)) {
				model.recordScreen()
			}
			.disabled(!isEnabled(for: .recordScreen))
			.keyboardShortcut(screenRecorderShortcut(for: .recordScreen))

			Button(title(for: .recordWindow)) {
				model.recordWindow()
			}
			.disabled(!isEnabled(for: .recordWindow))
			.keyboardShortcut(screenRecorderShortcut(for: .recordWindow))
		}
	}

	private func screenRecorderShortcut(for actionIdentifier: AirtimeMenuBarApp.Model.HotKeyAction) -> KeyboardShortcut? {
		model.hotKeyRegistrations
			.first { $0.actionIdentifier == actionIdentifier }?
			.hotKey?
			.shortcut
	}

	private func title(for actionIdentifier: AirtimeMenuBarApp.Model.HotKeyAction) -> String {
		switch actionIdentifier {
		case .toggleScreenRecorder:
			if let remoteControlState = model.remoteControlState {
				remoteControlState.screenRecorderIsRecording ? "Stop Recording" : "New Recording"
			} else {
				"New Recording"
			}
		case .recordScreen:
			"Record Screen"
		case .recordWindow:
			"Record Window"
		#if DEBUG
		case .dummyAction:
			"Dummy Action"
		#endif
		}
	}

	private func isEnabled(for actionIdentifier: AirtimeMenuBarApp.Model.HotKeyAction) -> Bool {
		switch actionIdentifier {
		case .toggleScreenRecorder:
			true
		case .recordScreen, .recordWindow:
			if model.remoteControlState?.screenRecorderIsRecording == true {
				false
			} else {
				true
			}
		#if DEBUG
		case .dummyAction:
			false
		#endif
		}
	}
}
