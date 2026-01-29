//
//  Throttle.swift
//  Common
//
//  Created by Beni Federer on 14.11.23.
//

import Foundation

public protocol ThrottleProtocol<T> {
	associatedtype T
	func add(value: T) -> T?
}

// The namespace used for all throttles.
public enum Throttle {}

extension Throttle {
	public typealias Count = Int
	/// A tuple representing the result of adding a throttled value,
	/// given as the throttled value and the number of its occurrences in the throttle interval.
	public typealias ThrottledValueResult<T> = (T, Count)

	/// Throttles multiple different values to occur once per specified interval.
	///
	/// - Important: This class is not thread safe.
	public class MultipleValues<T: Hashable> {
		private var throttledValues = [T: ValueMetadata]()
		private var throttleInterval: TimeInterval
		private let activationCount: Int
		private let backoffMultiplier: Double

		/// Creates a throttle for multiple values.
		///
		/// - Parameters:
		///   - throttleInterval: An interval specifying the throttle duration.
		///   - activationCount: The number of initial values allowed to pass unthrottled.
		///   - backoffMultiplier: A factor multiplying the throttle interval for each new throttle activation.
		public init(throttleInterval: TimeInterval, activationCount: Int = 1, backoffMultiplier: Double = 1.0) {
			self.throttleInterval = throttleInterval
			self.activationCount = activationCount
			self.backoffMultiplier = backoffMultiplier
		}
	}
}

extension Throttle.MultipleValues {
	/// Throttles a value to occur only once within the throttle interval.
	///
	/// - Parameter value: The value to throttle
	/// - Returns: `nil`, if within the throttle interval.
	///            A tuple of `value` and the number of its occurrences since the last non-`nil` return value,
	///            i. e. the number of throttled values within the throttle interval, if past the interval.
	///            The number of occurrences is negative or zero while below the throttle activation count.
	@discardableResult
	public func add(value: T) -> Throttle.ThrottledValueResult<T>? {
		let valueMetadata: ValueMetadata = if let valueMetadata = throttledValues[value] {
			// The value exists.
			valueMetadata.incrementingCount()
		} else {
			// This is the first value.
			ValueMetadata(count: 1 - activationCount, intervalEnd: .distantFuture)
		}

		// swiftlint:disable:next empty_count
		guard valueMetadata.count > 0 else {
			// Throttle is not active yet for this value.
			throttledValues[value] = valueMetadata
			return (value, valueMetadata.count)
		}

		let now: Date = .now

		guard now <= valueMetadata.intervalEnd else {
			// First value following the throttle interval, reset the count and interval.
			throttleInterval *= backoffMultiplier
			let nextIntervalEnd: Date = now.addingTimeInterval(throttleInterval)
			throttledValues[value] = ValueMetadata(count: .zero, intervalEnd: nextIntervalEnd)

			let throttledWithinIntervalCount: Int = valueMetadata.count - 1
			return (value, throttledWithinIntervalCount)
		}

		if valueMetadata.count == 1 {
			// Set the throttle interval for the first throttled occurrence of this value.
			let initialThrottleInterval = now.addingTimeInterval(throttleInterval)
			throttledValues[value] = valueMetadata.updatingIntervalEnd(to: initialThrottleInterval)
		} else {
			// Throttle the value while it is within the throttle interval.
			throttledValues[value] = valueMetadata
		}

		return nil
	}

	/// Purges and returns all values or the values with a throttle count
	/// within the specified range.
	///
	/// - Parameter range: The range of throttle counts to match value
	///                    occurrences against.
	/// - Returns: All values if `range` is `nil`.
	///            The values with a throttle count within `range` otherwise.
	public func flushValues(withCountInRange range: ClosedRange<Throttle.Count>? = nil) -> [Throttle.ThrottledValueResult<T>] {
		guard let range else {
			return throttledValues.map { (key: T, value: ValueMetadata) in
				(key, value.count)
			}
		}

		let valuesWithThrottleCountInRange: [Throttle.ThrottledValueResult<T>] = throttledValues
			.filter { (_, value: ValueMetadata) in
				range.contains(value.count)
			}
			.map { (key: T, value: ValueMetadata) in
				throttledValues.removeValue(forKey: key)
				return (key, value.count)
			}

		return valuesWithThrottleCountInRange
	}
}

