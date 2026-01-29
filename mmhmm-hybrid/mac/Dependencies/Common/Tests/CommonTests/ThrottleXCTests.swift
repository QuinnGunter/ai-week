//
//  ThrottleXCTests.swift
//
//
//  Created by Beni Federer on 14.11.23.
//

@testable import Common

import XCTest

final class ThrottleTests: XCTestCase {
	private typealias ThrottledValueResult = Throttle.ThrottledValueResult<String>

	static let throttleInterval: TimeInterval = 1.0
	static let expectedValue: String = "test"
	static let otherExpectedValue: String = "other test"

	var throttle: Throttle.MultipleValues<String>!

	override func setUpWithError() throws {
		throttle = Throttle.MultipleValues<String>(throttleInterval: Self.throttleInterval)
	}

	override func tearDownWithError() throws {}

	func testThatFirstAddedValueIsNotThrottled() throws {
		let expectedValueCount: Int = 0
		let firstResult: ThrottledValueResult? = throttle.add(value: Self.expectedValue)

		XCTAssertNotNil(firstResult)
		XCTAssertEqual(firstResult.unsafelyUnwrapped.0, Self.expectedValue)
		XCTAssertEqual(firstResult.unsafelyUnwrapped.1, expectedValueCount)
	}

	func testThatSecondAddedValueIsThrottled() throws {
		throttle.add(value: Self.expectedValue)
		let secondResult: ThrottledValueResult? = throttle.add(value: Self.expectedValue)

		XCTAssertNil(secondResult)
	}

	func testThatThrottledValueCountIsCorrect() throws {
		let throttledValueCount: Int = 10
		let expectedValueCount: Int = throttledValueCount

		// First value is not being throttled.
		throttle.add(value: Self.expectedValue)

		// Following values within the throttle interval are being throttled.
		for _ in 0..<throttledValueCount {
			throttle.add(value: Self.expectedValue)
		}

		Thread.sleep(forTimeInterval: Self.throttleInterval)

		// First Value following the throttle interval is not being throttled.
		let pastThrottleIntervalResult: ThrottledValueResult? = throttle.add(value: Self.expectedValue)

		XCTAssertNotNil(pastThrottleIntervalResult)
		XCTAssertEqual(pastThrottleIntervalResult.unsafelyUnwrapped.0, Self.expectedValue)
		XCTAssertEqual(pastThrottleIntervalResult.unsafelyUnwrapped.1, expectedValueCount)
	}

	func testThatTwoDifferentValuesCanBeAddedSimultaneously() throws {
		let expectedValueCount: Int = 0
		let firstResult: ThrottledValueResult? = throttle.add(value: Self.expectedValue)

		let otherExpectedValueCount: Int = 0
		let otherFirstResult: ThrottledValueResult? = throttle.add(value: Self.otherExpectedValue)

		XCTAssertNotNil(firstResult)
		XCTAssertEqual(firstResult.unsafelyUnwrapped.0, Self.expectedValue)
		XCTAssertEqual(firstResult.unsafelyUnwrapped.1, expectedValueCount)

		XCTAssertNotNil(otherFirstResult)
		XCTAssertEqual(otherFirstResult.unsafelyUnwrapped.0, Self.otherExpectedValue)
		XCTAssertEqual(otherFirstResult.unsafelyUnwrapped.1, otherExpectedValueCount)
	}

	func testThatTwoDifferentValuesAreThrottledSimultaneously() throws {
		let throttledValueCount: Int = 10
		let expectedValueCount: Int = throttledValueCount

		let otherThrottledValueCount: Int = 3
		let otherExpectedValueCount: Int = otherThrottledValueCount

		throttle.add(value: Self.expectedValue)
		throttle.add(value: Self.otherExpectedValue)

		for _ in 0..<throttledValueCount {
			throttle.add(value: Self.expectedValue)
		}

		for _ in 0..<otherThrottledValueCount {
			throttle.add(value: Self.otherExpectedValue)
		}

		Thread.sleep(forTimeInterval: Self.throttleInterval)

		let pastThrottleIntervalResult: ThrottledValueResult? = throttle.add(value: Self.expectedValue)
		let otherPastThrottleIntervalResult: ThrottledValueResult? = throttle.add(value: Self.otherExpectedValue)

		XCTAssertNotNil(pastThrottleIntervalResult)
		XCTAssertEqual(pastThrottleIntervalResult.unsafelyUnwrapped.0, Self.expectedValue)
		XCTAssertEqual(pastThrottleIntervalResult.unsafelyUnwrapped.1, expectedValueCount)

		XCTAssertNotNil(otherPastThrottleIntervalResult)
		XCTAssertEqual(otherPastThrottleIntervalResult.unsafelyUnwrapped.0, Self.otherExpectedValue)
		XCTAssertEqual(otherPastThrottleIntervalResult.unsafelyUnwrapped.1, otherExpectedValueCount)
	}
}

