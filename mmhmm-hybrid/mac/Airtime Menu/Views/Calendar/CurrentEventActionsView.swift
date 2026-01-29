//
//  CurrentEventActionsView.swift
//  Airtime Menu
//
//  Created by Claude on 15.12.25.
//

import SwiftUI

struct CurrentEventActionsView: View {
	let event: CalendarEvent
	@ObservedObject var model: CalendarModel

	var body: some View {
		VStack(alignment: .leading, spacing: 4) {
			HStack(spacing: 8) {
				Circle()
					.fill(event.calendarColor)
					.frame(width: 8, height: 8)
					.accessibilityHidden(true)

				Text(event.title)
					.fontWeight(.medium)
					.lineLimit(1)
					.truncationMode(.tail)

				Spacer()

				Text(event.formattedCountdown)
					.foregroundStyle(.secondary)
					.font(.caption)
			}
			.padding(.horizontal, 12)
			.padding(.vertical, 4)
			.accessibilityElement(children: .combine)
			.accessibilityLabel("Current event: \(event.title), \(event.formattedCountdown)")
		}

		if let meeting = event.meetingLink {
			Button {
				model.joinMeeting(event)
			} label: {
				Label("Join \(meeting.displayName)", systemImage: "video.fill")
			}
			.keyboardShortcut(.return, modifiers: [])
			.accessibilityHint("Opens \(meeting.displayName) meeting")
		}

		Button {
			model.openInCalendar(event)
		} label: {
			Label("Open in Calendar", systemImage: "calendar")
		}
		.accessibilityHint("Opens event in Calendar app")

		Button {
			model.dismissEvent(event)
		} label: {
			Label("Dismiss Event", systemImage: "xmark")
		}
		.accessibilityHint("Removes event from menu bar display")
	}
}