extension Throttle.MultipleValues {
	/// Describes a value with metadata.
	private struct ValueMetadata {
		/// The number of occurrences of the described value within the throttle interval.
		let count: Int
		/// The end of the throttle interval for the described value.
		let intervalEnd: Date

		/// Creates a copy of the receiver with `count` incremented by 1.
		///
		/// - Returns: A copy of the receiver with `count` incremented by 1.
		func incrementingCount() -> Self {
			Self(count: count + 1, intervalEnd: intervalEnd)
		}

		/// Creates a copy of the receiver with `intervalEnd` updated to `date`.
		///
		/// - Returns: A copy of the receiver with an updated `intervalEnd`.
		func updatingIntervalEnd(to date: Date) -> Self {
			Self(count: count, intervalEnd: date)
		}
	}
}

extension Throttle {
	/// Throttles a value to occur once per specified interval, lets all other values pass.
	public class FilteredValue<T: Hashable> {
		public typealias ThrottledValueHandler = (ThrottledValueResult<T>) -> T

		fileprivate let throttle: MultipleValues<T>
		fileprivate let throttledValue: T
		fileprivate let throttledValueHandler: ThrottledValueHandler

		public init(throttledValue: T, throttleInterval: TimeInterval, throttledValueHandler: @escaping ThrottledValueHandler) {
			self.throttledValue = throttledValue
			throttle = MultipleValues(throttleInterval: throttleInterval)
			self.throttledValueHandler = throttledValueHandler
		}

		/// Throttles the value specified in the initializer, lets all other values pass.
		///
		/// - Parameter value: The value to add to the throttle.
		/// - Returns: `value`, if not the `throttledValue` passed to the initializer. Otherwise:
		///            `throttledValue` passed to the initializer as processed by the `throttledValueHandler`, if past the throttle interval.
		///            `nil`, if within the throttle interval.
		@discardableResult
		public func add(value: T) -> T? {
			guard value == throttledValue else {
				return value
			}
			guard let throttledValue: Throttle.ThrottledValueResult<T> = throttle.add(value: value) else {
				return nil
			}
			return throttledValueHandler(throttledValue)
		}
	}
}

extension Throttle.FilteredValue: ThrottleProtocol {}

extension Throttle {
	/// Throttles a string containing a substring to occur once per specified interval, lets all other values pass.
	public class StringContainingSubstring: FilteredValue<String> {
		/// Throttles the value if it contains the substring specified as `throttledValue` in the initializer, lets all other values pass.
		///
		/// - Parameter value: The value to add to the throttle.
		/// - Returns: `value`, if it does not contain the `throttledValue` passed to the initializer. Otherwise:
		///            `value` as processed by the `throttledValueHandler`, if past the throttle interval.
		///            `nil`, if within the throttle interval.
		@discardableResult
		override public func add(value: String) -> String? {
			guard value.contains(throttledValue) else {
				return value
			}
			guard let throttledValue: ThrottledValueResult<String> = throttle.add(value: throttledValue) else {
				return nil
			}
			return throttledValueHandler((value, throttledValue.1))
		}
	}
}

extension Throttle {
	/// A simple pass through that doesn't throttle.
	///
	/// This can be used to avoid guard let clutter.
	public struct Passthrough: StringThrottleProtocol {
		public init() {}
		public func add(value: String) -> String? { value }
	}
}

// Note that the following is required for macOS 12 and below. On macOS 13+, parameterized protocols can be used,
// making `ThrottleProtocol<String>` resolvable at runtime and `StringThrottleProtocol` obsolete.

public protocol StringThrottleProtocol: ThrottleProtocol<String> {}
extension Throttle.FilteredValue<String>: StringThrottleProtocol {}
