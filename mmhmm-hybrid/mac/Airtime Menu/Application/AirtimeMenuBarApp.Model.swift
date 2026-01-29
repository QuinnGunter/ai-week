//
//  AirtimeMenuBarApp.Model.swift
//  mmhmm
//
//  Created by Beni Federer on 20.05.25.
//

// swiftlint:disable file_length

import struct os.Logger
import ServiceManagement
import SwiftUI

import CameraExtensionHost
import Common

extension AirtimeMenuBarApp {
	/// A model encapsulating all state management for the menu bar app.
	///
	/// Communication flows bidirectionally:
	///
	/// * SwiftUI view bindings -> `Model` instance -> XPC proxy protocol `RemoteControlled` -> Airtime main app
	/// * Airtime main app -> XPC proxy protocol `RemoteControlling` -> `Model` instance -> SwiftUI view bindings
	///
	/// This class persists some state to default user defaults.
	@MainActor
	final class Model: ObservableObject {
		init() {
			Self.setUpLogFileLocation()

			guard let serviceName: String = Bundle.main.bundleIdentifier else {
				Logger.logMessage("Failed to determine bundle identifier, terminating...", level: .error)
				fatalError("Failed to determine bundle identifier.")
			}

			let remoteControl = AirtimeMenuBarProxy()
			self.remoteControl = remoteControl

			mainAppProxy = MainAppProxy(serviceName: serviceName, remoteControl: remoteControl)

			logSummary()

			Task { [weak self] in
				guard let self else { return }
				await self.startMonitoring()
				await self.userNotifier.requestPermission()
				await self.hotKeyProcessor.start(registrations: self.hotKeyRegistrations)
			}
		}

		/// The identifier of the Airtime app bundle, which contains the menu bar app bundle
		private static let mainAppBundleIdentifier: String = "app.mmhmm.hybrid"

		/// Whether Airtime should be automatically launched
		/// whenever a new virtual camera stream client connects.
		@AppStorage("autoLaunchAirtime") var autoLaunchAirtime: Bool = true

		/// Which app mode Airtime should automatically be launched with.
		@AppStorage("autoLaunchMode") var autoLaunchMode: LaunchMode = .lastUsed

		/// The registered hotkey configurations.
		@Persisted(
			toStorage: .standard,
			key: UserDefaults.mmhmmKey.AirtimeMenuBarAppModel.hotKeyRegistrations,
			defaultValue: .value(.default)
		)
		private(set) var hotKeyRegistrations: [HotKeyRegistration] {
			didSet {
				let registrationsChanged: Bool = hotKeyRegistrations.isFunctionallyEqual(to: oldValue) == false

				Task {
					await updateHotKeyProcessor(witRegistrations: hotKeyRegistrations, registrationsChanged: registrationsChanged)
				}

				// Always update subscribers, even if registrations didn't change, so UI has a chance to update.
				objectWillChange.send()
			}
		}

		var hotKeyRegistrationsAreDefaults: Bool {
			hotKeyRegistrations.isFunctionallyEqual(to: .default)
		}

		/// Determines whether the XPC connection to Airtime is active.
		@Published var isActive: Bool = false {
			didSet {
				if isActive {
					mainAppProxy.activate()
				} else {
					mainAppProxy.deactivate()
				}
			}
		}

		/// Whether Airtime is connected or not.
		@Published private(set) var isConnectedToAirtime: Bool = false {
			didSet {
				Task { await refreshPingState() }
			}
		}

		@Published private(set) var pingState: PingState = .succeeded

		/// Monitors virtual camera stream clients.
		@Published private(set) var streamClientsMonitor: StreamClientsMonitor?

		/// The state of the Airtime remote control, which
		/// this model represents to the menu bar app.
		///
		/// Non-`nil` whenever Airtime is connected.
		@Published private(set) var remoteControlState: RemoteControlState? {
			didSet {
				if remoteControlState?.virtualCameraIsAvailable ?? false, streamClientsMonitor == nil {
					// If the stream clients monitor was unable to connect to the camera system extension
					// at launch, because it was unavailable, the first time Airtime advertises it as available
					// marks the installation, which is when the stream clients monitor must be restarted again.
					// Re-installations fail to work until the system was rebooted, anyway, so left ignored.
					Logger.logMessage("Virtual camera is available, starting stream clients monitor.", level: .info)
					streamClientsMonitor = configureStreamClientsMonitor()
				}
			}
		}

		/// A proxy for the Airtime main app on the other side of an XPC connection.
		@Published private(set) var mainAppProxy: MainAppProxy

