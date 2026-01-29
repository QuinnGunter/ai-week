//
//  EventRowView.swift
//  Airtime Menu
//
//  Created by Claude on 15.12.25.
//

import SwiftUI

struct EventRowView: View {
	let event: CalendarEvent
	@ObservedObject var model: CalendarModel

	var body: some View {
		HStack(spacing: 8) {
			Circle()
				.fill(event.calendarColor)
				.frame(width: 8, height: 8)
				.accessibilityHidden(true)

			VStack(alignment: .leading, spacing: 2) {
				HStack(spacing: 4) {
					Text(event.formattedTimeRange)
						.font(.caption)
						.foregroundStyle(.secondary)

					if event.meetingLink != nil {
						Image(systemName: "video.fill")
							.font(.caption2)
							.foregroundStyle(.secondary)
							.accessibilityLabel("Has video meeting")
					}
				}

				Text(event.title)
					.lineLimit(1)
					.truncationMode(.tail)
			}

			Spacer()
		}
		.accessibilityElement(children: .combine)
		.accessibilityLabel("\(event.title), \(event.formattedTimeRange)\(event.meetingLink != nil ? ", has video meeting" : "")")
	}
}
