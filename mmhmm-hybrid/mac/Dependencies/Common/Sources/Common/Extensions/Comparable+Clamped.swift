//
//  Comparable+Clamped.swift
//  Common
//
//  Created by Beni Federer on 09.10.24.
//

import Combine
import Foundation

extension Comparable {
	public func clamped(to limits: ClosedRange<Self>) -> Self {
		min(max(self, limits.lowerBound), limits.upperBound)
	}
}

/// Returns the `clamped` value of `T`.
///
/// Provides a publisher, similar to `@Published`.
@propertyWrapper public struct Clamped<T: Comparable> {
	private var number: T
	private let range: ClosedRange<T>
	// swiftlint:disable:next private_subject
	public let projectedValue: CurrentValueSubject<T, Never>

	public var wrappedValue: T {
		get { number }
		set {
			number = newValue.clamped(to: range)
			projectedValue.send(number)
		}
	}

	public init(toRange range: ClosedRange<T>, defaultValue: T) {
		number = defaultValue.clamped(to: range)
		self.range = range
		projectedValue = CurrentValueSubject<T, Never>(defaultValue)
	}
}
