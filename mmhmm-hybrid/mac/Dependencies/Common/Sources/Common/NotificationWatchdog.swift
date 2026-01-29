//
//  NotificationWatchdog.swift
//  Common
//
//  Created by Beni Federer on 03.02.25.
//

import Combine
import Foundation

/// Reports whether a notification was sent by `NotificationCenter.default`
/// within a specified timeout.
public actor NotificationWatchdog {
	/// Receives a boolean indicating if the notification to watch for
	/// was called within the specified timeout, or an error.
	public typealias Handler = (Result<Bool, Error>) -> Void

	/// Stores a notification listening subscription for the duration
	/// of the timeout.
	@MainActor private var subscriptions: Set<AnyCancellable> = []

	private var handler: Handler?
	private var timeoutTask: Task<Void, Never>?

	/// Creates an instance.
	///
	/// - Parameters:
	///   - notificationName: The notification to watch out for.
	///   - timeout: The maximum duration to wait before `handler` is
	///              called with the result.
	///   - handler: The closure to call with the result when either
	///              the notification was received or the timeout or an
	///              error occurred.
	public init(notificationName: Notification.Name,
				timeout: ContinuousClock.Instant.Duration = .seconds(1),
				handler: @escaping Handler) async {
		self.handler = handler

		timeoutTask = Task {
			do {
				try await Task.sleep(for: timeout, tolerance: .zero)
				guard Task.isCancelled == false else { return }
				await reportResult(.success(false))
			} catch {
				await reportResult(.failure(error))
			}
		}

		await MainActor.run {
			NotificationCenter
				.default
				.registerHandler(forNotificationWithName: notificationName,
								 subscriptions: &subscriptions) { [weak self] _ in
					guard let self else { return }
					Task { await reportResult(.success(true)) }
				}
		}
	}

	private func reportResult(_ result: Result<Bool, Error>) async {
		timeoutTask?.cancel()
		await MainActor.run { subscriptions.removeAll() }
		guard let handler else { return }
		handler(result)
		self.handler = nil
	}
}
