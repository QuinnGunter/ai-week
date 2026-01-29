//
//  SystemExtensionRequestManager.swift
//  CameraExtensionHost
//
//  Created by Beni Federer on 28.10.24.
//

import AppKit
import SystemExtensions

import Common

public protocol SystemExtensionRequestManagerDelegate: AnyObject {
	func systemExtensionRequestManager(_ manager: SystemExtensionRequestManager, didUpdateExtensionState extensionState: SystemExtensionRequestManager.ExtensionState)
	func systemExtensionRequestManager(_ manager: SystemExtensionRequestManager, didFailWithError error: Error)
	func systemExtensionRequestManager(_ manager: SystemExtensionRequestManager, replacesExtension existingExtension: OSSystemExtensionProperties, withExtension extension: OSSystemExtensionProperties)
}

/// An actor managing requests for a system extension.
///
/// The manager can be used to activate and deactivate
/// a system extension. The class, once started, also
/// observes system extension state and informs its
/// `SystemExtensionRequestManagerDelegate` about changes.
public actor SystemExtensionRequestManager {
	/// The bundle identifier of the system extension.
	public let identifier: String

	/// The state of the system extension.
	///
	/// This is a mapping of the state the system records
	/// of an extension, extended by custom state additions.
	public var extensionState: ExtensionState {
		get async throws {
			let request: OSSystemExtensionRequest = requestDelegate.propertiesRequest(forExtensionWithIdentifier: identifier)
			return try await submitRequest(request, type: .properties)
		}
	}

	/// The properties of all system extensions matching `identifier`.
	///
	/// The same extension can be present on the system in multiple
	/// versions and states. As of macOS 15.2, the system performs
	/// a cleanup of uninstalling extensions only through a reboot.
	public var extensionProperties: [OSSystemExtensionProperties] {
		get async throws {
			let request: OSSystemExtensionRequest = requestDelegate.propertiesRequest(forExtensionWithIdentifier: identifier)
			return try await submitPropertiesRequest(request)
		}
	}

	/// An internal delegate encapsulating system callbacks.
	private let requestDelegate: SystemDelegate

	/// The manager's delegate.
	private weak var delegate: SystemExtensionRequestManagerDelegate?

	/// Used to track the orderly progress of requests.
	private var requestState: RequestState = .idle

	private enum RequestState: ReflectiveEquatable, Sendable {
		case idle
		case requesting(OSSystemExtensionRequest, type: RequestType, continuation: CheckedContinuation<ExtensionState, Never>)
		case requestingProperties(OSSystemExtensionRequest, continuation: CheckedContinuation<[OSSystemExtensionProperties], Never>)
	}

	private enum RequestType: Equatable, Sendable {
		case activation
		case deactivation
		case properties
	}

	/// Used for system extension state observance purposes.
	///
	/// Prior to macOS 15.1, the system had no support for
	/// system extension state change notifications. Since
	/// users are able to disable or uninstall system extensions
	/// manually, the only other indicator for potential state
	/// changes is switching away from the system extension
	/// host app to, for example, the System Preferences or
	/// Terminal apps. After switching back, the previously
	/// recorded state has then to be compared against a potentially
	/// changed new state.
	private var extensionStateWhenApplicationResignedActive: ExtensionState = .unknown

	public init(systemExtensionIdentifier: String) {
		requestDelegate = SystemDelegate(systemExtensionIdentifier: systemExtensionIdentifier)
		identifier = systemExtensionIdentifier
		requestDelegate.manager = self
	}

	/// Starts observing the system extension state.
	public func start(withDelegate delegate: SystemExtensionRequestManagerDelegate?) async throws {
		self.delegate = delegate

		if #available(macOS 15.1, *) {
			try requestDelegate.startObserving()
		} else {
			await MainActor.run {
				addApplicationObservance()
			}
		}
	}

	/// Stops observing the system extension state.
	public func stop() async {
		delegate = nil
		extensionStateWhenApplicationResignedActive = .unknown

		if #available(macOS 15.1, *) {
			requestDelegate.stopObserving()
		} else {
			await MainActor.run {
				removeApplicationObservance()
			}
		}
	}

	/// Requests activation of the system extension.
	///
	/// - Returns: The system extension state after successful submission of the request.
	/// - Throws: An error describing the failure submitting the request.
	public func requestActivation() async throws -> ExtensionState {
		let extensionState: ExtensionState = try await extensionState
		guard extensionState.allowsInstallation else {
			throw Error.failedWithRequestUnavailableInCurrentState(extensionState)
		}
		let request: OSSystemExtensionRequest = requestDelegate.activationRequest(forExtensionWithIdentifier: identifier)
		let extensionStateAfterRequest: ExtensionState = try await submitRequest(request, type: .activation)

		// TODO: This is a crutch that should be addressed by a proper refactor.
		//
		// So far, we assumed that an activation request coming back with the state
		// `.completed` was equivalent to the `activated enabled` state, which we
		// represent with `.installed`. However, the system also returns `.completed`
		// if the extension remains in `activated disabled`, which we represent with
		// `.disabled`. This could be a system bug, but it highlights the fact that receiving
		// the result of de/activation requests can not automatically be understood as
		// a specific state, but that the state might have changed and must be queried.
		return if extensionStateAfterRequest == .installed {
			try await self.extensionState
		} else {
			extensionStateAfterRequest
		}
	}

	/// Requests deactivation of the system extension.
	///
	/// - Returns: The system extension state after successful submission of the request.
	/// - Throws: An error describing the failure submitting the request.
	public func requestDeactivation() async throws -> ExtensionState {
		let extensionState: ExtensionState = try await extensionState
		guard extensionState.allowsUninstallation else {
			throw Error.failedWithRequestUnavailableInCurrentState(extensionState)
		}
		let request: OSSystemExtensionRequest = requestDelegate.deactivationRequest(forExtensionWithIdentifier: identifier)
		return try await submitRequest(request, type: .deactivation)
	}
}

