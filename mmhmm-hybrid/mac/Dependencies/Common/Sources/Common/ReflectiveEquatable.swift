//
//  ReflectiveEquatable.swift
//  Common
//
//  Created by Beni Federer on 29.10.24.
//

import Foundation

/// A protocol to conform types like protocols, which don't support it for free, to `Equatable`.
///
/// - Attention: `String(reflecting:)` avoids the false positives which `String(describing:)`
///              produces, but it is costly, so don't use it in hot paths!
public protocol ReflectiveEquatable: Equatable {}

extension ReflectiveEquatable {
	private var reflectedValue: String { String(reflecting: self) }

	public static func == (lhs: Self, rhs: Self) -> Bool {
		return lhs.reflectedValue == rhs.reflectedValue
	}
}
