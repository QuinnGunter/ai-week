@testable import Common

import Foundation
import Testing

@Suite("Throttle.MultipleValues Swift Testing")
final class ThrottleMultipleValuesSwiftTests {
	private static let throttleInterval: TimeInterval = 1.0
	private static let expectedValue: String = "test"
	private static let expectedValues: [Int] = Array(0..<100)

	@Test("Throttle.MultipleValues.activationCount with one value", arguments: [0, 1, 10, 100])
	func activationCount(_ activationCount: Int) async throws {
		let unthrottledValueCount: Int = activationCount
		let longerThanThrottleInterval = Self.throttleInterval * 1.5
		let throttle = Throttle.MultipleValues<String>(throttleInterval: Self.throttleInterval, activationCount: activationCount)

		for _ in 0..<unthrottledValueCount {
			let result = throttle.add(value: Self.expectedValue)
			#expect(result?.0 ?? "" == Self.expectedValue, "Value added before throttle becomes active is not throttled and matches expected value.")
			#expect(result?.1 ?? 42 <= 0, "Value count before throttle becomes active is less than or equal to zero.")
		}

		#expect(throttle.add(value: Self.expectedValue) == nil, "Value added to active throttle is throttled.")

		try await Task.sleep(for: .seconds(longerThanThrottleInterval))

		#expect(throttle.add(value: Self.expectedValue) != nil, "Value added after end of throttle interval is not throttled.")
		#expect(throttle.add(value: Self.expectedValue) == nil, "Second value added after end of throttle interval is throttled again, as throttle remains active and starts a new throttle interval.")
	}

	@Test("Throttle.MultipleValues.activationCount with multiple values", arguments: [0, 1, 10, 100])
	func activationCountWithMultipleValues(_ activationCount: Int) async throws {
		let unthrottledValueCount: Int = activationCount
		let throttle = Throttle.MultipleValues<Int>(throttleInterval: Self.throttleInterval, activationCount: activationCount)

		for _ in 0..<unthrottledValueCount {
			for expectedValue: Int in Self.expectedValues {
				let result = throttle.add(value: expectedValue)
				#expect(result?.0 ?? 0 == expectedValue, "Value added before throttle becomes active is not throttled and matches expected value.")
				#expect(result?.1 ?? 42 <= 0, "Value count before throttle becomes active is less than or equal to zero.")
			}
		}

		for expectedValue in Self.expectedValues {
			#expect(throttle.add(value: expectedValue) == nil, "Value added after throttle becomes active is throttled.")
		}
	}

	@Test("Throttle.MultipleValues with a random number of multiple values")
	func multipleValues() async throws {
		let maximumNumberOfValueInstances: Int = 1000

		// Create a throttle which starts already active
		let throttle = Throttle.MultipleValues<Int>(throttleInterval: Self.throttleInterval, activationCount: 0)

		// Add random number of instances per value while throttle is active
		let expectedRandomNumberOfInstancesOfExpectedValues: [Int: Int] = addRandomNumber(ofValues: Self.expectedValues,
																						  upToMaxCount: maximumNumberOfValueInstances,
																						  toThrottle: throttle)

		try await Task.sleep(for: .seconds(Self.throttleInterval))

		// Add one instance per value while throttle is inactive to validate throttled count
		for (expectedValue, expectedValueCount) in expectedRandomNumberOfInstancesOfExpectedValues {
			let result = throttle.add(value: expectedValue)
			#expect(result?.0 ?? 0 == expectedValue, "Value added after throttle interval is not throttled and matches expected value.")
			#expect(result?.1 ?? -1 == expectedValueCount, "Value count after throttle interval matches expected value count.")
		}
	}

	@Test("Throttle.MultipleValues.backoffMultiplier", arguments: [1.0, 5.0, 10.0])
	func backoffMultiplier(_ backoffMultiplier: Double) async throws {
		let throttleInterval: TimeInterval = 0.1
		var multipliedThrottleInterval: TimeInterval = throttleInterval * 1
		let throttle = Throttle.MultipleValues<String>(throttleInterval: throttleInterval, activationCount: 0, backoffMultiplier: backoffMultiplier)

		for _ in stride(from: 1.0, to: 3.1, by: 1.0) {
			let lessThanThrottleInterval: TimeInterval = multipliedThrottleInterval * 0.8
			let moreThanRestOfThrottleInterval: TimeInterval = (multipliedThrottleInterval - lessThanThrottleInterval) * 1.2
			print("\(lessThanThrottleInterval) - \(moreThanRestOfThrottleInterval)")

			#expect(throttle.add(value: Self.expectedValue) == nil, "Value added at beginning of throttle interval is throttled.")
			try await Task.sleep(for: .seconds(lessThanThrottleInterval), tolerance: .zero)
			#expect(throttle.add(value: Self.expectedValue) == nil, "Value added towards end of throttle interval is throttled.")
			try await Task.sleep(for: .seconds(moreThanRestOfThrottleInterval))
			let result = throttle.add(value: Self.expectedValue)
			#expect(result?.0 ?? "" == Self.expectedValue, "Value added after end of throttle interval is not throttled and matches expected value.")
			#expect(result?.1 ?? -1 == 2, "Value count after end of throttle interval matches expected value count.")

			multipliedThrottleInterval *= backoffMultiplier
		}
	}

