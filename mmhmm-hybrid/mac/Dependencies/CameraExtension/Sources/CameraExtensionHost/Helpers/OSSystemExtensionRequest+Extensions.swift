//
//  OSSystemExtensionRequest+Extensions.swift
//  CameraExtensionHost
//
//  Created by Beni Federer on 30.10.24.
//

import SystemExtensions

extension OSSystemExtensionRequest {
	var isActivationRequest: Bool {
		guard let requestSubClass: AnyClass = NSClassFromString("OSSystemExtensionActivationRequest") else {
			assertionFailure("Expected OSSystemExtensionActivationRequest class")
			return false
		}

		return isKind(of: requestSubClass)
	}

	var isDeactivationRequest: Bool {
		guard let requestSubClass: AnyClass = NSClassFromString("OSSystemExtensionDeactivationRequest") else {
			assertionFailure("Expected OSSystemExtensionDeactivationRequest class")
			return false
		}

		return isKind(of: requestSubClass)
	}
}
