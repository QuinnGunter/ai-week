//
//  SystemExtensionRequestManager.SystemDelegate.swift
//  CameraExtensionHost
//
//  Created by Beni Federer on 29.10.24.
//

import SystemExtensions

extension SystemExtensionRequestManager {
	/// A type serving as a `OSSystemExtensionRequestDelegate`, helping to
	/// separate its legacy `NSObject` inheritance requirement.
	class SystemDelegate: NSObject {
		weak var manager: SystemExtensionRequestManager?

		let systemExtensionIdentifier: String

		private let queue = DispatchQueue(label: "app.mmhmm.hybrid.SystemExtensionRequestDelegate")

		init(systemExtensionIdentifier: String) {
			self.systemExtensionIdentifier = systemExtensionIdentifier
		}

		@available(macOS 15.1, *)
		func startObserving() throws {
			try OSSystemExtensionsWorkspace.shared.addObserver(self)
		}

		@available(macOS 15.1, *)
		func stopObserving() {
			OSSystemExtensionsWorkspace.shared.removeObserver(self)
		}
	}
}

extension SystemExtensionRequestManager.SystemDelegate: OSSystemExtensionRequestDelegate {
	func activationRequest(forExtensionWithIdentifier identifier: String) -> OSSystemExtensionRequest {
		let request = OSSystemExtensionRequest.activationRequest(forExtensionWithIdentifier: identifier, queue: queue)
		request.delegate = self
		return request
	}

	func deactivationRequest(forExtensionWithIdentifier identifier: String) -> OSSystemExtensionRequest {
		let request = OSSystemExtensionRequest.deactivationRequest(forExtensionWithIdentifier: identifier, queue: queue)
		request.delegate = self
		return request
	}

	func propertiesRequest(forExtensionWithIdentifier identifier: String) -> OSSystemExtensionRequest {
		let request = OSSystemExtensionRequest.propertiesRequest(forExtensionWithIdentifier: identifier, queue: queue)
		request.delegate = self
		return request
	}

	func submitRequest(_ request: OSSystemExtensionRequest) {
		OSSystemExtensionManager.shared.submitRequest(request)
	}

	func request(_ request: OSSystemExtensionRequest, actionForReplacingExtension existing: OSSystemExtensionProperties, withExtension other: OSSystemExtensionProperties) -> OSSystemExtensionRequest.ReplacementAction {
		manager?.request(request, actionForReplacingExtension: existing, withExtension: other) ?? .replace
	}

	func requestNeedsUserApproval(_ request: OSSystemExtensionRequest) {
		manager?.requestNeedsUserApproval(request)
	}

	func request(_ request: OSSystemExtensionRequest, didFinishWithResult result: OSSystemExtensionRequest.Result) {
		manager?.request(request, didFinishWithResult: result)
	}

	func request(_ request: OSSystemExtensionRequest, didFailWithError error: any Error) {
		guard let manager else { return }
		let fixedUpError: Error = if let extensionError = error as? OSSystemExtensionError {
			extensionError.withRepairedUserInfo
		} else {
			error
		}
		manager.request(request, didFailWithError: fixedUpError)
	}

	func request(_ request: OSSystemExtensionRequest, foundProperties properties: [OSSystemExtensionProperties]) {
		manager?.request(request, foundProperties: properties)
	}
}

@available(macOS 15.1, *)
extension SystemExtensionRequestManager.SystemDelegate: OSSystemExtensionsWorkspaceObserver {
	/// Called when a system extension has been validated and allowed by the user to run.
	func systemExtensionWillBecomeEnabled(_ systemExtensionInfo: OSSystemExtensionInfo) {
		guard systemExtensionInfo.bundleIdentifier == systemExtensionIdentifier else { return }
		manager?.systemExtensionWillBecomeEnabled(version: systemExtensionInfo.bundleVersion, shortVersion: systemExtensionInfo.bundleShortVersion)
	}

	/// Called when the user disables an already enabled system extension, or when the
	/// system extension is first installed and is in the disabled state.
	func systemExtensionWillBecomeDisabled(_ systemExtensionInfo: OSSystemExtensionInfo) {
		guard systemExtensionInfo.bundleIdentifier == systemExtensionIdentifier else { return }
		manager?.systemExtensionWillBecomeDisabled(version: systemExtensionInfo.bundleVersion, shortVersion: systemExtensionInfo.bundleShortVersion)
	}

	/// Called when a system extension is deactivated and is about to get uninstalled.
	/// The extension may still be running until the system is rebooted.
	func systemExtensionWillBecomeInactive(_ systemExtensionInfo: OSSystemExtensionInfo) {
		guard systemExtensionInfo.bundleIdentifier == systemExtensionIdentifier else { return }
		manager?.systemExtensionWillBecomeInactive(version: systemExtensionInfo.bundleVersion, shortVersion: systemExtensionInfo.bundleShortVersion)
	}
}
