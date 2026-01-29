//
//  CalendarModel.swift
//  Airtime Menu
//
//  Created by Claude on 15.12.25.
//

import AppKit
import Combine
import EventKit
import SwiftUI

@MainActor
final class CalendarModel: ObservableObject {
	// MARK: - Constants

	private enum Constants {
		static let timerInterval: TimeInterval = 60
		static let daysToFetch = 4
		static let happeningSoonThreshold: TimeInterval = 15 * 60
	}

	// MARK: - Static Formatters

	private static let shortDateFormatter: DateFormatter = {
		let formatter = DateFormatter()
		formatter.dateFormat = "MMM d"
		return formatter
	}()

	private static let weekdayFormatter: DateFormatter = {
		let formatter = DateFormatter()
		formatter.dateFormat = "EEEE, MMM d"
		return formatter
	}()

	// MARK: - Published Properties

	@Published private(set) var nextEvent: CalendarEvent?
	@Published private(set) var eventsByDay: [DaySection] = []
	@Published private(set) var isLoading = false

	@AppStorage("calendarEnabled") var calendarEnabled: Bool = true
	@AppStorage("enabledCalendarIdentifiers") private var enabledCalendarIdentifiersData: Data = Data()
	@AppStorage("dismissedEventIdentifiers") private var dismissedEventIdentifiersData: Data = Data()
	@AppStorage("lastDismissalCleanupDate") private var lastDismissalCleanupDate: Double = 0

	let calendarManager: CalendarManager

	// MARK: - Private Properties

	private var refreshTimer: Timer?
	private var cancellables = Set<AnyCancellable>()
	private let processEventsSubject = PassthroughSubject<Void, Never>()

	// Cached decoded identifiers
	private var cachedEnabledIdentifiers: Set<String>?
	private var cachedDismissedIdentifiers: Set<String>?

	struct DaySection: Identifiable {
		let id: Date
		let title: String
		let events: [CalendarEvent]
	}

	init(calendarManager: CalendarManager = CalendarManager()) {
		self.calendarManager = calendarManager

		// Debounce event processing to avoid rapid updates
		processEventsSubject
			.debounce(for: .milliseconds(100), scheduler: DispatchQueue.main)
			.sink { [weak self] in
				self?.performProcessEvents()
			}
			.store(in: &cancellables)

		calendarManager.$events
			.receive(on: DispatchQueue.main)
			.sink { [weak self] _ in
				self?.processEvents()
			}
			.store(in: &cancellables)

		cleanupOldDismissals()
	}

	deinit {
		refreshTimer?.invalidate()
	}

	func start() async {
		guard calendarEnabled else { return }

		if calendarManager.needsPermission {
			_ = await calendarManager.requestAccess()
		} else if calendarManager.hasAccess {
			calendarManager.loadCalendars()
			calendarManager.refreshEvents()
		}

		calendarManager.startMonitoring()
		startCountdownTimer()
	}

	func refresh() {
		guard calendarEnabled, calendarManager.hasAccess else { return }
		calendarManager.refreshEvents()
	}

	func startCountdownTimer() {
		refreshTimer?.invalidate()
		refreshTimer = Timer.scheduledTimer(withTimeInterval: 60, repeats: true) { [weak self] _ in
			Task { @MainActor in
				self?.processEvents()
			}
		}
	}

	func stopCountdownTimer() {
		refreshTimer?.invalidate()
		refreshTimer = nil
	}

	func stop() {
		stopCountdownTimer()
		calendarManager.stopMonitoring()
	}

	func handleCalendarEnabledChange(_ enabled: Bool) {
		if enabled {
			Task {
				await start()
			}
		} else {
			stop()
		}
	}

	func joinMeeting(_ event: CalendarEvent) {
		guard let meeting = event.meetingLink else { return }
		NSWorkspace.shared.open(meeting.url)
	}

	func openInCalendar(_ event: CalendarEvent) {
		let dateString = ISO8601DateFormatter().string(from: event.startDate)
		if let url = URL(string: "ical://\(dateString)") {
			NSWorkspace.shared.open(url)
		} else {
			openCalendarApp()
		}
	}

	func openCalendarApp() {
		if let calendarURL = NSWorkspace.shared.urlForApplication(withBundleIdentifier: "com.apple.iCal") {
			NSWorkspace.shared.open(calendarURL)
		}
	}

	func dismissEvent(_ event: CalendarEvent) {
		var dismissed = dismissedEventIdentifiers
		dismissed.insert(event.id)
		dismissedEventIdentifiers = dismissed
		processEvents()
	}

