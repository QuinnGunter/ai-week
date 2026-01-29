//
//  CalendarManager.swift
//  Airtime Menu
//
//  Created by Claude on 15.12.25.
//

import Combine
@preconcurrency import EventKit
import Foundation

@MainActor
final class CalendarManager: ObservableObject {
	// MARK: - Constants

	static let calendarPrivacySettingsURL = URL(string: "x-apple.systempreferences:com.apple.preference.security?Privacy_Calendars")

	// MARK: - Private Properties

	private let eventStore = EKEventStore()
	private var notificationObserver: NSObjectProtocol?

	// MARK: - Published Properties

	@Published private(set) var authorizationStatus: EKAuthorizationStatus
	@Published private(set) var events: [EKEvent] = []
	@Published private(set) var calendars: [EKCalendar] = []

	init() {
		self.authorizationStatus = EKEventStore.authorizationStatus(for: .event)
	}

	deinit {
		if let observer = notificationObserver {
			NotificationCenter.default.removeObserver(observer)
		}
	}

	func requestAccess() async -> Bool {
		do {
			let granted: Bool
			if #available(macOS 14.0, *) {
				granted = try await eventStore.requestFullAccessToEvents()
			} else {
				granted = try await eventStore.requestAccess(to: .event)
			}

			authorizationStatus = EKEventStore.authorizationStatus(for: .event)
			if granted {
				loadCalendars()
				refreshEvents()
			}
			return granted
		} catch {
			print("[CalendarManager] Failed to request calendar access: \(error.localizedDescription)")
			authorizationStatus = EKEventStore.authorizationStatus(for: .event)
			return false
		}
	}

	func refreshEvents() {
		guard hasAccess else {
			events = []
			return
		}

		let startDate = Calendar.current.startOfDay(for: Date())
		guard let endDate = Calendar.current.date(byAdding: .day, value: 4, to: startDate) else {
			return
		}

		// Capture eventStore reference for background work
		let store = eventStore

		Task.detached(priority: .userInitiated) {
			let predicate = store.predicateForEvents(withStart: startDate, end: endDate, calendars: nil)
			let fetchedEvents = store.events(matching: predicate)
			let sortedEvents = fetchedEvents.sorted { $0.startDate < $1.startDate }

			await MainActor.run {
				self.events = sortedEvents
			}
		}
	}

	func loadCalendars() {
		guard hasAccess else {
			calendars = []
			return
		}

		calendars = eventStore.calendars(for: .event).sorted { $0.title < $1.title }
	}

	func startMonitoring() {
		guard notificationObserver == nil else { return }

		notificationObserver = NotificationCenter.default.addObserver(
			forName: .EKEventStoreChanged,
			object: eventStore,
			queue: .main
		) { [weak self] _ in
			Task { @MainActor in
				self?.loadCalendars()
				self?.refreshEvents()
			}
		}
	}

	func stopMonitoring() {
		if let observer = notificationObserver {
			NotificationCenter.default.removeObserver(observer)
			notificationObserver = nil
		}
	}

	var hasAccess: Bool {
		if #available(macOS 14.0, *) {
			return authorizationStatus == .fullAccess
		} else {
			return authorizationStatus == .authorized
		}
	}

	var needsPermission: Bool {
		authorizationStatus == .notDetermined
	}

	var isDenied: Bool {
		authorizationStatus == .denied || authorizationStatus == .restricted
	}
}
