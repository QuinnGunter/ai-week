//
//  Modifiers+BackwardsCompatibility.swift
//  mmhmm
//
//  Created by Beni Federer on 05.11.25.
//

import SwiftUI

// MARK: - View Extensions

extension View {
	/// Cross-platform compatible onChange modifier that works with both old and new signatures.
	@ViewBuilder
	func onChangeCompat<V: Equatable>(of value: V, perform action: @escaping (V) -> Void) -> some View {
		if #available(macOS 14.0, *) {
			onChange(of: value) { _, newValue in
				action(newValue)
			}
		} else {
			onChange(of: value, perform: action)
		}
	}
}

extension View {
	/// Cross-platform compatible scrollBounceBehavior modifier.
	@ViewBuilder
	func scrollBounceBehaviorCompat(_ behavior: ScrollBounceBehaviorCompat, axes: Axis.Set = [.vertical]) -> some View {
		if #available(macOS 13.3, *) {
			switch behavior {
			case .automatic:
				self.scrollBounceBehavior(.automatic, axes: axes)
			case .basedOnSize:
				self.scrollBounceBehavior(.basedOnSize, axes: axes)
			case .always:
				self.scrollBounceBehavior(.always, axes: axes)
			}
		} else {
			self
		}
	}
}

enum ScrollBounceBehaviorCompat {
	case automatic
	case basedOnSize
	case always
}

// MARK: - Scene Modifiers

extension Scene {
	/// Applies a floating window level on macOS 15.0 and later.
	func floatingWindowLevel() -> some Scene {
		if #available(macOS 15.0, *) {
			return windowLevel(.floating)
		} else {
			return self
		}
	}
}
