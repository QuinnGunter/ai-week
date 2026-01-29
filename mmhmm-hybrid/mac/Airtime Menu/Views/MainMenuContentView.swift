//
//  MainMenuContentView.swift
//  mmhmm
//
//  Created by Beni Federer on 30.05.25.
//

import SwiftUI

import Common

struct MainMenuContentView: View {
	@ObservedObject var model: AirtimeMenuBarApp.Model

	var body: some View {
		Button("Open Camera") {
			model.launchAirtime(onBehalfOf: String(describing: AirtimeMenuBarApp.self), notifyingUser: false, launchMode: .webApp(.camera))
			Logger.logMessage("Opened Camera.", level: .info)
		}

		Button("Open Creator") {
			model.launchAirtime(onBehalfOf: String(describing: AirtimeMenuBarApp.self), notifyingUser: false, launchMode: .webApp(.creator))
			Logger.logMessage("Opened Creator.", level: .info)
		}

		Button("Open Screen Recorder") {
			model.launchAirtime(onBehalfOf: String(describing: AirtimeMenuBarApp.self), notifyingUser: false, launchMode: .webApp(.screenRecorder))
			Logger.logMessage("Opened Screen Recorder.", level: .info)
		}

		Button("Open Stacks") {
			model.launchAirtime(onBehalfOf: String(describing: AirtimeMenuBarApp.self), notifyingUser: false, launchMode: .webApp(.stacks))
			Logger.logMessage("Opened Stacks.", level: .info)
		}

		Divider()

		RemoteControlMenuView(model: model)

		Divider()

		OpenSettingsButtonView(model: model)

		Divider()

		Button("Quit") {
			model.quitMenuBarApp()
		}
		.keyboardShortcut("q")
	}
}
