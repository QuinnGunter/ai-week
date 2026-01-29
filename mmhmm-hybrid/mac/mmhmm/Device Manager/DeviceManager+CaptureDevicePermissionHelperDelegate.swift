//
//  DeviceManager+CaptureDevicePermissionHelperDelegate.swift
//  mmhmm
//
//  Created by Beni Federer on 24.10.24.
//

import AVFoundation

extension DeviceManager: CaptureDevicePermissionHelperDelegate {
	nonisolated func authorizationStatusChanged(fromStatus oldStatus: AVAuthorizationStatus, toStatus newStatus: AVAuthorizationStatus, inHelper helper: CaptureDevicePermissionHelper) {
		switch helper.mediaType {
		case .video:
			guard oldStatus == .notDetermined else { return }
			if newStatus == .authorized {
				Analytics.shared.logEvent("camera_permission_authorized")
			} else if newStatus == .denied {
				Analytics.shared.logEvent("camera_permission_denied")
			}
			Task { await updateHybridWithAppCapabilities() }
		case .audio:
			guard oldStatus == .notDetermined else { return }
			if newStatus == .authorized {
				Analytics.shared.logEvent("microphone_permission_authorized")
			} else if newStatus == .denied {
				Analytics.shared.logEvent("microphone_permission_denied")
			}
			Task { await updateHybridWithAppCapabilities() }
		default:
			Logger.logMessage("Unexpected media type: \(helper.mediaType)", level: .error)
		}
	}
}
