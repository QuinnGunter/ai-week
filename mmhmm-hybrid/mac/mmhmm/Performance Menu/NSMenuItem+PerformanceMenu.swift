//
//  NSMenuItem+PerformanceMenu.swift
//  mmhmm
//
//  Created by Beni Federer on 13.01.25.
//

import AppKit

/// An extension which implements specialized `NSMenuItem` behavior.
///
/// We intentionally refrain from subclassing `NSMenuItem`, which,
/// while being explicitly supported by AppKit, has led to unpredictable
/// runtime behavior in other projects in the past.
@MainActor
extension NSMenuItem {
	private enum PerformanceMenuTitles {
		static let performance: String = "Performance"
		static let balancedMode: String = "Balanced Mode"
	}

	var isPerformanceMenuItem: Bool { title == PerformanceMenuTitles.performance }
	var isBalancedModeMenuItem: Bool { title == PerformanceMenuTitles.balancedMode }

	func updateAsPerformanceMenuItem() {
		guard isPerformanceMenuItem else {
			Logger.logMessage("Is not \(PerformanceMenuTitles.performance) menu item.", level: .error)
			return
		}

		// Currently the only reason to show the performance menu is
		// the balanced mode feature. Therefore hide the entire menu,
		// if the feature is not available.
		isHidden = BalancedMode.isSupportedOnCurrentArchitecture == false
	}

	func validateAsBalancedModeMenuItem() -> Bool {
		guard isBalancedModeMenuItem else {
			Logger.logMessage("Is not \(PerformanceMenuTitles.balancedMode) menu item.", level: .error)
			return false
		}

		guard BalancedMode.isSupportedOnCurrentArchitecture else {
			Logger.logMessage("\(PerformanceMenuTitles.balancedMode) is not supported on this platform.", level: .error)
			return false
		}

		state = BalancedMode.state.controlState
		return true
	}
}
