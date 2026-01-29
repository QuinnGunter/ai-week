//
//  DaySectionView.swift
//  Airtime Menu
//
//  Created by Claude on 15.12.25.
//

import SwiftUI

struct DaySectionView: View {
	let section: CalendarModel.DaySection
	@ObservedObject var model: CalendarModel

	var body: some View {
		Section {
			ForEach(section.events.filter(\.isAllDay)) { event in
				AllDayEventRowView(event: event)
			}

			ForEach(section.events.filter { !$0.isAllDay }) { event in
				Button {
					if event.meetingLink != nil {
						model.joinMeeting(event)
					} else {
						model.openInCalendar(event)
					}
				} label: {
					EventRowView(event: event, model: model)
				}
			}
		} header: {
			Text(section.title)
				.font(.caption)
				.foregroundStyle(.secondary)
		}
	}
}
