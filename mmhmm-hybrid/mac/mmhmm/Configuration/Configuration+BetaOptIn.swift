//
//  Configuration+BetaOptIn.swift
//  mmhmm
//
//  Created by Matthew Tonkin on 16/11/2023.
//

import AppKit

extension Configuration {
	static func validateToggleBetaOptInMenuItem(_ menuItem: NSMenuItem) -> Bool {
		switch Configuration.Release.effectiveUpdate {
		case .engineering, .test, .alpha:
			guard let releaseOverride = Configuration.Release.override else {
				return false
			}
			menuItem.title = String(localized: "Remove \(releaseOverride.rawValue) release override", comment: "Remove release override")
			return true
		case .beta:
			menuItem.title = String(localized: "Leave the Airtime Beta", comment: "Leave the Airtime Beta")
			return true
		case .production:
			menuItem.title = String(localized: "Join the Airtime Beta", comment: "Join the Airtime Beta")
			return true
		}
	}

	@MainActor
	static func toggleBetaOptIn() {
		switch Configuration.Release.effectiveUpdate {
		case .beta:
			let alert = NSAlert()
			alert.messageText = String(localized: "Leave the Airtime Beta?", comment: "Leave the Airtime Beta?")
			alert.informativeText = String(localized:
				"""
				After you leave the Airtime Beta you'll remain on this beta release until a newer public release is available. \
				We'll check for updates now to see if one is available.
				""", comment: "Beta opt out informative message.")
			alert.addButton(withTitle: String(localized: "Leave", comment: "Beta opt out alert button"))
			alert.addButton(withTitle: String(localized: "Stay", comment: "Beta opt out alert button"))
			if alert.runModal() == .alertFirstButtonReturn {
				Configuration.Release.updateOverride = .production
				Logger.logMessage("Applied release configuration update override: production.", level: .info)
				Application.cefAppDelegate.updater.checkForUpdates()
			}
		case .production:
			let alert = NSAlert()
			alert.messageText = String(localized: "Join the Airtime Beta?", comment: "Join the Airtime Beta?")
			alert.informativeText = String(localized: "After you join the Airtime Beta we'll check to see if there's an update available. If there is we'll update you straight away.", comment: "Beta opt out informative message.")
			alert.addButton(withTitle: String(localized: "Join", comment: "Beta opt in alert button"))
			alert.addButton(withTitle: String(localized: "Cancel", comment: "Cancel"))
			if alert.runModal() == .alertFirstButtonReturn {
				Configuration.Release.updateOverride = .beta
				Logger.logMessage("Applied release configuration update override: beta.", level: .info)
				Application.cefAppDelegate.updater.checkForUpdates()
			}
		case .alpha, .engineering, .test:
			guard let releaseOverride = Configuration.Release.override else {
				break
			}
			let alert = NSAlert()
			alert.messageText = String(localized: "Remove release override?", comment: "Remove release override?")
			alert.informativeText = String(localized:
				"""
				A release configuration override for \(releaseOverride.rawValue) is currently active. \
				Removing this will restore the app bundle's original release configuration \(Configuration.Release.default.rawValue)
				""", comment: "Release override removal informative message.")
			alert.addButton(withTitle: String(localized: "Remove", comment: "Remove release override alert button"))
			alert.addButton(withTitle: String(localized: "Cancel", comment: "Cancel"))
			if alert.runModal() == .alertFirstButtonReturn {
				Logger.logMessage("Removing release configuration override: \(Configuration.Release.override?.rawValue ?? "").", level: .info)
				Configuration.Release.override = nil
				Application.cefAppDelegate.updater.checkForUpdates()
			}
		}
	}
}
