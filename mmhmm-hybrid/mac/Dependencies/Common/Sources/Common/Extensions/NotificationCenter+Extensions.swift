//
//  NotificationCenter+Extensions.swift
//  Common
//
//  Created by Beni Federer on 03.02.25.
//

import Combine
import Foundation

extension NotificationCenter {
	/// Registers a notification handler on the `MainActor` as a `Combine` listener.
	///
	/// - Parameters:
	///   - notificationName: The notification to handle.
	///   - subscriptions: A `Set<AnyCancellable>` to add the notification handler to.
	///   - handler: The closure to call with the notification.
	@MainActor public func registerHandler(forNotificationWithName notificationName: Notification.Name,
										   subscriptions: inout Set<AnyCancellable>,
										   handler: @escaping (Notification) -> Void) {
		publisher(for: notificationName)
			.receive(on: DispatchQueue.main)
			.sink(receiveValue: { notification in
				MainActor.assumeIsolated { handler(notification) }
			})
			.store(in: &subscriptions)
	}
}
