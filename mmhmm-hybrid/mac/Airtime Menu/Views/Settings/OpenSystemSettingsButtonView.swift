//
//  OpenSystemSettingsButtonView.swift
//  mmhmm
//
//  Created by Beni Federer on 02.06.25.
//

import SwiftUI

struct OpenSystemSettingsButtonView: View {
	@ObservedObject var model: AirtimeMenuBarApp.Model

	var body: some View {
		VStack {
			Spacer()
			Button {
				model.openSystemSettings()
			} label: {
				Text("Disable Login Item in System Settings")
			}
			.buttonStyle(.borderedProminent)
			.frame(maxWidth: .infinity, alignment: .center)
			Spacer()
		}
	}
}
