//
//  LockingPropertyWrapper.swift
//  CameraExtension
//
//  Created by Beni Federer on 30.10.23.
//

import Foundation
import os

/// The legacy `os_unfair_lock` wrapped as a Swift class.
///
/// - Important: Only use this on OS versions that don't support `OSAllocatedUnfairLock` natively.
/// - Note: Refer to http://russbishop.net/the-law for details on the pitfalls circumvented by this implementation.
final class LegacyUnfairLock {
	private var lock: UnsafeMutablePointer<os_unfair_lock>

	init() {
		lock = UnsafeMutablePointer<os_unfair_lock>.allocate(capacity: 1)
		lock.initialize(to: os_unfair_lock())
	}

	deinit {
		lock.deallocate()
	}

	func withLockUnchecked<R>(_ body: () throws -> R) rethrows -> R {
		os_unfair_lock_lock(lock)
		defer { os_unfair_lock_unlock(lock) }
		return try body()
	}
}

protocol UncheckedLockable {
	func withLockUnchecked<R>(_ body: () throws -> R) rethrows -> R
}

@available(macOS 13.0, *)
extension OSAllocatedUnfairLock<Void>: UncheckedLockable {}
extension LegacyUnfairLock: UncheckedLockable {}

@propertyWrapper struct UnfairLocking<Value> {
	private let lock: UncheckedLockable
	private var value: Value

	init(wrappedValue: Value) {
		if #available(macOS 13.0, *) {
			lock = OSAllocatedUnfairLock()
		} else {
			lock = LegacyUnfairLock()
		}
		value = wrappedValue
	}

	var wrappedValue: Value {
		get {
			lock.withLockUnchecked { value }
		}
		set {
			lock.withLockUnchecked { value = newValue }
		}
	}
}
