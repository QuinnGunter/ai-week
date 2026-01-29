//  SettingsView.swift
//  Airtime Menu
//
//  Created by Beni Federer on 30.05.25.
//

import SwiftUI

struct SettingsView: View {
	@ObservedObject var model: AirtimeMenuBarApp.Model
	@ObservedObject var calendarModel: CalendarModel

	var body: some View {
		VStack(spacing: 0) {
			Form {
				Section {
					HeaderView()
				}
				.listRowInsets(EdgeInsets(top: 0, leading: 0, bottom: 0, trailing: 0))

				Section {
					AutoLaunchModeSettingsView(model: model)
				} header: {
					Text("Launch Behavior")
						.font(.title3)
						.fontWeight(.semibold)
						.foregroundStyle(.primary)
						.textCase(nil)
				}
				.listRowInsets(EdgeInsets(top: 12, leading: 0, bottom: 12, trailing: 0))

				Section {
					HotKeySettingsView(model: model)
				} header: {
					Text("Keyboard Shortcuts")
						.font(.title3)
						.fontWeight(.semibold)
						.foregroundStyle(.primary)
						.textCase(nil)
				}
				.listRowInsets(EdgeInsets(top: 12, leading: 0, bottom: 12, trailing: 0))

				Section {
					CalendarSettingsView(calendarModel: calendarModel)
				} header: {
					Text("Calendar")
						.font(.title3)
						.fontWeight(.semibold)
						.foregroundStyle(.primary)
						.textCase(nil)
				}
				.listRowInsets(EdgeInsets(top: 12, leading: 0, bottom: 12, trailing: 0))
			}
			.formStyle(.grouped)
			.scrollContentBackground(.hidden)
			.scrollBounceBehaviorCompat(.basedOnSize)
			.padding(.top, 1)

			VersionView(versionString: model.versionString)
				.padding(.top, 8)
				.padding(.bottom, 24)
		}
		.background(Color(nsColor: .windowBackgroundColor))
		.fixedSize(horizontal: true, vertical: true)
	}
}

struct SettingsView_Previews: PreviewProvider {
	static var previews: some View {
		SettingsView(model: AirtimeMenuBarApp.Model(), calendarModel: CalendarModel())
	}
}