	func requestAccess() async {
		_ = await calendarManager.requestAccess()
	}

	private func processEvents() {
		processEventsSubject.send()
	}

	private func performProcessEvents() {
		let dismissed = dismissedEventIdentifiers
		let enabled = enabledCalendarIdentifiers

		let filteredEKEvents = calendarManager.events.filter { ekEvent in
			guard let eventId = ekEvent.eventIdentifier else { return false }
			if dismissed.contains(eventId) { return false }

			if !enabled.isEmpty {
				return enabled.contains(ekEvent.calendar.calendarIdentifier)
			}
			return true
		}

		let calendarEvents = filteredEKEvents.map { CalendarEvent(from: $0) }

		let upcomingEvents = calendarEvents.filter { !$0.hasEnded }

		nextEvent = upcomingEvents.first { !$0.isAllDay }

		eventsByDay = groupEventsByDay(upcomingEvents)
	}

	private func groupEventsByDay(_ events: [CalendarEvent]) -> [DaySection] {
		let calendar = Calendar.current
		var grouped: [Date: [CalendarEvent]] = [:]

		for event in events {
			let dayStart = calendar.startOfDay(for: event.startDate)
			grouped[dayStart, default: []].append(event)
		}

		let sortedDays = grouped.keys.sorted()
		let today = calendar.startOfDay(for: Date())

		return sortedDays.map { dayStart in
			let title = formatDayTitle(dayStart, relativeTo: today, calendar: calendar)
			let dayEvents = grouped[dayStart] ?? []
			return DaySection(id: dayStart, title: title, events: dayEvents)
		}
	}

	private func formatDayTitle(_ date: Date, relativeTo today: Date, calendar: Calendar) -> String {
		if calendar.isDate(date, inSameDayAs: today) {
			return "Today, \(Self.shortDateFormatter.string(from: date))"
		}

		if let tomorrow = calendar.date(byAdding: .day, value: 1, to: today),
		   calendar.isDate(date, inSameDayAs: tomorrow)
		{
			return "Tomorrow, \(Self.shortDateFormatter.string(from: date))"
		}

		return Self.weekdayFormatter.string(from: date)
	}

	// MARK: - Enabled Calendars Storage

	var enabledCalendarIdentifiers: Set<String> {
		get {
			if let cached = cachedEnabledIdentifiers {
				return cached
			}
			guard !enabledCalendarIdentifiersData.isEmpty,
			      let identifiers = try? JSONDecoder().decode(Set<String>.self, from: enabledCalendarIdentifiersData)
			else {
				return []
			}
			cachedEnabledIdentifiers = identifiers
			return identifiers
		}
		set {
			cachedEnabledIdentifiers = newValue
			if let data = try? JSONEncoder().encode(newValue) {
				enabledCalendarIdentifiersData = data
			}
		}
	}

	func setCalendarEnabled(_ identifier: String, enabled: Bool) {
		var identifiers = enabledCalendarIdentifiers
		if enabled {
			identifiers.insert(identifier)
		} else {
			identifiers.remove(identifier)
		}
		enabledCalendarIdentifiers = identifiers
		processEvents()
	}

	func isCalendarEnabled(_ identifier: String) -> Bool {
		let identifiers = enabledCalendarIdentifiers
		if identifiers.isEmpty {
			return true
		}
		return identifiers.contains(identifier)
	}

	// MARK: - Dismissed Events Storage

	private var dismissedEventIdentifiers: Set<String> {
		get {
			if let cached = cachedDismissedIdentifiers {
				return cached
			}
			guard !dismissedEventIdentifiersData.isEmpty,
			      let identifiers = try? JSONDecoder().decode(Set<String>.self, from: dismissedEventIdentifiersData)
			else {
				return []
			}
			cachedDismissedIdentifiers = identifiers
			return identifiers
		}
		set {
			cachedDismissedIdentifiers = newValue
			if let data = try? JSONEncoder().encode(newValue) {
				dismissedEventIdentifiersData = data
			}
		}
	}

	func clearDismissedEvents() {
		cachedDismissedIdentifiers = nil
		dismissedEventIdentifiersData = Data()
		processEvents()
	}

	/// Clears dismissed events at the start of each new day to prevent unbounded growth
	private func cleanupOldDismissals() {
		let today = Calendar.current.startOfDay(for: Date())
		let todayTimestamp = today.timeIntervalSince1970

		if lastDismissalCleanupDate < todayTimestamp {
			clearDismissedEvents()
			lastDismissalCleanupDate = todayTimestamp
		}
	}
}