		@Published private(set) var virtualCameraHasClients: Bool = false

		/// The app mode to switch to once launched.
		///
		/// If this app runs sandboxed, the system ignores command line arguments
		/// like the requested app mode passed on the command line. This property
		/// ensures that the targeted app mode is set again after Airtime was launched.
		/// If Airtime is already running in the targeted app mode, nothing happens.
		private var requestedLaunchMode: LaunchMode?

		/// The proxy object Airtime communicates with.
		private let remoteControl: AirtimeMenuBarProxy

		/// Posts user notifications when Airtime is launched because an app connected.
		private let userNotifier = UserNotifier()

		/// Processes global hotkeys.
		private lazy var hotKeyProcessor = HotKeyProcessor(delegate: self)

		/// Opens windows using SwiftUI's environment-based mechanism.
		@Environment(\.openWindow) private var openWindow
	}
}

extension AirtimeMenuBarApp.Model: HotKeyProcessorDelegate {
	nonisolated func executeHotKeyAction(_ action: HotKeyAction) {
		Task { @MainActor in
			switch action {
			case .toggleScreenRecorder:
				self.toggleScreenRecorder()
			case .recordScreen:
				self.recordScreen()
			case .recordWindow:
				self.recordWindow()
			#if DEBUG
			case .dummyAction:
				Logger.logMessage("Executed dummy action hotkey.", level: .debug)
			#endif
			}
		}
	}
}

extension AirtimeMenuBarApp.Model {
	/// Resets all hotkey registrations to their default values.
	func resetHotKeyRegistrations() {
		hotKeyRegistrations = .default
	}

	/// Temporarily suspends global hotkey listening (e.g., while recording a new hotkey).
	func suspendHotKeyListening() {
		Task {
			// Ensure the processor is running before stopping it,
			// since multiple hotkey recording sessions may be started
			// due to users switching between multiple hotkey fields.
			guard await hotKeyProcessor.isRunning else { return }
			await hotKeyProcessor.stop()
		}
	}

	/// Resumes global hotkey listening after suspension.
	func resumeHotKeyListening() {
		// Re-apply existing registrations to force the processor to update its state,
		// if it's not already running with the same registrations.
		//
		// Since the property should be the only synchronization point with the processor,
		// updating it like this ensures that state updates are consistently applied to both
		// the model and the processor.
		hotKeyRegistrations = hotKeyRegistrations
	}

	/// Resumes global hotkey listening after suspension,
	/// updating the hotkey for a specific action.
	///
	/// - Parameters:
	///  - newHotKey: The new hotkey to register for the action, or
	///               `nil` to remove the hotkey for the action.
	///  - action: The action to update the hotkey for.
	func resumeHotKeyListening(withUpdatedHotKey newHotKey: HotKey?, for action: HotKeyAction) {
		hotKeyRegistrations = updateRegistrations(hotKeyRegistrations, with: newHotKey, for: action)
	}

	private func updateHotKeyProcessor(witRegistrations hotKeyRegistrations: [HotKeyRegistration], registrationsChanged: Bool = true) async {
		// Ensure the processor is idle before starting it,
		// since multiple hotkey recording sessions may be stopped
		// due to users switching between multiple hotkey fields.
		if await hotKeyProcessor.isRunning == false {
			await hotKeyProcessor.start(registrations: hotKeyRegistrations)
		} else if await hotKeyProcessor.isRunning, registrationsChanged {
			await hotKeyProcessor.updateRegistrations(with: hotKeyRegistrations)
		}
	}

	private func updateRegistrations(_ registrations: [HotKeyRegistration], with newHotKey: HotKey?, for action: HotKeyAction) -> [HotKeyRegistration] {
		var newRegistrations: [HotKeyRegistration] = registrations

		if let existingIndex: Int = newRegistrations.firstIndex(where: { $0.actionIdentifier == action }) {
			let existingRegistration: HotKeyRegistration = newRegistrations[existingIndex]

			if let newHotKey {
				// Update with new hotkey
				newRegistrations[existingIndex] = AirtimeMenuBarApp.Model.HotKeyRegistration(
					id: existingRegistration.id,
					hotKey: newHotKey,
					actionIdentifier: action
				)
				Logger.logMessage("Updated hotkey to \(newHotKey.keyComboDescription) for action \(action.rawValue)", level: .info)
			} else {
				// Remove hotkey (user cleared it)
				newRegistrations.remove(at: existingIndex)
				Logger.logMessage("Removed hotkey for action \(action.rawValue)", level: .info)
			}
		} else if let newHotKey {
			// Create new registration
			let newRegistration = AirtimeMenuBarApp.Model.HotKeyRegistration(
				hotKey: newHotKey,
				actionIdentifier: action
			)
			newRegistrations.append(newRegistration)
			Logger.logMessage("Added hotkey \(newHotKey.keyComboDescription) for action \(action.rawValue)", level: .info)
		}

		return newRegistrations
	}

