//
//  UserNotifier.swift
//  mmhmm
//
//  Created by Beni Federer on 26.05.25.
//

import UserNotifications

struct UserNotifier {
	private var notificationCenter: UNUserNotificationCenter {
		UNUserNotificationCenter.current()
	}

	func requestPermission() async {
		do {
			let result = try await notificationCenter.requestAuthorization(options: [.alert, .sound])
			if result {
				Logger.logMessage("User granted notification permission.", level: .info)
			} else {
				Logger.logMessage("User denied notification permission.", level: .info)
			}
		} catch {
			Logger.logError(error, messagePrefix: "Failed to request notification permission")
		}
	}

	func postNotification(title: String, body: String) async {
		guard await notificationCenter.notificationSettings().authorizationStatus == .authorized else {
			Logger.logMessage("Notification permission was denied, skipping post.", level: .info)
			return
		}

		let content = UNMutableNotificationContent()
		content.title = title
		content.body = body

		let request = UNNotificationRequest(
			identifier: UUID().uuidString,
			content: content,
			trigger: nil
		)

		do {
			try await notificationCenter.add(request)
			Logger.logMessage("Posted notification.", level: .info)
		} catch {
			Logger.logError(error, messagePrefix: "Failed to post notification")
		}
	}
}
