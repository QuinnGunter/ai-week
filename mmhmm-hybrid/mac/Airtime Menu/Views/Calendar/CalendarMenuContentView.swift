//
//  CalendarMenuContentView.swift
//  Airtime Menu
//
//  Created by Claude on 15.12.25.
//

import SwiftUI

struct CalendarMenuContentView: View {
	@ObservedObject var model: CalendarModel

	var body: some View {
		Group {
			if !model.calendarEnabled {
				CalendarDisabledView()
			} else if model.calendarManager.isDenied {
				CalendarPermissionDeniedView()
			} else if model.calendarManager.needsPermission {
				CalendarPermissionRequestView(model: model)
			} else {
				calendarContent
			}
		}
	}

	@ViewBuilder
	private var calendarContent: some View {
		if model.isLoading {
			HStack {
				ProgressView()
					.scaleEffect(0.7)
				Text("Loading events...")
					.foregroundStyle(.secondary)
			}
			.padding(.vertical, 8)
		} else {
			if let nextEvent = model.nextEvent, nextEvent.isHappeningSoon || nextEvent.isHappeningNow {
				CurrentEventActionsView(event: nextEvent, model: model)
				Divider()
			}

			if model.eventsByDay.isEmpty {
				Text("No upcoming events")
					.foregroundStyle(.secondary)
					.padding(.vertical, 8)
			} else {
				ForEach(model.eventsByDay) { section in
					DaySectionView(section: section, model: model)
				}
			}
		}

		Divider()

		Button("Open Calendar") {
			model.openCalendarApp()
		}
		.keyboardShortcut("o")
	}
}

struct CalendarDisabledView: View {
	var body: some View {
		VStack(spacing: 8) {
			Image(systemName: "calendar.badge.minus")
				.font(.title)
				.foregroundStyle(.secondary)
			Text("Calendar is disabled")
				.font(.headline)
			Text("Enable calendar in Settings")
				.font(.caption)
				.foregroundStyle(.secondary)
		}
		.padding()
	}
}

struct CalendarPermissionDeniedView: View {
	var body: some View {
		VStack(spacing: 8) {
			Image(systemName: "calendar.badge.exclamationmark")
				.font(.title)
				.foregroundStyle(.secondary)
			Text("Calendar Access Denied")
				.font(.headline)
			Text("Grant access in System Settings > Privacy & Security > Calendars")
				.font(.caption)
				.foregroundStyle(.secondary)
				.multilineTextAlignment(.center)

			Button("Open System Settings") {
				if let url = CalendarManager.calendarPrivacySettingsURL {
					NSWorkspace.shared.open(url)
				}
			}
			.padding(.top, 4)
		}
		.padding()
	}
}

struct CalendarPermissionRequestView: View {
	@ObservedObject var model: CalendarModel

	var body: some View {
		VStack(spacing: 8) {
			Image(systemName: "calendar")
				.font(.title)
				.foregroundStyle(.secondary)
			Text("Calendar Access")
				.font(.headline)
			Text("Allow access to show your upcoming events")
				.font(.caption)
				.foregroundStyle(.secondary)
				.multilineTextAlignment(.center)

			Button("Allow Access") {
				Task {
					await model.requestAccess()
				}
			}
			.buttonStyle(.borderedProminent)
			.padding(.top, 4)
		}
		.padding()
	}
}
