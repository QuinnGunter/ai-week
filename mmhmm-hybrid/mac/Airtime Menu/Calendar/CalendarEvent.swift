//
//  CalendarEvent.swift
//  Airtime Menu
//
//  Created by Claude on 15.12.25.
//

import EventKit
import SwiftUI

struct CalendarEvent: Identifiable, Equatable {
	let id: String
	let title: String
	let startDate: Date
	let endDate: Date
	let isAllDay: Bool
	let calendarColor: Color
	let calendarTitle: String
	let calendarIdentifier: String
	let meetingLink: MeetingLinkDetector.DetectedMeeting?
	let location: String?

	init(from ekEvent: EKEvent) {
		self.id = ekEvent.eventIdentifier ?? UUID().uuidString
		self.title = ekEvent.title ?? "Untitled Event"
		self.startDate = ekEvent.startDate
		self.endDate = ekEvent.endDate
		self.isAllDay = ekEvent.isAllDay
		self.calendarColor = Color(cgColor: ekEvent.calendar.cgColor)
		self.calendarTitle = ekEvent.calendar.title
		self.calendarIdentifier = ekEvent.calendar.calendarIdentifier
		self.meetingLink = MeetingLinkDetector.detectMeetingLink(in: ekEvent)
		self.location = ekEvent.location
	}

	var timeUntilStart: TimeInterval {
		startDate.timeIntervalSince(Date())
	}

	var isHappeningSoon: Bool {
		let fifteenMinutes: TimeInterval = 15 * 60
		return timeUntilStart > 0 && timeUntilStart <= fifteenMinutes
	}

	var isHappeningNow: Bool {
		let now = Date()
		return now >= startDate && now < endDate
	}

	var hasEnded: Bool {
		Date() >= endDate
	}

	var formattedTimeRange: String {
		let formatter = DateFormatter()
		formatter.timeStyle = .short
		formatter.dateStyle = .none
		return "\(formatter.string(from: startDate)) - \(formatter.string(from: endDate))"
	}

	var formattedCountdown: String {
		let interval = timeUntilStart

		if interval <= 0 {
			if isHappeningNow {
				return "now"
			}
			return "ended"
		}

		let minutes = Int(interval / 60)
		let hours = minutes / 60
		let days = hours / 24

		if days > 0 {
			return "in \(days)d"
		} else if hours > 0 {
			let remainingMinutes = minutes % 60
			if remainingMinutes > 0 {
				return "in \(hours)h \(remainingMinutes)m"
			}
			return "in \(hours)h"
		} else {
			return "in \(minutes)m"
		}
	}

	static func == (lhs: CalendarEvent, rhs: CalendarEvent) -> Bool {
		lhs.id == rhs.id &&
			lhs.title == rhs.title &&
			lhs.startDate == rhs.startDate &&
			lhs.endDate == rhs.endDate &&
			lhs.isAllDay == rhs.isAllDay &&
			lhs.calendarIdentifier == rhs.calendarIdentifier &&
			lhs.meetingLink == rhs.meetingLink &&
			lhs.location == rhs.location
	}
}