// MARK: - Request Submission and Result Evaluation

extension SystemExtensionRequestManager {
	private func submitRequest(_ request: OSSystemExtensionRequest, type: RequestType) async throws -> ExtensionState {
		while requestState != .idle {
			try await Task.sleep(for: .milliseconds(1))
		}

		let updatedExtensionState: ExtensionState = await withCheckedContinuation { continuation in
			requestState = .requesting(request, type: type, continuation: continuation)
			requestDelegate.submitRequest(request)
		}
		requestState = .idle

		switch updatedExtensionState {
		case let .error(error):
			throw error
		case .unknown:
			throw Error.unknownState
		default:
			return updatedExtensionState
		}
	}

	private func submitPropertiesRequest(_ request: OSSystemExtensionRequest) async throws -> [OSSystemExtensionProperties] {
		while requestState != .idle {
			try await Task.sleep(for: .milliseconds(1))
		}

		defer { requestState = .idle }

		return await withCheckedContinuation { continuation in
			requestState = .requestingProperties(request, continuation: continuation)
			requestDelegate.submitRequest(request)
		}
	}

	private func updateState(_ updatedExtensionState: ExtensionState, forRequest request: OSSystemExtensionRequest) {
		guard case let .requesting(openRequest, _, continuation) = requestState, request == openRequest else {
			delegate?.systemExtensionRequestManager(self, didFailWithError: Error.failedWithNonCriticalInconsistentRequestUpdate)
			return
		}
		continuation.resume(returning: updatedExtensionState)
	}

	private func updateState(forRequest request: OSSystemExtensionRequest, withResult result: OSSystemExtensionRequest.Result) {
		guard case let .requesting(openRequest, type, continuation) = requestState, request == openRequest, type != .properties else {
			// Request updates occur outside of the API flow this actor exposes, i.e. while idle. These updates are likely
			// to duplicate already available state, but at the very least they are supposed to be accurate and therefore are
			// forwarded to the delegate.
			if request.isActivationRequest {
				notifyDelegate(ofUpdatedExtensionState: result == .completed ? .installed : .requiresReboot)
			} else if request.isDeactivationRequest {
				notifyDelegate(ofUpdatedExtensionState: result == .completed ? .uninstalling : .requiresReboot)
			} else {
				delegate?.systemExtensionRequestManager(self, didFailWithError: Error.failedWithInconsistentRequestUpdate)
			}
			return
		}

		let updatedExtensionState: ExtensionState
		switch result {
		case .completed:
			switch type {
			case .activation: updatedExtensionState = .installed
			case .deactivation: updatedExtensionState = .uninstalling
			case .properties: updatedExtensionState = .unknown
			}
		case .willCompleteAfterReboot: updatedExtensionState = .requiresReboot
		@unknown default: updatedExtensionState = .unknown
		}

		continuation.resume(returning: updatedExtensionState)
	}

