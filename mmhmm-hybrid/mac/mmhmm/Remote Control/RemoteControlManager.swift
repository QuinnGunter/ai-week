//
//  RemoteControlManager.swift
//  mmhmm
//
//  Created by Beni Federer on 21.05.25.
//

import AppKit

import Common

/// Manages the remote control and communication with it.
///
/// The remote control can either be "local" to this process
/// or running "remotely" in another process. In both cases,
/// the remote control is accessible from the menu bar. Since
/// this functionality should not be duplicated, both localities
/// are mutually exclusive, so that either the one or the other
/// is available, but never both.
@MainActor
final class RemoteControlManager {
	init(
		appState: AppState,
		browser: Browser,
		cameraExtensionStateProvider: DeviceManager.CameraExtensionStateProvider,
		loginItemInstaller: LoginItemInstaller
	) {
		changeObserver = RemoteControlState.ChangeObserver(appState: appState, browser: browser, cameraExtensionStateProvider: cameraExtensionStateProvider)
		remoteReceiver = RemoteReceiver(appState: appState, browser: browser, cameraExtensionStateProvider: cameraExtensionStateProvider)
		self.loginItemInstaller = loginItemInstaller
	}

	private var state: State = .stopped {
		didSet {
			// The login item might have been disabled or enabled by the user,
			// which the login item installer can't observe directly.
			loginItemInstaller.updateStatus()
		}
	}

	private let changeObserver: RemoteControlState.ChangeObserver
	private let loginItemInstaller: LoginItemInstaller
	private let remoteReceiver: RemoteReceiver
}

extension RemoteControlManager {
	/// Determines whether the manager is currently running,
	/// i.e. if it was started and has not yet stopped.
	var isRunning: Bool {
		state != .stopped
	}

	/// Starts the manager.
	///
	/// If the login item is installed, it is configured as remote control.
	/// Otherwise, a status item serving as the remote control is presented,
	/// for as long as the manager lives.
	func start() {
		do {
			guard state == .stopped else {
				throw Error.invalidState(state.description)
			}

			loginItemInstaller.delegate = self
			state = configure(with: loginItemInstaller.status)
		} catch {
			Logger.logError(error, messagePrefix: "Failed to start")
		}
	}

	/// Stops the manager.
	func stop() {
		do {
			switch state {
			case let .startedXPCProxy(menuBarProxy, changeObserver):
				changeObserver.stop()
				Task { try? await menuBarProxy.stop() }
			case let .startedStatusItem(statusItemManager):
				statusItemManager.removeStatusItem()
			case let .waitingForXPCProxy(menuBarProxy, startMenuBarProxyTask):
				startMenuBarProxyTask.cancel()
				Task { try? await menuBarProxy.stop() }
			case let .startedStatusItemWaitingForXPCProxy(statusItemManager, menuBarProxy, startMenuBarProxyTask):
				statusItemManager.removeStatusItem()
				startMenuBarProxyTask.cancel()
				Task { try? await menuBarProxy.stop() }
			case .stopped:
				throw Error.invalidState(state.description)
			}

			Logger.logMessage("Stopped.", level: .info)
		} catch {
			Logger.logError(error, messagePrefix: "Failed to stop")
		}

		state = .stopped
	}

	/// Opens the menu bar settings.
	///
	/// - Throws: An error if the manager is not in a state
	///           where the menu bar proxy is available.
	func openMenuBarSettings() throws {
		guard case let .startedXPCProxy(menuBarProxy, _) = state else {
			throw Error.invalidState(state.description)
		}

		Logger.logMessage("Opening menu bar settings...", level: .debug)
		menuBarProxy.openSettings()
	}
}

extension RemoteControlManager {
	private enum State: ReflectiveEquatable, CustomStringConvertible {
		case startedStatusItem(statusItemManager: StatusItemManager)
		case startedXPCProxy(menuBarProxy: AirtimeMenuProxy, changeObserver: RemoteControlState.ChangeObserver)
		case waitingForXPCProxy(menuBarProxy: AirtimeMenuProxy, startMenuBarProxyTask: Task<Void, Swift.Error>)
		case startedStatusItemWaitingForXPCProxy(statusItemManager: StatusItemManager, menuBarProxy: AirtimeMenuProxy, startMenuBarProxyTask: Task<Void, Swift.Error>)
		case stopped

		var description: String {
			switch self {
			case .startedStatusItem: "startedStatusItem"
			case .startedXPCProxy: "startedXPCProxy"
			case .waitingForXPCProxy: "startedWaitingForXPCProxy"
			case .startedStatusItemWaitingForXPCProxy: "startedStatusItemWaitingForXPCProxy"
			case .stopped: "stopped"
			}
		}
	}
}

extension RemoteControlManager {
	private func restart() {
		stop()
		start()
	}

	private func configure(with loginItemStatus: LoginItemInstaller.Status) -> State {
		switch loginItemStatus {
		case .unavailable, .notInstalled:
			return .stopped
		case .enabled, .disabled:
			// Start login item and wait until the XPC proxy is available.
			let (menuBarProxy, startMenuBarProxyTask) = configureMenuBarProxy()
			return .waitingForXPCProxy(menuBarProxy: menuBarProxy, startMenuBarProxyTask: startMenuBarProxyTask)
		}
	}

