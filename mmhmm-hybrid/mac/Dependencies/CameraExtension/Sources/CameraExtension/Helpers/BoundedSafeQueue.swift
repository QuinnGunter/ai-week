//
//  BoundedSafeQueue.swift
//  CameraExtension
//
//  Created by Jakub Gluszkiewicz on 21/04/2023.
//
//  Simple implementation of a thread safe, bounded queue.
//  Behavior for capacity is based on a preservation policy.

import Foundation
import os

import CameraExtensionCommon
import Common

import DequeModule

/// A bounded FIFO queue, suitable to be accessed by concurrent threads.
public class BoundedSafeQueue<T> {
	/// The policy determining how a queue at capacity behaves when adding a new element.
	public enum PreservationPolicy {
		/// Add the new element, discard the oldest element.
		case newest
		/// Discard the new element, keep the oldest element.
		case oldest
		/// Add the new element by growing the queue.
		case grow
	}

	private let policy: PreservationPolicy
	private let backingStoreLock: UncheckedLockable
	private var backingStore: Deque<T>

	/// The queue's capacity.
	public let capacity: Int

	/// Creates a queue.
	///
	/// - Parameters:
	///   - capacity: The capacity determining how many elements the queue can store.
	///   - policy: The policy determining how elements exceeding the queue capacity are treated.
	/// - Throws: An error if `capacity` is smaller than 1.
	public init(capacity: Int = 200, policy: PreservationPolicy = .oldest) throws {
		guard capacity > 0 else {
			throw Error.invalidCapacity(capacity: capacity)
		}
		self.capacity = capacity
		self.policy = policy

		if #available(macOS 13.0, *) {
			backingStoreLock = OSAllocatedUnfairLock()
		} else {
			backingStoreLock = LegacyUnfairLock()
		}

		backingStore = Deque(minimumCapacity: capacity)
	}

	/// Adds a new value to the back of the queue.
	///
	/// - Parameter value: The value to add.
	/// - Throws: An error when dropping an element due to maximum capacity.
	public func enqueue(_ value: T) throws {
		try backingStoreLock.withLockUnchecked {
			let count: Int = backingStore.count

			precondition(count <= capacity, "Precondition violated: count can't exceed capacity")

			if count == capacity {
				switch policy {
				case .newest:
					let dropped: T = backingStore.removeFirst()
					backingStore.append(value)
					throw Error.queueIsFull(dropped: dropped)
				case .oldest:
					throw Error.queueIsFull(dropped: value)
				case .grow:
					break
				}
			}

			backingStore.append(value)
		}
	}

	/// Removes an element from the front of the queue.
	///
	/// - Returns: The removed element or `nil`, if the queue is empty.
	public func dequeue() -> T? {
		backingStoreLock.withLockUnchecked {
			backingStore.popFirst()
		}
	}

	public typealias DequeuePredicate = (Int) -> Bool

	/// Removes an element from the front of the queue if the specified predicate is satisfied.
	///
	/// - Parameter countPredicate: A closure receiving the queue's current count as an input argument.
	/// - Returns: The removed element or `nil`, if either the queue is empty or the predicate was not satisfied.
	public func dequeue(countPredicate: DequeuePredicate) -> T? {
		backingStoreLock.withLockUnchecked {
			countPredicate(backingStore.count) ? backingStore.popFirst() : nil
		}
	}
}

extension BoundedSafeQueue {
	public enum Error: BaseErrorWithAssociatedValues {
		case invalidCapacity(capacity: Int)
		// The optional is necessary to make `CaseIterable` conformance feasible with a generic error type.
		case queueIsFull(dropped: T?)
	}
}

extension BoundedSafeQueue.Error {
	public static var domain: String { "CameraExtension.BoundedSafeQueue" }

	public var errorMessage: String {
		switch self {
		case let .invalidCapacity(capacity): "Invalid capacity: \(capacity)"
		case let .queueIsFull(dropped): "Full queue dropped: \(String(describing: dropped))"
		}
	}

	public static var allCases: [BoundedSafeQueue.Error] { [
		.invalidCapacity(capacity: 0),
		.queueIsFull(dropped: nil),
	] }
}