	// swiftlint:disable:next cyclomatic_complexity
	private func updateState(withProperties properties: [OSSystemExtensionProperties], forRequest request: OSSystemExtensionRequest) {
		switch requestState {
		case .idle:
			delegate?.systemExtensionRequestManager(self, didFailWithError: Error.failedWithInconsistentRequestUpdate)
		case let .requesting(openRequest, _, continuation):
			guard openRequest == request else {
				delegate?.systemExtensionRequestManager(self, didFailWithError: Error.failedWithInconsistentRequestUpdate)
				return
			}

			guard let mostRelevantProperties: OSSystemExtensionProperties = properties.mostRelevant else {
				continuation.resume(returning: .notInstalled)
				return
			}

			let extensionState: ExtensionState = switch mostRelevantProperties.activationState {
			case .enabled:
				if mostRelevantProperties.isOlderThanSystemExtensionBundle(withIdentifier: identifier) {
					.needsUpdate
				} else {
					.installed
				}
			case .disabled:
				.disabled
			case .awaitingUserApproval:
				.awaitingUserApproval
			case .uninstalling:
				.uninstalling
			}

			continuation.resume(returning: extensionState)
		case let .requestingProperties(openRequest, continuation):
			guard openRequest == request else {
				delegate?.systemExtensionRequestManager(self, didFailWithError: Error.failedWithInconsistentRequestUpdate)
				return
			}
			continuation.resume(returning: properties)
		}
	}
}

// MARK: - System Extension State Observance

extension SystemExtensionRequestManager {
	private func notifyDelegate(ofUpdatedExtensionState extensionState: ExtensionState) {
		delegate?.systemExtensionRequestManager(self, didUpdateExtensionState: extensionState)
	}

	private func notifyDelegate(ofReplacingExtension existingExtension: OSSystemExtensionProperties, withExtension otherExtension: OSSystemExtensionProperties) {
		delegate?.systemExtensionRequestManager(self, replacesExtension: existingExtension, withExtension: otherExtension)
	}

	private func updateExtensionStateWhenApplicationResignedActive() async {
		do {
			extensionStateWhenApplicationResignedActive = try await extensionState
		} catch {
			delegate?.systemExtensionRequestManager(self, didFailWithError: error)
		}
	}

	private func checkExtensionStateWhenApplicationBecomesActive() async {
		do {
			let extensionState: ExtensionState = try await extensionState
			if try await extensionState != extensionStateWhenApplicationResignedActive {
				notifyDelegate(ofUpdatedExtensionState: extensionState)
			}
		} catch {
			delegate?.systemExtensionRequestManager(self, didFailWithError: error)
		}
	}

	@MainActor
	private func addApplicationObservance() {
		NotificationCenter.default.addObserver(forName: NSApplication.didResignActiveNotification,
											   object: NSApplication.shared,
											   queue: .main) { _ in
			Task {
				await self.updateExtensionStateWhenApplicationResignedActive()
			}
		}

		NotificationCenter.default.addObserver(forName: NSApplication.didBecomeActiveNotification,
											   object: NSApplication.shared,
											   queue: .main) { _ in
			Task {
				await self.checkExtensionStateWhenApplicationBecomesActive()
			}
		}
	}

	@MainActor
	private func removeApplicationObservance() {
		NotificationCenter.default.removeObserver(self, name: NSApplication.didBecomeActiveNotification, object: NSApplication.shared)
		NotificationCenter.default.removeObserver(self, name: NSApplication.didResignActiveNotification, object: NSApplication.shared)
	}
}

// MARK: - System Extension State Update Callbacks

