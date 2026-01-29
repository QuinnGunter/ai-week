//
//  DeviceManager+SystemExtensionRequestManagerDelegate.swift
//  mmhmm
//
//  Created by Beni Federer on 30.10.24.
//

import AppKit
import SystemExtensions

import CameraExtensionHost

extension DeviceManager: SystemExtensionRequestManagerDelegate {
	nonisolated func systemExtensionRequestManager(_ manager: CameraExtensionHost.SystemExtensionRequestManager, didUpdateExtensionState extensionState: CameraExtensionHost.SystemExtensionRequestManager.ExtensionState) {
		Task {
			// Several instances of the same system extension are able to crossfire their respective states.
			// As an example, when re-activating a system extension, which has been manually disabled in System Settings,
			// by sending an activation request through the `SystemExtensionRequestManager`, it may happen that
			// a new instance of the system extension is being installed and the formerly disabled system extension
			// moves to the `.uninstalling` state. This can lead to the `.installed` state being seen before the
			// `.uninstalling` state, which confuses internal state keeping, which usually only wants to track the
			// most relevant system extension's state, i.e. the extension with the `.installed` state.
			//
			// Therefore, don't take the updated extension state verbatim, but send the most relevant extension's
			// current state. This way, the called on code has to ensure that it filters duplicate states, but it always
			// receives the most current state.

			do {
				try await updateExtensionState()
			} catch {
				Logger.logError(error, messagePrefix: "System extension state update failed", level: .fault)
			}
		}
	}

	nonisolated func systemExtensionRequestManager(_ manager: CameraExtensionHost.SystemExtensionRequestManager, didFailWithError error: Swift.Error) {
		switch error {
		case SystemExtensionRequestManager.Error.failedWithNonCriticalInconsistentRequestUpdate:
			Logger.logError(error, messagePrefix: "System extension request manager failed with non-critical error", level: .error, targets: .uncheckedAll)
		default:
			Logger.logError(error, messagePrefix: "System extension request manager failed with error", level: .fault)
		}
	}

	nonisolated func systemExtensionRequestManager(_ manager: CameraExtensionHost.SystemExtensionRequestManager, replacesExtension existingExtension: OSSystemExtensionProperties, withExtension otherExtension: OSSystemExtensionProperties) {
		Logger.logMessage("Replacing extension \(existingExtension.versionDescription) with \(otherExtension.versionDescription)", level: .info)
	}
}

// MARK: - Activation

extension DeviceManager {
	private static let unexpectedActivationResultStates: [SystemExtensionRequestManager.ExtensionState] = [
		.unknown,
		.uninstalling,
		.notInstalled,
	]

	func activateCameraExtension() async {
		Logger.logMessage("Activating camera extension", level: .info)
		Analytics.shared.logEvent("virtual_camera_installation_attempted")

		guard extensionState != .requiresReboot else {
			await MainActor.run { requestReboot() }
			return
		}

		if [.awaitingUserApproval, .disabled].contains(extensionState) {
			// Prior to macOS 15.1, the system's own dialog prompting users
			// to open the System Settings and allow a system extension is
			// only presented once. The same is true for some systems again
			// starting with macOS 15.3. For all others, the system always
			// allows the dialog to appear.
			//
			// A notification watchdog ensures that the app window loses focus
			// to a dialog window. If not, the System Settings are opened
			// manually, which only is a good user experience prior to 15.0.
			// Starting with macOS 15.0, the system extension settings panes
			// don't support deep linking anymore, which forces users to
			// go the last mile by foot and find the dimly lit entrance to
			// the respective System Settings modal themselves.
			await configureNotificationWatchdog()
		}

		do {
			let state: SystemExtensionRequestManager.ExtensionState = try await cameraExtensionRequestManager.requestActivation()

			let stateCheckedExtensionState: SystemExtensionRequestManager.ExtensionState = if Self.unexpectedActivationResultStates.contains(state) {
				.error(Error.unexpectedCameraExtensionState(state))
			} else {
				state
			}

			if case let .error(error) = stateCheckedExtensionState {
				throw error
			} else {
				extensionState = stateCheckedExtensionState
			}
		} catch {
			Logger.logMessage("Activation failed with error: \(error.localizedDescription)", level: .error)

			Task { @MainActor in
				Analytics.shared.logErrorEvent("virtual_camera_installation_failed", error: error)
				NSAlert(error: error).runModal()
			}

			extensionState = .error(error)
		}
	}