final class StringThrottleTests: XCTestCase {
	static let throttleInterval: TimeInterval = 1.0
	static let expectedValue: String = "test"

	var throttle: Throttle.StringContainingSubstring!

	override func setUpWithError() throws {
		// A string throttled down from 5 occurrences is expected to be returned as "The throttled string (5)".
		throttle = Throttle.StringContainingSubstring(throttledValue: Self.expectedValue, throttleInterval: Self.throttleInterval) { $0.0 + "(\($0.1))" }
	}

	override func tearDownWithError() throws {}

	func testThatUnthrottledValuesPassThrough() throws {
		let firstExpectedValue: String = "Mario"
		let secondExpectedValue: String = "Luigi"
		let firstResult: String? = throttle.add(value: firstExpectedValue)
		let secondResult: String? = throttle.add(value: secondExpectedValue)

		XCTAssertNotNil(firstResult)
		XCTAssertEqual(firstResult.unsafelyUnwrapped, firstExpectedValue)

		XCTAssertNotNil(secondResult)
		XCTAssertEqual(secondResult.unsafelyUnwrapped, secondExpectedValue)
	}

	func testThatFirstAddedValueIsNotThrottled() throws {
		let expectedValueCount: Int = 0
		let expectedResult: String = Self.expectedValue + "(\(expectedValueCount))"
		let firstResult: String? = throttle.add(value: Self.expectedValue)

		XCTAssertNotNil(firstResult)
		XCTAssertEqual(firstResult.unsafelyUnwrapped, expectedResult)
	}

	func testThatSecondAddedValueIsThrottled() throws {
		throttle.add(value: Self.expectedValue)
		let secondResult: String? = throttle.add(value: Self.expectedValue)

		XCTAssertNil(secondResult)
	}

	func testThatThrottledValueCountIsCorrect() throws {
		let throttledValueCount: Int = 10
		let expectedValueCount: Int = throttledValueCount + 0
		let expectedResult: String = Self.expectedValue + "(\(expectedValueCount))"

		// First value is not being throttled.
		throttle.add(value: Self.expectedValue)

		// Following values within the throttle interval are being throttled.
		for _ in 0..<throttledValueCount {
			let result = throttle.add(value: Self.expectedValue)

			// Values being throttled are expected to return nil.
			XCTAssertNil(result)
		}

		Thread.sleep(forTimeInterval: Self.throttleInterval)

		// First Value following the throttle interval is not being throttled.
		let pastThrottleIntervalResult: String? = throttle.add(value: Self.expectedValue)

		XCTAssertNotNil(pastThrottleIntervalResult)
		XCTAssertEqual(pastThrottleIntervalResult.unsafelyUnwrapped, expectedResult)
	}

	func testThatThrottledContainingValueCountIsCorrect() throws {
		let throttledValueCount: Int = 10
		let expectedValueCount: Int = throttledValueCount
		let expectedResult: String = Self.expectedValue + "(\(expectedValueCount))"

		// First value is not being throttled.
		throttle.add(value: Self.expectedValue)

		// Following values within the throttle interval are being throttled.
		for index: Int in 0..<throttledValueCount {
			let valueToAdd = Self.expectedValue + "_\(index)_"
			let result = throttle.add(value: valueToAdd)

			// Values being throttled are expected to return nil.
			XCTAssertNil(result)
		}

		Thread.sleep(forTimeInterval: Self.throttleInterval)

		// First Value following the throttle interval is not being throttled.
		let pastThrottleIntervalResult: String? = throttle.add(value: Self.expectedValue)

		XCTAssertNotNil(pastThrottleIntervalResult)
		XCTAssertEqual(pastThrottleIntervalResult.unsafelyUnwrapped, expectedResult)
	}
}

final class StringThrottleProtocolTests: XCTestCase {
	static let expectedValue: String = "test"

	var throttle: (any StringThrottleProtocol)!

	override func setUpWithError() throws {
		throttle = Throttle.Passthrough()
	}

	func testThatStringThrottleProtocolResolves() throws {
		XCTAssertEqual(throttle.add(value: Self.expectedValue), Self.expectedValue)

		// Create a different throttle and call through the same protocol.

		let decoration: String = " throttled: "
		let expectedResult: String? = Self.expectedValue + decoration + "0"

		throttle = Throttle.FilteredValue<String>(throttledValue: Self.expectedValue, throttleInterval: 1.0) { "\($0.0)\(decoration)\($0.1)" }
		XCTAssertEqual(throttle.add(value: Self.expectedValue), expectedResult)
		XCTAssertEqual(throttle.add(value: Self.expectedValue), nil)
	}
}
