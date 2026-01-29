//
//  CalendarSettingsView.swift
//  Airtime Menu
//
//  Created by Claude on 15.12.25.
//

import SwiftUI

struct CalendarSettingsView: View {
	@ObservedObject var calendarModel: CalendarModel

	var body: some View {
		VStack(alignment: .leading, spacing: 12) {
			Toggle("Show calendar in menu bar", isOn: $calendarModel.calendarEnabled)

			if calendarModel.calendarEnabled {
				if calendarModel.calendarManager.hasAccess {
					calendarsList
				} else if calendarModel.calendarManager.isDenied {
					permissionDeniedView
				} else {
					requestPermissionButton
				}
			}
		}
	}

	@ViewBuilder
	private var calendarsList: some View {
		if calendarModel.calendarManager.calendars.isEmpty {
			Text("No calendars found")
				.foregroundStyle(.secondary)
				.font(.caption)
		} else {
			VStack(alignment: .leading, spacing: 8) {
				Text("Calendars to display:")
					.font(.caption)
					.foregroundStyle(.secondary)

				ForEach(calendarModel.calendarManager.calendars, id: \.calendarIdentifier) { calendar in
					HStack(spacing: 8) {
						Circle()
							.fill(Color(cgColor: calendar.cgColor))
							.frame(width: 10, height: 10)

						Toggle(calendar.title, isOn: Binding(
							get: { calendarModel.isCalendarEnabled(calendar.calendarIdentifier) },
							set: { calendarModel.setCalendarEnabled(calendar.calendarIdentifier, enabled: $0) }
						))
					}
				}
			}
		}
	}

	private var permissionDeniedView: some View {
		VStack(alignment: .leading, spacing: 8) {
			Text("Calendar access is denied")
				.foregroundStyle(.secondary)
				.font(.caption)

			Button("Open System Settings") {
				if let url = CalendarManager.calendarPrivacySettingsURL {
					NSWorkspace.shared.open(url)
				}
			}
			.buttonStyle(.link)
		}
	}

	private var requestPermissionButton: some View {
		Button("Grant Calendar Access") {
			Task {
				await calendarModel.requestAccess()
			}
		}
	}
}
