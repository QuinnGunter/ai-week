//
//  RemoteControlMenuView.swift
//  Airtime Menu
//
//  Created by Beni Federer on 19.05.25.
//

import SwiftUI

struct RemoteControlMenuView: View {
	@ObservedObject var model: AirtimeMenuBarApp.Model

	var body: some View {
		Text("Screen Recorder")
			.font(.caption)
			.foregroundColor(.secondary)

		RemoteControlScreenRecorderMenuView(model: model)

		if let remoteControlState = model.remoteControlState {
			Divider()

			if remoteControlState.webApps.contains(.creator) {
				Text("Creator")
					.font(.caption)
					.foregroundColor(.secondary)

				RemoteControlCreatorMenuView(model: model)
			}
		}
	}
}
