//
//  CalendarMenuBarLabel.swift
//  Airtime Menu
//
//  Created by Claude on 15.12.25.
//

import SwiftUI

struct CalendarMenuBarLabel: View {
	@ObservedObject var model: CalendarModel

	private enum Constants {
		static let maxTitleLength = 25
		static let truncatedTitleLength = 22
	}

	var body: some View {
		if model.calendarEnabled, let event = model.nextEvent {
			HStack(spacing: 4) {
				Text(truncatedTitle(event.title))
				if event.meetingLink != nil {
					Image(systemName: "video.fill")
						.font(.caption2)
						.accessibilityLabel("Has video meeting")
				}
				Text(event.formattedCountdown)
					.foregroundStyle(.secondary)
			}
			.accessibilityElement(children: .combine)
			.accessibilityLabel("\(event.title), \(event.formattedCountdown)")
		} else {
			Image(systemName: "calendar")
				.accessibilityLabel("Calendar")
		}
	}

	private func truncatedTitle(_ title: String) -> String {
		if title.count > Constants.maxTitleLength {
			return String(title.prefix(Constants.truncatedTitleLength)) + "..."
		}
		return title
	}
}
