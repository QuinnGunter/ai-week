//
//  DeviceManager+HybridVirtualCamera.swift
//  mmhmm
//
//  Created by Beni Federer on 11.11.24.
//

import Foundation

import CameraExtensionHost

extension DeviceManager {
	var hybridVirtualCamera: mmhmm.VirtualCamera {
		get async throws {
			let extensionState: SystemExtensionRequestManager.ExtensionState = try await virtualCameraStatus
			let state: mmhmm.VirtualCameraState = if extensionState.allowsInstallation, try Bundle.main.locatedInApplicationsFolder == false {
				#if DEBUG
				// Debug builds run from within Xcode can install system extensions, so keep virtual camera life cycle easily debuggable.
				mmhmm.VirtualCameraState(extensionState.hybridVirtualCameraState, "")
				#else
				mmhmm.VirtualCameraState(.notInstallable, "App bundle is not located in Applications folder.")
				#endif
			} else if case let .error(errorMessage) = extensionState {
				mmhmm.VirtualCameraState(.error, std.string(errorMessage.localizedDescription))
			} else {
				mmhmm.VirtualCameraState(extensionState.hybridVirtualCameraState, "")
			}

			let clients: CxxBridge.VectorOfStrings = if let streamingClients: [StreamingClient] = cameraHelper?.streamingClients {
				await MainActor.run {
					let streamClientAppTitles: [std.string] = CameraHelper
						.applicationTitles(forStreamingClients: streamingClients)
						.map { StreamClient.applicationTitle(forProcessName: $0) }
						.map { std.string($0) }
					return CxxBridge.VectorOfStrings(streamClientAppTitles)
				}
			} else {
				[]
			}

			return mmhmm.VirtualCamera(state: state, clients: clients)
		}
	}

	func updateHybridWithVirtualCamera() async {
		Logger.logMessage("Updating web app with virtual camera info.", level: .info)

		do {
			let hybridVirtualCamera: mmhmm.VirtualCamera = try await hybridVirtualCamera
			CxxBridge.updateVirtualCamera(hybridVirtualCamera)
		} catch {
			Logger.logError(error, messagePrefix: "Failed to update hybrid with virtual camera")
		}
	}
}

extension SystemExtensionRequestManager.ExtensionState {
	fileprivate var hybridVirtualCameraState: mmhmm.VirtualCameraRawState {
		switch self {
		case .notInstalled: .notInstalled
		case .awaitingUserApproval, .disabled: .awaitingUserApproval
		case .installing: .installing
		case .installed: .installed
		case .uninstalling: .uninstalling
		case .unknown: .error
		case .requiresReboot: .needsReboot
		case .needsUpdate: .needsUpdate
		case .error: .error
		}
	}
}

extension CxxBridge.VectorOfStrings: @unchecked Sendable {}
