//
//  BoundedSafeQueueTests.swift
//  CameraExtensionTests
//
//  Created by Beni Federer on 25.10.23.
//

import XCTest

@testable import CameraExtension

final class BoundedSafeQueueTests: XCTestCase {
	// MARK: - Instantiation

	func testThatDefaultInstantiationSucceeds() throws {
		XCTAssertNoThrow(try BoundedSafeQueue<Int>())
	}

	func testThatNonPositiveCapacityFails() throws {
		XCTAssertThrowsError(try BoundedSafeQueue<Int>(capacity: 0)) { error in
			guard case BoundedSafeQueue<Int>.Error.invalidCapacity = error else {
				return XCTFail("Non-positive capacity must throw invalidCapacity.")
			}
		}
	}

	// MARK: - Basic queueing

	func testThatElementIdentityIsGiven() throws {
		let capacity: Int = 10
		let queue = try BoundedSafeQueue<Int>(capacity: capacity)
		for value in 0..<capacity {
			try queue.enqueue(value)
			XCTAssertEqual(queue.dequeue(), value)
		}
	}

	func testThatQueueingSucceeds() throws {
		let queue = try BoundedSafeQueue<Int>()
		try queue.enqueue(.random(in: .min...Int.max))
		XCTAssertNotNil(queue.dequeue())
	}

	func testThatDequeueingFromEmptyQueueReturnsNil() throws {
		let queue = try BoundedSafeQueue<Int>()
		XCTAssertNil(queue.dequeue())
	}

	func testThatDequeueEmptiesQueue() throws {
		let queue = try BoundedSafeQueue<Int>(capacity: 10)
		for value in 0..<queue.capacity {
			try queue.enqueue(value)
		}
		for _ in 0..<queue.capacity {
			XCTAssertNotNil(queue.dequeue())
		}
		XCTAssertNil(queue.dequeue())
	}

	func testThatEnqueueingToFullQueueThrows() throws {
		let queue = try BoundedSafeQueue<Int>(capacity: 10)
		for value in 0..<queue.capacity {
			try queue.enqueue(value)
		}
		XCTAssertThrowsError(try queue.enqueue(0)) { error in
			guard case BoundedSafeQueue<Int>.Error.queueIsFull = error else {
				return XCTFail("Enqueuing to full queue must throw queueIsFull.")
			}
		}
	}

	func testThatQueueingDoesNotThrow() throws {
		let queue = try BoundedSafeQueue<Int>()
		XCTAssertNoThrow(try queue.enqueue(.random(in: .min...Int.max)))
		XCTAssertNotNil(queue.dequeue())
	}

	// MARK: - PreservationPolicy

	func testThatNewestPolicyThrowsOldest() throws {
		let first: Int = 0
		let second: Int = 1
		let queue = try BoundedSafeQueue<Int>(capacity: 1, policy: .newest)
		XCTAssertNoThrow(try queue.enqueue(first))
		XCTAssertThrowsError(try queue.enqueue(second)) { error in
			guard case let BoundedSafeQueue<Int>.Error.queueIsFull(dropped) = error else {
				return XCTFail("Enqueuing to full queue must throw queueIsFull.")
			}
			XCTAssertEqual(dropped, first)
		}
	}

	func testThatOldestPolicyThrowsNewest() throws {
		let first: Int = 0
		let second: Int = 1
		let queue = try BoundedSafeQueue<Int>(capacity: 1, policy: .oldest)
		XCTAssertNoThrow(try queue.enqueue(first))
		XCTAssertThrowsError(try queue.enqueue(second)) { error in
			guard case let BoundedSafeQueue<Int>.Error.queueIsFull(dropped) = error else {
				return XCTFail("Enqueuing to full queue must throw queueIsFull.")
			}
			XCTAssertEqual(dropped, second)
		}
	}

	func testThatGrowPolicyDoesNotThrow() throws {
		let first: Int = 0
		let second: Int = 1
		let queue = try BoundedSafeQueue<Int>(capacity: 1, policy: .grow)
		XCTAssertNoThrow(try queue.enqueue(first))
		XCTAssertNoThrow(try queue.enqueue(second))
	}
}
