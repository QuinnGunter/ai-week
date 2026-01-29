//
//  DeviceManager.swift
//  mmhmm
//
//  Created by Matthew Tonkin on 12/8/2024.
//

import AVKit
import Combine
import CoreMediaIO
import Foundation

import CameraExtensionHost
import Common

@MainActor
protocol DeviceManagerDelegate: AnyObject {
	func deviceManagerRequestsRelaunch(_ deviceManager: DeviceManager)
	func deviceManagerRequestsReboot(_ deviceManager: DeviceManager)
	func streamingClientConnected(_ client: StreamingClient, isFirst: Bool)
	func streamingClientDisconnected(_ client: StreamingClient, isLast: Bool)
}

actor DeviceManager {
	@MainActor
	let cameraExtensionStateProvider: CameraExtensionStateProvider

	@MainActor
	weak var delegate: DeviceManagerDelegate?

	private(set) var cameraHelper: CameraHelper?
	let cameraExtensionRequestManager: SystemExtensionRequestManager
	let cameraPermissionsHelper: CaptureDevicePermissionHelper
	let microphonePermissionsHelper: CaptureDevicePermissionHelper

	private var notificationWatchdog: NotificationWatchdog?

	/// Used to avoid prompting the user multiple times when determining
	/// extension state programmatically. Should be avoided when the
	/// reboot is initiated by the user, e.g. by selecting a menu item.
	private var rebootAlertWasNotYetPresented: Bool = true

	/// The camera extension state.
	///
	/// This variable deduplicates incoming events from multiple sources, depending
	/// on what the current macOS version is happy to support, and updates itself
	/// depending on observed system behavior.
	///
	/// ### .requiresReboot
	/// A reboot is required after installation of the camera extension.
	///
	/// If the extension is uninstalled, then reinstalled during the same boot cycle,
	/// or has been disabled in System Settings, then activated again, a reboot is always
	/// required.
	///
	/// ### .requiresRelaunch
	/// In earlier versions, a relaunch option was offered, if only one camera extension
	/// instance was found on the system. In our testing, however, a relaunch scenario was
	/// only detected after manually disabling the camera extension in System Settings,
	/// where a reboot is required. Therefore `requiresRelaunch` has been removed.
	var extensionState: SystemExtensionRequestManager.ExtensionState = .unknown {
		didSet {
			Task { await extensionStateDidChange(extensionState, oldState: oldValue) }
		}
	}

	// swiftlint:disable:next cyclomatic_complexity function_body_length
	private func extensionStateDidChange(_ state: SystemExtensionRequestManager.ExtensionState, oldState: SystemExtensionRequestManager.ExtensionState) async {
		guard oldState != state else { return }

		Logger.logMessage("Camera extension: \(state)", level: .info)
		Analytics.shared.logEvent(forNewState: extensionState, switchingFrom: oldState)

		await updateHybridWithVirtualCamera()
		await MainActor.run { cameraExtensionStateProvider.state = CameraExtensionStateProvider.State(extensionState: state) }

		switch state {
		case .unknown:
			Logger.logMessage("Camera extension state is unknown, which is valid while reloading.", level: .info)
		case let .error(error):
			Logger.logError(error, messagePrefix: "Camera extension encountered error")
		case .awaitingUserApproval, .disabled, .notInstalled:
			stopAndRemoveCameraHelper()
		case .installing:
			do {
				// Wait until the device UUID has become available or a timeout error is thrown.
				_ = try await CMIODeviceID.retrieveDeviceID(withUUID: VirtualCameraExtension.deviceUUID)
				Logger.logMessage("Camera extension is now available.", level: .info)
				extensionState = .installed
			} catch CMIODeviceID.DeviceIDRetrievalError.deviceIDUnavailableAfterMultipleAttempts {
				Logger.logMessage("Camera extension remains unavailable. Remediation is required to activate.", level: .info)
				extensionState = .requiresReboot
			} catch {
				Logger.logError(error, messagePrefix: "Failed activating camera extension", level: .info)
				extensionState = .requiresReboot
			}
		case .installed:
			do {
				let extensionInstancesCount: Int = try await cameraExtensionRequestManager.extensionProperties.count
				guard extensionInstancesCount == 1, oldState != .disabled else {
					Logger.logMessage("Camera extension has been re-enabled or re-installed. Remediation is required to activate.", level: .info)
					extensionState = .requiresReboot
					return
				}

				guard let deviceID: CMIODeviceID = CMIODeviceID.deviceID(withUUID: VirtualCameraExtension.deviceUUID) else {
					Logger.logMessage("Camera extension is unavailable, waiting for system to finish up installation.", level: .info)
					extensionState = .installing
					return
				}

				cameraHelper = try await configureCameraHelper(withDeviceID: deviceID)
			} catch {
				Logger.logError(error, messagePrefix: "Failed to configure camera helper", level: .fault)
				extensionState = .error(error)
			}
		case .needsUpdate:
			await activateCameraExtension()
		case .requiresReboot:
			await MainActor.run {
				cameraExtensionStateProvider.state = CameraExtensionStateProvider.State(extensionState: state)
			}
			if rebootAlertWasNotYetPresented {
				rebootAlertWasNotYetPresented = false
				await requestReboot()
			}
		case .uninstalling:
			stopAndRemoveCameraHelper()
			rebootAlertWasNotYetPresented = true
		}
	}

	/// Indicates whether a virtual camera producer is currently active,
	/// which requires updating it with virtual camera consumers.
	var virtualCameraProducerStarted: Bool = false

	@MainActor
	init() {
		StreamDeckManager.shared.start()
		cameraPermissionsHelper = CaptureDevicePermissionHelper(mediaType: .video)
		microphonePermissionsHelper = CaptureDevicePermissionHelper(mediaType: .audio)
		cameraExtensionStateProvider = CameraExtensionStateProvider()
		cameraExtensionRequestManager = SystemExtensionRequestManager(systemExtensionIdentifier: HybridCameraExtension.identifier)

		Task {
			await updatePermissionsHelperDelegates()
		}
	}

	func startDevices() async {
		Logger.logMessage("Starting devices.", level: .info)

		do {
			try await cameraExtensionRequestManager.start(withDelegate: self)
			try await updateExtensionState()
		} catch {
			Logger.logError(error, messagePrefix: "Failed to start devices", level: .fault)
		}
	}

	func stopDevices() async {
		Logger.logMessage("Stopping devices.", level: .info)

		await cameraExtensionRequestManager.stop()

		// The camera helper needs to properly close connections and
		// send analytics data before shutdown.
		stopAndRemoveCameraHelper()

		extensionState = .unknown
	}

	// FIXME: `StreamDeckConnection` can't be restarted, likely due to a bug, so `StreamDeckManager` can't participate
	// in `startDevices` and `stopDevices`, but still needs to be stoppable before app termination.
	@MainActor
	func stopStreamDeckManager() {
		Logger.logMessage("Stopping Stream Deck manager.", level: .info)
		StreamDeckManager.shared.stop()
	}

	func updateExtensionState() async throws {
		extensionState = try await cameraExtensionRequestManager.extensionState
	}

	@MainActor
	func requestReboot() {
		guard let delegate else {
			Logger.logMessage("No delegate to respond to reboot request.", level: .error)
			return
		}
		Logger.logMessage("Requesting reboot.", level: .info)
		delegate.deviceManagerRequestsReboot(self)
	}
}

