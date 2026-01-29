//
//  OpenSettingsButtonView.swift
//  mmhmm
//
//  Created by Beni Federer on 02.06.25.
//

import SwiftUI

struct OpenSettingsButtonView: View {
	@ObservedObject var model: AirtimeMenuBarApp.Model

	var body: some View {
		Button("Settings") {
			model.openSettingsWindow()
		}
	}
}
