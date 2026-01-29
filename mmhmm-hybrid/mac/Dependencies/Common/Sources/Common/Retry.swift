//
//  Retry.swift
//  Common
//
//  Created by Beni Federer on 10.04.25.
//

import Foundation

public struct Retry<T: Sendable> {
	public typealias Closure = @Sendable () async throws -> T?

	public let logIdentifier: String
	public let closure: Closure

	public init(logIdentifier: String, closure: @escaping Closure) {
		self.logIdentifier = logIdentifier
		self.closure = closure
	}

	/// Repeatedly attempts to retrieve `T`.
	///
	/// Retries while `closure` does not throw an error and returns `nil`.
	///
	/// - Parameters:
	///   - attempts: The number of attempts to make retrieving `T`. Defaults to 60.
	///   - interval: The time interval in between attempts. Defaults to 1 second.
	/// - Returns: `T`.
	/// - Throws: Rethrows errors thrown by `closure` or a `RetryError`.
	public func attempt(_ attempts: Int = 60, interval: ContinuousClock.Instant.Duration = .seconds(1)) async throws -> T {
		guard attempts > 0 else {
			throw RetryError.invalidAttempts(attempts: attempts, logIdentifier: logIdentifier)
		}

		var attemptCount: Int = 0

		while true {
			if let result: T = try await closure() {
				return result
			}

			attemptCount += 1

			guard attemptCount < attempts else {
				throw RetryError.retryFailed(logIdentifier: logIdentifier)
			}

			try await Task.sleep(for: interval)
		}
	}
}

/// Not a member of `Retry` because Swift does not currently support static members in generic types.
public enum RetryError {
	case retryFailed(logIdentifier: String)
	case invalidAttempts(attempts: Int, logIdentifier: String)
}

extension RetryError: BaseErrorWithAssociatedValues {
	public static let allCases: [RetryError] = [
		.retryFailed(logIdentifier: ""),
		.invalidAttempts(attempts: 0, logIdentifier: ""),
	]

	public static let domain: String = String(describing: Self.self)

	public var errorMessage: String {
		switch self {
		case let .retryFailed(logIdentifier): "Retry of \(logIdentifier) failed after all attempts."
		case let .invalidAttempts(attempts, logIdentifier): "Retry of \(logIdentifier) failed with invalid attempt count: \(attempts)."
		}
	}
}