	/// Opens Airtime.
	///
	/// - Parameter applicationName: An application name to attribute the launch to.
	/// - Parameter notifyingUser: Whether to post a user notification about the operation.
	/// - Parameter launchMode: The app mode to launch Airtime with.
	/// - Parameter appendingQuery: Additional query items to append to the launch URL, such as record=true.
	func launchAirtime(onBehalfOf applicationName: String, notifyingUser: Bool, launchMode: LaunchMode, appendingQuery queryItems: [URLQueryItem] = []) {
		Task {
			let url: URL? = switch launchMode {
			case let .webApp(webAppType):
				switch webAppType {
				case .camera, .creator, .screenRecorder, .stacks:
					HybridURLBuilder.buildURL(launching: webAppType)
				default:
					nil
				}
			case .lastUsed:
				HybridURLBuilder.lastUsedURL
			}

			guard let url, var components: URLComponents = URLComponents(url: url, resolvingAgainstBaseURL: false) else {
				Logger.logMessage("Failed to construct URL for \(launchMode.rawValue).", level: .error)
				return
			}

			components.queryItems = (components.queryItems ?? []) + queryItems

			guard let url: URL = components.url else {
				Logger.logMessage("Failed to reconstruct URL for \(launchMode.rawValue).", level: .error)
				return
			}

			NSWorkspace.shared.open(url)
		}
	}

	/// Unregisters this app as a login item.
	///
	/// - Warning: Currently fails with an invalid argument error due to system limitations.
	func uninstall() {
		Logger.logMessage("Uninstalling...", level: .info)

		guard let bundleIdentifier: String = Bundle.main.bundleIdentifier else {
			Logger.logMessage("Failed to determine bundle identifier, can't uninstall.", level: .error)
			return
		}

		do {
			try SMAppService.loginItem(identifier: bundleIdentifier).unregister()
		} catch {
			Logger.logError(error, messagePrefix: "Failed to unregister login item")
		}
	}

	/// Opens the **Login Items** panel in **System Settings**.
	func openSystemSettings() {
		SMAppService.openSystemSettingsLoginItems()
		Logger.logMessage("Opened System Settings.", level: .info)
	}

	var proxy: RemoteControlledXPCProtocol? {
		do {
			return try mainAppProxy.proxy
		} catch let error as MachServiceXPCService.Error where error == .proxyIsUnavailable {
			Logger.logMessage("Airtime proxy is unavailable.", level: .info)
		} catch {
			Logger.logError(error, messagePrefix: "Failed to get Airtime proxy", level: .info)
		}
		return nil
	}

	func startMonitoring() async {
		mainAppProxy.delegate = self
		remoteControl.delegate = self
		isActive = true

		if remoteControlState == nil {
			updateRemoteControlState()
		}

		if streamClientsMonitor == nil {
			streamClientsMonitor = configureStreamClientsMonitor()
		}

		Logger.logMessage("Started monitoring.", level: .info)
	}

	func refreshPingState() async {
		do {
			pingState = .pinging
			try await pingAirtime()
			pingState = .succeeded
		} catch AirtimeMenuBarApp.Model.Error.notRunning {
			pingState = .unavailable
		} catch {
			pingState = .failed(error: error)
			Logger.logError(error, messagePrefix: "Failed to ping Airtime")
		}
	}

	func quitMenuBarApp() {
		Logger.logMessage("Quitting...", level: .info)

		// Pause a bit before quitting to finish logging.

		Task {
			try? await Task.sleep(for: .milliseconds(500))
			await MainActor.run {
				NSApplication.shared.terminate(nil)
			}
		}
	}

	func logSummary() {
		Logger.logMessage("Auto launch is \(autoLaunchAirtime ? "enabled." : "disabled.")", level: .info)
		Logger.logMessage("Auto launch mode is \(autoLaunchMode.rawValue).", level: .info)
	}

