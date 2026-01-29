//
//  AutoLaunchModeSettingsView.swift
//  mmhmm
//
//  Created by Beni Federer on 02.06.25.
//

import SwiftUI

struct AutoLaunchModeSettingsView: View {
	@ObservedObject var model: AirtimeMenuBarApp.Model

	var body: some View {
		VStack(spacing: 0) {
			#if DEBUG
			HStack(alignment: .top) {
				VStack(alignment: .leading, spacing: 4) {
					Text("Launch automatically")
						.font(.body)
					Text("Opens Airtime when apps connect to the Airtime virtual camera.")
						.font(.caption)
						.foregroundStyle(.secondary)
						.fixedSize(horizontal: false, vertical: true)
				}
				.frame(maxWidth: .infinity, alignment: .leading)

				Spacer()

				Toggle("", isOn: model.$autoLaunchAirtime)
					.labelsHidden()
			}
			.padding(.vertical, 12)
			.onChange(of: model.autoLaunchAirtime) { autoLaunchAirtime in
				Logger.logMessage("Auto launch was \(autoLaunchAirtime ? "enabled." : "disabled.")", level: .info)
			}

			Divider()
			#endif

			HStack(alignment: .top) {
				VStack(alignment: .leading, spacing: 4) {
					Text("Launch tool")
						.font(.body)
					Text("Choose the tool to launch automatically when apps connect to the Airtime virtual camera.")
						.font(.caption)
						.foregroundStyle(.secondary)
						.fixedSize(horizontal: false, vertical: true)
				}
				.frame(maxWidth: .infinity, alignment: .leading)

				Spacer()

				Picker("", selection: model.$autoLaunchMode) {
					ForEach(AirtimeMenuBarApp.Model.LaunchMode.virtualCameraProviders) { mode in
						Text(mode.userFriendlyName).tag(mode)
					}
				}
				.pickerStyle(.menu)
				.labelsHidden()
				.frame(width: 200, alignment: .trailing)
			}
			.padding(.vertical, 12)
			.disabled(!model.autoLaunchAirtime)
			.opacity(model.autoLaunchAirtime ? 1.0 : 0.5)
			.onChange(of: model.autoLaunchMode) { autoLaunchMode in
				Logger.logMessage("Auto launch mode was set to \(autoLaunchMode.rawValue)", level: .info)
			}
		}
		.padding(.horizontal, 8)
	}
}

struct AutoLaunchModeSettingsView_Previews: PreviewProvider {
	static var previews: some View {
		AutoLaunchModeSettingsView(model: AirtimeMenuBarApp.Model())
	}
}
