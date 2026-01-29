//
//  SessionMonitor+Hybrid.swift
//  mmhmm
//
//  Created by Beni Federer on 11.07.25.
//

import Foundation

import Common

extension SessionMonitor {
	func startMonitoringForHybrid() throws {
		try start(callback: sessionStateChanged)
	}
}

extension SessionMonitor {
	private func sessionStateChanged(sessionState: SessionState) {
		Logger.logMessage("Session state changed: \(sessionState)", level: .info)
		// Passed in session state might have been retrieved by a different
		// system notification mechanism than the one used to retrieve the
		// session state directly.
		Logger.logMessage("Current session state: \(self.sessionState)", level: .debug)
		mmhmm.PowerMonitor.updateHybridWithCurrentState()
	}
}

extension SessionMonitor.SessionState {
	var hybridLockState: mmhmm.LockState {
		switch self {
		case .unknown: .Unknown
		case .active: .Unlocked
		case .inactive, .loggingOut: .Locked
		}
	}
}