	@Test("Throttle.MultipleValues.flushValues()")
	func flushValues() throws {
		let maximumNumberOfValueInstances: Int = 1000

		// Create a throttle which starts already active
		let throttle = Throttle.MultipleValues<Int>(throttleInterval: Self.throttleInterval, activationCount: 0)

		// Add random number of instances per value while throttle is active
		let expectedRandomNumberOfInstancesOfExpectedValues: [Int: Int] = addRandomNumber(ofValues: Self.expectedValues,
																						  upToMaxCount: maximumNumberOfValueInstances,
																						  toThrottle: throttle)

		let flushedValues: [Throttle.ThrottledValueResult] = throttle.flushValues()
		#expect(flushedValues.count == expectedRandomNumberOfInstancesOfExpectedValues.count)
		flushedValues.forEach { flushedValue in
			#expect(expectedRandomNumberOfInstancesOfExpectedValues[flushedValue.0] == flushedValue.1)
		}
	}

	@Test("Throttle.MultipleValues.flushValues() with range")
	func flushValuesWithRange() throws {
		let maximumNumberOfValueInstances: Int = 1000
		let range: ClosedRange<Int> = 42...123

		// Create a throttle which starts already active
		let throttle = Throttle.MultipleValues<Int>(throttleInterval: Self.throttleInterval, activationCount: 0)

		// Add random number of instances per value while throttle is active and
		// filter random numbers, which are the occurrence of the added value, by range
		let expectedRandomNumberOfInstancesOfExpectedValues: [Int: Int] = addRandomNumber(ofValues: Self.expectedValues,
																						  upToMaxCount: maximumNumberOfValueInstances,
																						  toThrottle: throttle)
			.filter { range.contains($0.value) }

		let flushedValues: [Throttle.ThrottledValueResult] = throttle.flushValues(withCountInRange: range)
		#expect(flushedValues.count == expectedRandomNumberOfInstancesOfExpectedValues.count)
		flushedValues.forEach { flushedValue in
			#expect(expectedRandomNumberOfInstancesOfExpectedValues[flushedValue.0] == flushedValue.1)
		}
	}
}

extension ThrottleMultipleValuesSwiftTests {
	/// Pairs each element of the passed in array with a random number _n_
	/// and adds that value _n_ times to the specified throttle.
	///
	/// - Parameters:
	///   - values: The values to add to `throttle`.
	///   - maxCount: The maximum count of each element in `values` to add
	///               to `throttle`.
	///   - throttle: The throttle to add `values` to.
	/// - Returns: A dictionary containing random numbers in the range
	///            between zero and `maxCount`, keyed by `values`.
	private func addRandomNumber<T>(ofValues values: [T], upToMaxCount maxCount: Int, toThrottle throttle: Throttle.MultipleValues<T>) -> [T: Int] {
		let randomNumberOfInstancesOfExpectedValues: [T: Int] = values.pairWithRandomNumber(max: maxCount)
		var mutableRandomNumberOfInstancesOfExpectedValues: [T: Int] = randomNumberOfInstancesOfExpectedValues
		for _ in 0..<maxCount {
			for (value, valueCount) in mutableRandomNumberOfInstancesOfExpectedValues {
				guard valueCount > 0 else { continue }
				#expect(throttle.add(value: value) == nil, "Value added within throttle interval is throttled.")
				mutableRandomNumberOfInstancesOfExpectedValues[value] = valueCount - 1
			}
		}
		return randomNumberOfInstancesOfExpectedValues
	}
}

extension Array where Element: Hashable {
	fileprivate func pairWithRandomNumber(max: Int) -> [Element: Int] {
		reduce(into: [Element: Int]()) {
			$0[$1] = Int.random(in: 0...max)
		}
	}
}
