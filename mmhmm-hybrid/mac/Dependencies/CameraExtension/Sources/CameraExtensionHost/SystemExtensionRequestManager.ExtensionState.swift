//
//  SystemExtensionRequestManager.ExtensionState.swift
//  CameraExtension
//
//  Created by Beni Federer on 30.10.24.
//

import Common

extension SystemExtensionRequestManager {
	/// The various states a system extension can present itself to the user.
	///
	/// This is a more elaborate reinterpretation of the states the system extension
	/// framework knows, see ``OSSystemExtensionProperties.activationState``, coupled
	/// with heuristics based on observed system behavior. It is on the client to
	/// observe and update between states as necessary.
	public enum ExtensionState: ReflectiveEquatable, Sendable {
		/// The state has not yet been determined.
		case unknown

		/// The system extension is not installed.
		case notInstalled

		/// The system extension has been activated, but requires manual user approval.
		case awaitingUserApproval

		/// The system extension was approved by the user, but it has not yet become active.
		/// In a camera extension, this means the CMIO device ID is not currently available.
		case installing

		/// The system extension is fully active.
		case installed

		/// The system extension has been disabled.
		/// This has most likely been done manually by the user in System Settings.
		case disabled

		/// The system extension will only become fully active after a reboot.
		/// While the system extension framework supports reporting this state,
		/// at least for camera extensions it never does. This state is applicable
		/// when multiple instances are on the system or when a system extension
		/// has been re-enabled by the user.
		case requiresReboot

		/// The system extension bundled with the running host app is newer than
		/// the installed version. A re-activation is required and supposed to be
		/// invisible to the user.
		case needsUpdate

		/// The system extension has been deactivated and will be removed on reboot.
		case uninstalling

		/// An error occurred, mostly while de/activating the system extension.
		case error(Swift.Error)
	}
}

extension SystemExtensionRequestManager.ExtensionState {
	/// Whether a state indicates the general eligibility to install a system extension.
	///
	/// Note: `.awaitingUserApproval` is a special case where the system presents a
	///       dialog prompting the user to authorize a system extension since macOS 15.1
	///       when repeatedly requesting activation.
	public var allowsInstallation: Bool {
		switch self {
		case .awaitingUserApproval, .disabled, .error, .needsUpdate, .notInstalled, .uninstalling, .unknown: true
		case .installing, .installed, .requiresReboot: false
		}
	}

	/// Whether a state indicates the general eligibility to uninstall a system extension.
	public var allowsUninstallation: Bool {
		switch self {
		case .awaitingUserApproval, .disabled, .error, .installing, .installed, .needsUpdate, .requiresReboot, .unknown: true
		case .notInstalled, .uninstalling: false
		}
	}
}

extension SystemExtensionRequestManager.ExtensionState: CustomStringConvertible {
	public var description: String {
		switch self {
		case .unknown: "Unknown"
		case .notInstalled: "Not installed"
		case .awaitingUserApproval: "Awaiting user approval"
		case .installing: "Installing"
		case .installed: "Installed"
		case .disabled: "Disabled"
		case .needsUpdate: "Needs update"
		case .requiresReboot: "Requires reboot"
		case .uninstalling: "Uninstalling"
		case let .error(error): "Error: \(error.localizedDescription)"
		}
	}
}
