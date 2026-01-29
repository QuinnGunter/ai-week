//
//  AllDayEventRowView.swift
//  Airtime Menu
//
//  Created by Claude on 15.12.25.
//

import SwiftUI

struct AllDayEventRowView: View {
	let event: CalendarEvent

	var body: some View {
		HStack(spacing: 8) {
			Circle()
				.stroke(event.calendarColor, lineWidth: 2)
				.frame(width: 8, height: 8)
				.accessibilityHidden(true)

			Text("All day:")
				.font(.caption)
				.foregroundStyle(.secondary)

			Text(event.title)
				.lineLimit(1)
				.truncationMode(.tail)

			Spacer()
		}
		.accessibilityElement(children: .combine)
		.accessibilityLabel("All day event: \(event.title)")
	}
}