extension DeviceManager {
	private func updatePermissionsHelperDelegates() async {
		await cameraPermissionsHelper.updateDelegate(self)
		await microphonePermissionsHelper.updateDelegate(self)
	}

	private func configureCameraHelper(withDeviceID deviceID: CMIODeviceID) async throws -> CameraHelper {
		Logger.logMessage("Configuring camera helper.", level: .info)

		let cameraHelper = try CameraHelper(deviceID: deviceID)
		try cameraHelper.start(withDelegate: self)

		return cameraHelper
	}

	private func stopAndRemoveCameraHelper() {
		guard let cameraHelper else { return }
		Logger.logMessage("Stopping camera helper", level: .info)
		cameraHelper.stop()
		self.cameraHelper = nil
	}
}

extension DeviceManager {
	var cameraPermissionStatus: AVAuthorizationStatus {
		get async {
			await cameraPermissionsHelper.authorizationStatus
		}
	}

	var microphonePermissionStatus: AVAuthorizationStatus {
		get async {
			await microphonePermissionsHelper.authorizationStatus
		}
	}

	var virtualCameraStatus: SystemExtensionRequestManager.ExtensionState {
		get async throws {
			// `cameraExtensionRequestManager.extensionState` would be most accurate,
			// but some superseding states are determined by this class.
			extensionState
		}
	}