	func toggleScreenRecorder() {
		if let proxy, let remoteControlState, remoteControlState.webApps.contains(.screenRecorder) {
			proxy.toggleScreenRecorder()
		} else {
			launchAirtime(
				onBehalfOf: String(describing: AirtimeMenuBarApp.self),
				notifyingUser: false,
				launchMode: .webApp(.screenRecorder),
				appendingQuery: [URLQueryItem(name: "record", value: "true")]
			)
		}
	}

	func recordScreen() {
		if let proxy, let remoteControlState, remoteControlState.webApps.contains(.screenRecorder) {
			guard remoteControlState.screenRecorderIsRecording == false else { return }
			proxy.recordScreen()
		} else {
			launchAirtime(
				onBehalfOf: String(describing: AirtimeMenuBarApp.self),
				notifyingUser: false,
				launchMode: .webApp(.screenRecorder),
				appendingQuery: [
					URLQueryItem(name: "record", value: "true"),
					URLQueryItem(name: "screen", value: "true"),
				]
			)
		}
	}

	func recordWindow() {
		if let proxy, let remoteControlState, remoteControlState.webApps.contains(.screenRecorder) {
			guard remoteControlState.screenRecorderIsRecording == false else { return }
			proxy.recordWindow()
		} else {
			launchAirtime(
				onBehalfOf: String(describing: AirtimeMenuBarApp.self),
				notifyingUser: false,
				launchMode: .webApp(.screenRecorder),
				appendingQuery: [
					URLQueryItem(name: "record", value: "true"),
					URLQueryItem(name: "window", value: "true"),
				]
			)
		}
	}

	func openSettingsWindow() {
		openWindow(id: AirtimeMenuBarApp.WindowIdentifiers.settings.rawValue)

		// `LSUIElement` app oftentimes needs an extra invitation to move the window to the front.
		if #available(macOS 14.0, *) {
			NSApp.activate()
		} else {
			NSApp.activate(ignoringOtherApps: true)
		}
	}
}

extension AirtimeMenuBarApp.Model {
	private struct UncheckedProxy: @unchecked Sendable {
		/// The XPC proxy object representing the Mach service.
		///
		/// Safe to use while the XPC connection is alive.
		let value: RemoteControlledXPCProtocol

		var updatedState: RemoteControlState {
			get async throws {
				let xpcState: RemoteControlState.XPCTransportType = await value.updatedState()
				return try JSONDecoder().decode(RemoteControlState.self, from: xpcState as Data)
			}
		}
	}
}

extension AirtimeMenuBarApp.Model {
	private static func setUpLogFileLocation() {
		do {
			try FileManager
				.default
				.createDirectory(at: URL.applicationSupportDirectory!,
								 withIntermediateDirectories: true,
								 attributes: nil)
		} catch {
			os.Logger(
				subsystem: os.Logger.airtimeSubsystem,
				category: os.Logger.menuBarAppCategory
			)
			.error("Failed to create application support directory. If this is the first run, the logger will not work. Error: \(error)")
		}
	}
}

extension AirtimeMenuBarApp.Model {
	private var uncheckedProxy: UncheckedProxy {
		get throws {
			try UncheckedProxy(value: mainAppProxy.proxy)
		}
	}

	private func configureStreamClientsMonitor() -> StreamClientsMonitor? {
		StreamClientsMonitor { [weak self] (change: StreamClientsMonitor.Change, streamClientsMonitor: StreamClientsMonitor) in
			guard let self else { return }

			let virtualCameraHasClients: Bool = streamClientsMonitor.streamClients.isEmpty == false
			Task { @MainActor in
				self.virtualCameraHasClients = virtualCameraHasClients
			}

			guard case let .addedClients(clients) = change else { return }

			guard self.autoLaunchAirtime else {
				Logger.logMessage("Ignoring discovery of new stream client because auto launch is disabled.", level: .info)
				return
			}

			Logger.logMessage("Discovered new stream client.", level: .info)

			let clientName: String = clients
				.map { NSRunningApplication(processIdentifier: $0)?.localizedName ?? (try? $0.processName) ?? "Unknown" }
				.map { StreamClient.applicationTitle(forProcessName: $0) }
				.first ?? "Unknown App"

			// Launch Airtime or bring it to the front for each new stream client.
			self.launchAirtime(onBehalfOf: clientName, notifyingUser: true, launchMode: self.autoLaunchMode)
		}
	}

