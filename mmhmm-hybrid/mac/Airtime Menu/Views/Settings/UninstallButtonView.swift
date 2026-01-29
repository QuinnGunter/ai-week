//
//  UninstallButtonView.swift
//  mmhmm
//
//  Created by Beni Federer on 02.06.25.
//

import SwiftUI

struct UninstallButtonView: View {
	@ObservedObject var model: AirtimeMenuBarApp.Model
	@State private var showDisableAlert = false

	private static let message: String =
		"""
		The Airtime menu bar app will no longer be automatically started at login. The remote control menu will still be available while Airtime is running.

		The Airtime menu bar app can be re-enabled as a login item at any time from the app menu.
		"""

	var body: some View {
		VStack {
			Spacer()
			Button(role: .destructive) {
				showDisableAlert = true
			} label: {
				Text("Disable Airtime Login Item")
			}
			.alert("Remove Airtime Login Item?", isPresented: $showDisableAlert) {
				Button("Remove") { model.uninstall() }
				Button("Cancel", role: .cancel) {}
			} message: {
				Text(Self.message)
			}
			.buttonStyle(.borderedProminent)
			.tint(.red)
			.frame(maxWidth: .infinity, alignment: .center)
			Spacer()
		}
	}
}