	enum CapturePermissionRequestableDevice {
		case camera
		case microphone
	}

	/// Requests capture device permissions if a device's current status was not determined yet.
	///
	/// This is helpful in both requesting permissions explicitly, as well as obtaining the
	/// right to request permission status from the system when permissions were requested
	/// implicitly through the app making use of capture devices. In the latter scenario, the
	/// system prompts the user on behalf of the app, but does not let the app see the
	/// updated authorization status until either the app has relaunched or it explicitly
	/// requested authorization status.
	func requestPermissions(for devices: [CapturePermissionRequestableDevice]) async {
		Logger.logMessage("Requesting capture device permissions.", level: .info)

		if devices.contains(.camera), await cameraPermissionStatus == .notDetermined {
			do {
				try await cameraPermissionsHelper.requestAuthorization()
			} catch {
				Logger.logError(error, messagePrefix: "Failed to request camera capture permission")
			}
		}
		if devices.contains(.microphone), await microphonePermissionStatus == .notDetermined {
			do {
				try await microphonePermissionsHelper.requestAuthorization()
			} catch {
				Logger.logError(error, messagePrefix: "Failed to request microphone capture permission")
			}
		}
	}
}

extension DeviceManager {
	struct Info {
		let cameraPermissionStatus: String
		let microphonePermissionStatus: String
		let virtualCameraStatus: String
	}

	var info: Info {
		get async {
			let virtualCameraStatusDescription: String
			do {
				virtualCameraStatusDescription = try await virtualCameraStatus.description
			} catch {
				virtualCameraStatusDescription = error.localizedDescription
			}

			return await .init(
				cameraPermissionStatus: cameraPermissionStatus.description,
				microphonePermissionStatus: microphonePermissionStatus.description,
				virtualCameraStatus: virtualCameraStatusDescription
			)
		}
	}
}

extension DeviceManager {
	@MainActor
	class CameraExtensionStateProvider {
		@Published var state: State = .unknown
	}
}

extension DeviceManager.CameraExtensionStateProvider {
	enum State: ReflectiveEquatable {
		case unknown
		case notInstalled
		case awaitingUserApproval
		case installing
		case installed(streamClients: [StreamingClient])
		case requiresReboot
		case needsUpdate
		case uninstalling
		case error(Swift.Error)

		init(extensionState: SystemExtensionRequestManager.ExtensionState) {
			self = switch extensionState {
			case .unknown: .unknown
			case .notInstalled: .notInstalled
			case .awaitingUserApproval, .disabled: .awaitingUserApproval
			case .installing: .installing
			case .installed: .installed(streamClients: [])
			case .requiresReboot: .requiresReboot
			case .needsUpdate: .needsUpdate
			case .uninstalling: .uninstalling
			case let .error(error): .error(error)
			}
		}
	}
}

// MARK: - Notification Watchdog

extension DeviceManager {
	func configureNotificationWatchdog() async {
		let handler: NotificationWatchdog.Handler = { [weak self] (result: Result<Bool, Swift.Error>) in
			guard let self else { return }

			switch result {
			case let .success(notificationWasObserved):
				guard notificationWasObserved == false else { break }

				Logger.logMessage("Activation request was not honored by the system by presenting a UI.", level: .info)

				Task { [weak self] in
					guard let self else { return }

					let localExtensionState: SystemExtensionRequestManager.ExtensionState = await extensionState
					guard [.installing, .installed, .requiresReboot, .needsUpdate].contains(localExtensionState) == false else {
						// When re-authorizing a disabled system extension, some systems
						// do not require manual user interaction in the System Settings.
						Logger.logMessage("Skipping opening System Settings because camera extension is already active.", level: .info)
						return
					}

					Logger.logMessage("Opening System Settings to allow manual activation of the camera extension.", level: .info)
					NSWorkspace.shared.open(Constants.systemPreferencesApprovalURL)
				}
			case let .failure(error):
				Logger.logError(error, messagePrefix: "Failed observing key window resignation")
			}

			removeNotificationWatchdog()
		}

		notificationWatchdog = await NotificationWatchdog(notificationName: NSWindow.didResignKeyNotification,
														  handler: handler)
	}

	private nonisolated func removeNotificationWatchdog() {
		Task { await isolatedRemoveNotificationWatchdog() }
	}

	private func isolatedRemoveNotificationWatchdog() {
		notificationWatchdog = nil
	}
}