	/// Fetches the remote control state asynchronously.
	///
	/// This method ensures the instance is updated with
	/// the fetched state on the `MainActor`.
	private func updateRemoteControlState() {
		Task {
			let remoteControlState: RemoteControlState? = await {
				do {
					return try await uncheckedProxy.updatedState
				} catch let error as MachServiceXPCService.Error where error == .proxyIsUnavailable {
					Logger.logMessage("Airtime state is unavailable.", level: .info)
				} catch {
					Logger.logError(error, messagePrefix: "Failed to fetch remote control state")
				}
				return nil
			}()

			// Ensure the requested launch mode is opened.
			// See `requestedLaunchMode` documentation for details.

			switch requestedLaunchMode {
			case let .webApp(webAppType):
				guard let remoteControlState, remoteControlState.webApps.contains(webAppType) == false else { break }
				Logger.logMessage("Switching to requested web app: \(webAppType).", level: .info)
				launchAirtime(onBehalfOf: String(describing: AirtimeMenuBarApp.self), notifyingUser: false, launchMode: .webApp(webAppType))
			default: break
			}

			await MainActor.run {
				self.remoteControlState = remoteControlState
				self.isConnectedToAirtime = remoteControlState != nil
			}
		}
	}

	private func pingAirtime() async throws {
		try await withCheckedThrowingContinuation(timeout: .seconds(1)) { (continuation: CheckedContinuation<Void, Swift.Error>) in
			// Explicitly switch to detached task, then back to `MainActor` to avoid concurrency bugs on older macOSs
			Task.detached {
				do {
					try await MainActor.run {
						try self.mainAppProxy.proxy.ping {
							continuation.resume()
						}
					}
				} catch let error as MachServiceXPCService.Error where error == .proxyIsUnavailable {
					continuation.resume(throwing: Error.notRunning)
				} catch {
					continuation.resume(throwing: error)
				}
			}
		}
	}
}

extension AirtimeMenuBarApp.Model: MainAppProxyDelegate {
	nonisolated func connectionWasInterrupted(_ proxy: MainAppProxy) {
		Logger.logMessage("Connection was interrupted.", level: .info)
		Task { await updateRemoteControlState() }
	}

	nonisolated func connectionWasInvalidated(_ proxy: MainAppProxy) {
		Logger.logMessage("Connection was invalidated.", level: .info)
		Task { await updateRemoteControlState() }
	}

	nonisolated func connection(_ proxy: MainAppProxy, didReceiveError error: Swift.Error) {
		Logger.logError(error, messagePrefix: "Connection did receive error", level: .info)
		Task { await updateRemoteControlState() }
	}

	nonisolated func proxyAcceptedConnection(_ proxy: MainAppProxy) {
		Logger.logMessage("Proxy accepted connection.", level: .info)
		Task { await updateRemoteControlState() }
	}

	nonisolated func proxy(_ proxy: MainAppProxy, refusedConnectionWithError error: Swift.Error) {
		Logger.logError(error, messagePrefix: "Proxy refused connection", level: .info)
		Task { await updateRemoteControlState() }
	}
}

extension AirtimeMenuBarApp.Model: RemoteControlling {
	nonisolated func openSettings() {
		Task { @MainActor in
			self.openSettingsWindow()
		}
	}

	nonisolated func update(with state: RemoteControlState.XPCTransportType) {
		Logger.logMessage("Receiving state update.", level: .info)

		do {
			let remoteControlState = try RemoteControlState(xpcTransportValue: state)
			Task { @MainActor [weak self] in
				self?.remoteControlState = remoteControlState
			}
		} catch {
			Logger.logError(error, messagePrefix: "Failed to update remote control state", level: .error)
		}
	}

	func version() async -> String {
		AirtimeMenuBarApp.bundleVersion
	}

	var versionString: String {
		// swiftformat:disable indent
		"Airtime Menu Bar Item " +
		AirtimeMenuBarApp.marketingVersion +
		" (" +
		AirtimeMenuBarApp.bundleVersion +
		")"
		// swiftformat:enable indent
	}
}

extension AirtimeMenuBarApp.Model {
	enum PingState {
		case pinging
		case unavailable
		case succeeded
		case failed(error: Swift.Error)
	}
}

extension AirtimeMenuBarApp.Model {
	enum Error: Int {
		case notRunning
		case pingFailedWithTimeout
	}
}

extension AirtimeMenuBarApp.Model.Error: BaseError {
	static let domain: String = String(describing: Self.self)

	var errorMessage: String {
		switch self {
		case .pingFailedWithTimeout: "Ping failed with timeout."
		case .notRunning: "Airtime is not running."
		}
	}
}

extension UserDefaults.mmhmmKey {
	enum AirtimeMenuBarAppModel {
		fileprivate static let hotKeyRegistrations: String = "HotKeyRegistrations"
	}
}