	private func configureMenuBarProxy() -> (AirtimeMenuProxy, Task<Void, Swift.Error>) {
		let menuBarProxy = AirtimeMenuProxy(remoteReceiver: remoteReceiver, delegate: self)
		let startMenuBarProxyTask = Task<Void, Swift.Error> { [weak self] in
			do {
				try await self?.startMenuBarProxy(menuBarProxy)
			} catch {
				// This is unlikely to occur with indefinite retrying,
				// but handle this case nonetheless.
				Logger.logError(error, messagePrefix: "Failed retrying to start menu bar proxy")
				if let self {
					Logger.logMessage("Falling back to status item.", level: .info)
					self.state = self.configure(with: .unavailable)
				}
			}
		}
		return (menuBarProxy, startMenuBarProxyTask)
	}

	private func configureStatusItemManager() -> StatusItemManager {
		let statusItemManager = StatusItemManager(remoteReceiver: remoteReceiver)
		statusItemManager.presentStatusItem()
		return statusItemManager
	}

	/// Starts the menu bar proxy and updates it with the current state.
	///
	/// If starting fails, it is retried indefinitely every 5 seconds.
	///
	/// This method may block until the connection was established, which
	/// might be forever, if the menu bar app XPC service does not come online.
	private func startMenuBarProxy(_ menuBarProxy: AirtimeMenuProxy) async throws {
		Logger.logMessage("Starting menu bar proxy discovery.", level: .info)
		// Attempt to start the menu bar proxy every five seconds, indefinitely.
		_ = try await Retry(logIdentifier: "start menu bar proxy") {
			do {
				try await menuBarProxy.start()
				return true
			} catch {
				Logger.logError(error, messagePrefix: "Failed to start menu bar proxy", level: .debug)
				return nil
			}
		}.attempt(.max, interval: .seconds(5))

		Logger.logMessage("Discovered menu bar proxy.", level: .info)

		await MainActor.run { [weak self] in
			guard let self else { return }
			self.updateMenuBarProxy(menuBarProxy)
			self.changeObserver.start { [weak self] in
				self?.updateMenuBarProxy(menuBarProxy)
			}

			// Dropping the status item manager automatically removes the status item, if it was presented.
			self.state = .startedXPCProxy(menuBarProxy: menuBarProxy, changeObserver: self.changeObserver)
		}

		// Check if the running menu bar app has an update.
		await checkVersion(menuBarProxy)
	}

	/// Updates the menu bar proxy with the current remote receiver state.
	private func updateMenuBarProxy(_ menuBarProxy: AirtimeMenuProxy) {
		Logger.logMessage("Updating menu bar proxy with state...", level: .debug)
		menuBarProxy.update(with: remoteReceiver.state)
		Logger.logMessage("Updated menu bar proxy with state.", level: .debug)
	}

	private func checkVersion(_ menuBarProxy: AirtimeMenuProxy) async {
		do {
			let version: String = try await menuBarProxy.version
			guard version != "Unknown" else {
				Logger.logMessage("Proxy version is unknown.", level: .error)
				return
			}
			try loginItemInstaller.checkForUpdate(to: version)
		} catch {
			Logger.logError(error, messagePrefix: "Failed to check proxy version")
		}
	}
}

extension RemoteControlManager: AirtimeMenuProxyDelegate {
	nonisolated func proxyConnectionStopped(_ proxy: AirtimeMenuProxy) {
		Task { @MainActor in
			switch state {
			case .startedXPCProxy:
				restart()
			case .startedStatusItemWaitingForXPCProxy, .waitingForXPCProxy:
				// Waiting on the XPC proxy is handled by `startMenuBarProxyTask` and must not be restarted from here.
				break
			default:
				// This can occur late after switching away from `.startedXPCProxy` when the XPC service stopped.
				Logger.logMessage("Proxy connection stopped in state: \(state.description)", level: .info)
			}
		}
	}
}

extension RemoteControlManager: LoginItemInstallerDelegate {
	nonisolated func loginItemWasInstalled(_ installer: LoginItemInstaller) {
		Task { @MainActor in restart() }
	}

	nonisolated func loginItemWasUninstalled(_ installer: LoginItemInstaller) {
		Task { @MainActor in restart() }
	}

	nonisolated func loginItemWillUpdate(_ installer: LoginItemInstaller) {
		Task { @MainActor in stop() }
	}

	nonisolated func loginItemDidUpdate(_ installer: LoginItemInstaller) {
		Task { @MainActor in start() }
	}

	nonisolated func loginItemFailedToUpdate(_ installer: LoginItemInstaller, error: Swift.Error) {
		Task { @MainActor in
			start()
			let informativeText: String = error.localizedDescription + "\n\n" + String(localized: "Please try installing the login item from the app menu again.")
			NSAlert.showAlert(withMessageText: String(localized: "Login item update failed"), informativeText: informativeText)
		}
	}
}

extension RemoteControlManager {
	enum Error {
		case invalidState(String)
	}
}

extension RemoteControlManager.Error: BaseErrorWithAssociatedValues {
	static let domain: String = String(describing: Self.self)

	var errorMessage: String {
		switch self {
		case let .invalidState(state):
			"Invalid state: \(state)"
		}
	}

	static let allCases: [RemoteControlManager.Error] = [
		.invalidState(""),
	]
}
