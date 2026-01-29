//
//  Concurrency+Extensions.swift
//  Common
//
//  Created by Beni Federer on 02.06.25.
//

import Foundation

public enum TimeoutError: Error {
	case timedOut
	case unexpectedResult
}

/// Invokes the passed in closure with a checked continuation for the current task
/// and times out if the continuation is not called within the specified interval.
///
/// - Parameters:
///   - timeout: The timeout.
///   - body: A closure that takes a `CheckedContinuation` parameter.
/// - Throws: Errors thrown out of `body` or a `TimeoutError`.
/// - Returns: The value continuation is resumed with.
///
/// - SeeAlso: `withCheckedThrowingContinuation(function:_:)`
public func withCheckedThrowingContinuation<T: Sendable>(
	timeout: Duration,
	body: @escaping @Sendable (CheckedContinuation<T, any Error>) -> Void
) async throws -> T {
	try await withThrowingTaskGroup(of: T.self) { group in
		group.addTask {
			try await withCheckedThrowingContinuation(body)
		}

		group.addTask {
			try await Task.sleep(for: timeout)
			throw TimeoutError.timedOut
		}

		guard let result: T = try await group.next() else {
			// `next()` must return a non-`nil` value for any non-empty task group.
			throw TimeoutError.unexpectedResult
		}

		group.cancelAll()

		return result
	}
}
