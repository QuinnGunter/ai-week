//
//  FloatingPoint+ModuloRotated.swift
//  Common
//
//  Created by Beni Federer on 09.10.24.
//

import Combine
import Foundation

extension FloatingPoint {
	/// Limits values to +[0.0, 360.0], rotating values exceeding the range back to the other end of the range.
	public var moduloRotated: Self {
		(truncatingRemainder(dividingBy: Self(360)) + Self(360)).truncatingRemainder(dividingBy: Self(360))
	}
}

/// Returns the `moduloRotated` value of `T`.
///
/// Provides a publisher, similar to `@Published`.
@propertyWrapper public struct ModuloRotated<T: FloatingPoint> {
	private var number: T
	// swiftlint:disable:next private_subject
	public let projectedValue: CurrentValueSubject<T, Never>

	public var wrappedValue: T {
		get { number }
		set {
			number = newValue.moduloRotated
			projectedValue.send(number)
		}
	}

	public init(defaultValue: T) {
		number = defaultValue.moduloRotated
		projectedValue = CurrentValueSubject<T, Never>(defaultValue)
	}
}