/// An extension implementing the `SystemExtensionRequestDelegate` callbacks caught by `SystemExtensionRequestDelegate`.
/// Functions are intentionally `nonisolated` to enforce use of `updateState(:forRequest:)`, instead of setting `state` directly.
extension SystemExtensionRequestManager {
	nonisolated func request(_ request: OSSystemExtensionRequest, actionForReplacingExtension existing: OSSystemExtensionProperties, withExtension ext: OSSystemExtensionProperties) -> OSSystemExtensionRequest.ReplacementAction {
		Task { await notifyDelegate(ofReplacingExtension: existing, withExtension: ext) }
		return .replace
	}

	nonisolated func requestNeedsUserApproval(_ request: OSSystemExtensionRequest) {
		Task { await updateState(.awaitingUserApproval, forRequest: request) }
	}

	nonisolated func request(_ request: OSSystemExtensionRequest, didFinishWithResult result: OSSystemExtensionRequest.Result) {
		Task { await updateState(forRequest: request, withResult: result) }
	}

	nonisolated func request(_ request: OSSystemExtensionRequest, didFailWithError error: any Swift.Error) {
		Task { await updateState(.error(error), forRequest: request) }
	}

	nonisolated func request(_ request: OSSystemExtensionRequest, foundProperties properties: [OSSystemExtensionProperties]) {
		Task { await updateState(withProperties: properties, forRequest: request) }
	}
}

/// An extension implementing the `OSSystemExtensionsWorkspaceObserver` callbacks caught by `SystemExtensionRequestDelegate`.
extension SystemExtensionRequestManager {
	/// Called when a system extension has been validated and allowed by the user to run.
	nonisolated func systemExtensionWillBecomeEnabled(version: String, shortVersion: String) {
		Task { await notifyDelegate(ofUpdatedExtensionState: .installed) }
	}

	/// Called when the user disables an already enabled system extension, or when the
	/// system extension is first installed and is in the disabled state.
	nonisolated func systemExtensionWillBecomeDisabled(version: String, shortVersion: String) {
		Task { await notifyDelegate(ofUpdatedExtensionState: .awaitingUserApproval) }
	}

	/// Called when a system extension is deactivated and is about to get uninstalled.
	/// The extension may still be running until the system is rebooted.
	nonisolated func systemExtensionWillBecomeInactive(version: String, shortVersion: String) {
		Task {
			/// 15.1: This callback fires after `systemExtensionWillBecomeDisabled` when
			/// re-requesting activation while the user approval is still pending. This is
			/// neither helpful nor the correct state from the perspective of this actor.
			guard let extensionState = try? await extensionState, extensionState != .awaitingUserApproval else { return }
			await notifyDelegate(ofUpdatedExtensionState: .uninstalling)
		}
	}
}

// MARK: - Errors

extension SystemExtensionRequestManager {
	public enum Error: Swift.Error {
		case failedWithRequestUnavailableInCurrentState(ExtensionState)
		case failedWithRequestUnavailableWhileRequestIsPending
		case failedWithInconsistentRequestUpdate
		case failedWithNonCriticalInconsistentRequestUpdate
		case unknownState
	}
}

extension SystemExtensionRequestManager.Error: BaseErrorWithAssociatedValues {
	public static let domain: String = String(describing: Self.self)

	public var errorMessage: String {
		switch self {
		case let .failedWithRequestUnavailableInCurrentState(state):
			"Request cannot be submitted in current state: \(state)"
		case .failedWithRequestUnavailableWhileRequestIsPending:
			"Request cannot be submitted while another request is pending."
		case .failedWithInconsistentRequestUpdate:
			"Request update is inconsistent."
		case .failedWithNonCriticalInconsistentRequestUpdate:
			"Request update is inconsistent, but deemed non-critical."
		case .unknownState:
			"State is unknown."
		}
	}

	public static var allCases: [SystemExtensionRequestManager.Error] {
		[
			.failedWithRequestUnavailableInCurrentState(.unknown),
			.failedWithRequestUnavailableWhileRequestIsPending,
			.failedWithInconsistentRequestUpdate,
			.failedWithNonCriticalInconsistentRequestUpdate,
			.unknownState,
		]
	}
}
