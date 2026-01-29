//
//  Analytics+ExtensionState.swift
//
//
//  Created by Beni Federer on 24.02.25.
//

import CameraExtensionHost

extension Analytics {
	nonisolated func logEvent(forNewState newState: SystemExtensionRequestManager.ExtensionState,
							  switchingFrom oldState: SystemExtensionRequestManager.ExtensionState) {
		Task { await isolatedLogEvent(forNewState: newState, switchingFrom: oldState) }
	}
}

extension Analytics {
	private func isolatedLogEvent(forNewState newState: SystemExtensionRequestManager.ExtensionState,
								  switchingFrom oldState: SystemExtensionRequestManager.ExtensionState) {
		switch newState {
		case .awaitingUserApproval where oldState == .notInstalled || oldState == .uninstalling:
			logEvent("virtual_camera_installation_awaiting_approval")
		case .installing, .installed, .needsUpdate, .requiresReboot:
			guard oldState == .awaitingUserApproval else { return }
			logEvent("virtual_camera_installation_successful")
		case let .error(error):
			logErrorEvent("virtual_camera_installation_failed", error: error)
		case .uninstalling where oldState != .notInstalled && oldState != .uninstalling && oldState != .unknown:
			logEvent("virtual_camera_deinstallation_succeeded")
		default:
			break
		}
	}
}
