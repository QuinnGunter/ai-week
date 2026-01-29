//
//  CaptureDevicePermissionHelper.swift
//  mmhmm
//
//  Created by Matthew Tonkin on 8/11/2022.
//

import AVKit
import Combine
import Foundation

import Common

protocol CaptureDevicePermissionHelperDelegate: AnyObject {
	func authorizationStatusChanged(fromStatus oldStatus: AVAuthorizationStatus, toStatus newStatus: AVAuthorizationStatus, inHelper helper: CaptureDevicePermissionHelper)
}

actor CaptureDevicePermissionHelper {
	let mediaType: AVMediaType

	init(mediaType: AVMediaType) {
		self.mediaType = mediaType
	}

	private var lastAuthorizationStatus: AVAuthorizationStatus?
	private weak var delegate: CaptureDevicePermissionHelperDelegate?

	var authorizationStatus: AVAuthorizationStatus {
		let authorizationStatus: AVAuthorizationStatus = AVCaptureDevice.authorizationStatus(for: mediaType)
		lastAuthorizationStatus = authorizationStatus
		return authorizationStatus
	}

	func updateDelegate(_ delegate: CaptureDevicePermissionHelperDelegate) {
		self.delegate = delegate
	}

	func requestAuthorization() async throws {
		switch authorizationStatus {
		case .notDetermined:
			await AVCaptureDevice.requestAccess(for: mediaType)
			notifyDelegateOfAuthorizationChange()
		case .restricted:
			throw Error.restricted
		case .denied:
			let preferencesURL: URL?
			switch mediaType {
			case .video:
				preferencesURL = URL(string: "x-apple.systempreferences:com.apple.preference.security?Privacy_Camera")
			case .audio:
				preferencesURL = URL(string: "x-apple.systempreferences:com.apple.preference.security?Privacy_Microphone")
			default:
				preferencesURL = nil
			}
			if let preferencesURL {
				NSWorkspace.shared.open(preferencesURL)
			}
			return
		case .authorized:
			return
		@unknown default:
			return
		}
	}
}

extension CaptureDevicePermissionHelper {
	private func notifyDelegateOfAuthorizationChange() {
		guard let lastAuthorizationStatus else { return }
		if authorizationStatus != lastAuthorizationStatus {
			delegate?.authorizationStatusChanged(fromStatus: lastAuthorizationStatus, toStatus: authorizationStatus, inHelper: self)
		}
	}
}

extension CaptureDevicePermissionHelper {
	enum Error: Int {
		case restricted
	}
}

extension CaptureDevicePermissionHelper.Error: BaseError {
	static let domain: String = String(describing: Self.self)

	var errorMessage: String {
		switch self {
		case .restricted: NSLocalizedString("Access to the device has been restricted by your administrator.", comment: "Capture device restricted")
		}
	}
}
