//
//  BalancedMode.swift
//  mmhmm
//
//  Created by Beni Federer on 18.09.24.
//

import AppKit

@MainActor
enum BalancedMode {
	enum State {
		case disabled
		case enabled

		init(withBooleanValue isEnabled: Bool) {
			self = isEnabled ? .enabled : .disabled
		}
	}

	/// Toggles balanced mode on or off.
	///
	/// - Returns: The toggled `state`.
	static func toggle() -> State {
		let state: State = state.toggled
		Self.state = state
		return state
	}

	/// Determines if the current architecture supports balanced mode.
	///
	/// Since availability is a product decision and not dictated by
	/// technical limitations, debug builds by default allow support
	/// for testability and debugging purposes.
	static var isSupportedOnCurrentArchitecture: Bool {
		#if DEBUG
		true
		#else
		ProcessInfo.processInfo.architecture != "arm64"
		#endif
	}

	/// The current state of balanced mode.
	static var state: State {
		get {
			State(withBooleanValue: UserDefaults.standard.bool(forKey: UserDefaults.mmhmmKey.enableBalancedMode))
		}
		set {
			let isEnabled: Bool = newValue.booleanValue
			let browser: Browser = Application.cefAppDelegate.browser
			guard let browserID: Int = browser.camera.windowManager.browserID ?? browser.creator.windowManager.browserID else { return }

			UserDefaults.standard.setValue(isEnabled, forKey: UserDefaults.mmhmmKey.enableBalancedMode)
			CxxBridge.setBalancedMode(Int32(browserID), isEnabled)
		}
	}
}

extension BalancedMode.State {
	var booleanValue: Bool {
		switch self {
		case .disabled: false
		case .enabled: true
		}
	}

	var controlState: NSControl.StateValue {
		switch self {
		case .disabled: .off
		case .enabled: .on
		}
	}

	var toggled: Self {
		switch self {
		case .disabled: .enabled
		case .enabled: .disabled
		}
	}
}

extension UserDefaults.mmhmmKey {
	fileprivate static let enableBalancedMode: String = "balanceMode"
}
