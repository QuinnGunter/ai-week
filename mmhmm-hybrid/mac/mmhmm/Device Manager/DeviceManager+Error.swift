//
//  DeviceManager+Error.swift
//  mmhmm
//
//  Created by Beni Federer on 07.02.25.
//

import CameraExtensionHost
import Common

extension DeviceManager {
	enum Error {
		case unexpectedCameraExtensionState(SystemExtensionRequestManager.ExtensionState)
	}
}

extension DeviceManager.Error: BaseErrorWithAssociatedValues {
	static let domain: String = String(describing: Self.self)

	var errorMessage: String {
		switch self {
		case let .unexpectedCameraExtensionState(state):
			"Camera extension state is unexpected: \(state)."
		}
	}

	static let allCases: [DeviceManager.Error] = [.unexpectedCameraExtensionState(.unknown)]
}
