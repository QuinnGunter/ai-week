//
//  View+Extensions.swift
//  Common
//
//  Created by Beni Federer on 31.03.25.
//

import SwiftUI

extension View {
	/// Applies the given modifier if the condition is true.
	@ViewBuilder public func `if`<Content: View>(_ condition: Bool, transform: (Self) -> Content) -> some View {
		if condition {
			transform(self)
		} else {
			self
		}
	}
}
