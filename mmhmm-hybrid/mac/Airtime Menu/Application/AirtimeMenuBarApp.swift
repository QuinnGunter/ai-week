//
//  AirtimeMenuBarApp.swift
//  Airtime Menu
//
//  Created by Beni Federer on 12.05.25.
//

import SwiftUI

import Common

// swiftlint:disable:next identifier_name
let Logger = ProductionLogger(withFileURL: URL.menuBarAppLogFilePath)

@main
struct AirtimeMenuBarApp: App {
	/// The bundle version as retrieved while the app launches.
	///
	/// When updating the host app bundle, this app's bundle
	/// might be moved to the trash or partially overwritten,
	/// causing bundle version queries to return the value
	/// of the updated menu bar app bundle, although the menu
	/// bar app never restarted with the update changes.
	static let bundleVersion: String = Bundle.main.infoDictionary?["CFBundleVersion"] as? String ?? "Unknown"

	static let marketingVersion: String = Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "Unknown"

	init() {
		Logger.logMessage("Finished launching: \(Bundle.main.bundleURL.path) (\(Bundle.main.infoDictionary?["CFBundleVersion"] as? String ?? "Unknown"))", level: .info)
	}

	@ObservedObject private var model = Model()
	@StateObject private var calendarModel = CalendarModel()

	@State private var pulsateIcon = true

	var body: some Scene {
		MenuBarExtra {
			MainMenuContentView(model: model)
		} label: {
			if model.virtualCameraHasClients {
				PulsatingIconView(imageName: "AirtimeLogo")
			} else {
				Image("AirtimeLogo")
			}
		}

		MenuBarExtra {
			CalendarMenuContentView(model: calendarModel)
				.task {
					await calendarModel.start()
				}
				.onChange(of: calendarModel.calendarEnabled) { newValue in
					calendarModel.handleCalendarEnabledChange(newValue)
				}
		} label: {
			CalendarMenuBarLabel(model: calendarModel)
		}
		.menuBarExtraStyle(.menu)

		Window("Airtime Settings", id: WindowIdentifiers.settings.rawValue) {
			SettingsView(model: model, calendarModel: calendarModel)
		}
		.windowResizability(.contentSize)
		.windowStyle(.hiddenTitleBar)
		.floatingWindowLevel()
	}
}

extension AirtimeMenuBarApp {
	enum WindowIdentifiers: String {
		case settings
	}
}