	@MainActor
	func updateCameraExtensionActivationMenuItem(_ menuItem: NSMenuItem) -> Bool {
		let state: CameraExtensionStateProvider.State = cameraExtensionStateProvider.state

		switch state {
		case .installing, .installed, .unknown:
			break
		case .notInstalled, .uninstalling, .error:
			menuItem.title = NSLocalizedString("Install Airtime Virtual Camera…", comment: "Camera Extension State")
		case .awaitingUserApproval:
			menuItem.title = NSLocalizedString("Approve Airtime Virtual Camera…", comment: "Camera Extension State")
		case .needsUpdate:
			menuItem.title = NSLocalizedString("Update Airtime Virtual Camera…", comment: "Camera Extension State")
		case .requiresReboot:
			menuItem.title = NSLocalizedString("Reboot to use Airtime Virtual Camera…", comment: "Camera Extension State")
		}

		menuItem.isHidden = state.hidesActivateMenuItem
		return state.enablesActivateMenuItem
	}
}

// MARK: - Deactivation

extension DeviceManager {
	private static let unexpectedDeactivationResultStates: [SystemExtensionRequestManager.ExtensionState] = [
		.awaitingUserApproval,
		.disabled,
		.unknown,
		.needsUpdate,
		.installing,
		.installed,
	]

	func deactivateCameraExtension() async {
		Logger.logMessage("Deactivating camera extension", level: .info)

		do {
			let state: SystemExtensionRequestManager.ExtensionState = try await cameraExtensionRequestManager.requestDeactivation()

			let stateCheckedExtensionState: SystemExtensionRequestManager.ExtensionState = if Self.unexpectedDeactivationResultStates.contains(state) {
				.error(Error.unexpectedCameraExtensionState(state))
			} else {
				state
			}

			if case let .error(error) = stateCheckedExtensionState {
				throw error
			} else {
				extensionState = stateCheckedExtensionState
			}
		} catch let error as NSError where error.domain == OSSystemExtensionErrorDomain && error.code == OSSystemExtensionError.authorizationRequired.rawValue {
			Logger.logMessage("Deactivation canceled due to missing authorization by user.", level: .info)
			// Don't update extensionState since the user did not authorize the uninstallation, which should not surface as an error to the user.
		} catch {
			Logger.logMessage("Deactivation failed with error: \(error.localizedDescription)", level: .error)

			Task { @MainActor in
				Analytics.shared.logErrorEvent("virtual_camera_deinstallation_failed", error: error)
				NSAlert(error: error).runModal()
			}

			extensionState = .error(error)
		}
	}

	@MainActor
	func updateCameraExtensionDeactivationMenuItem(_ menuItem: NSMenuItem) -> Bool {
		let state: CameraExtensionStateProvider.State = cameraExtensionStateProvider.state
		if state.enablesDeactivateMenuItem {
			menuItem.title = NSLocalizedString("Uninstall Airtime Virtual Camera…", comment: "Camera Extension State")
			menuItem.isHidden = false
			return true
		} else {
			menuItem.isHidden = true
			return false
		}
	}
}

extension DeviceManager.CameraExtensionStateProvider.State {
	fileprivate var enablesActivateMenuItem: Bool {
		switch self {
		case .unknown, .installing, .installed:
			return false
		case .notInstalled, .awaitingUserApproval, .requiresReboot, .needsUpdate, .uninstalling, .error:
			return true
		}
	}

	fileprivate var enablesDeactivateMenuItem: Bool {
		switch self {
		case .notInstalled, .uninstalling, .error, .unknown:
			return false
		case .installing, .installed, .awaitingUserApproval, .needsUpdate, .requiresReboot:
			return true
		}
	}

	fileprivate var hidesActivateMenuItem: Bool {
		!enablesActivateMenuItem
	}
}
