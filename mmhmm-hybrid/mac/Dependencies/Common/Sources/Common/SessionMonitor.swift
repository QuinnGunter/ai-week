//
//  SessionMonitor.swift
//  Common
//
//  Created by Beni Federer on 11.07.25.
//

import Foundation

import AppKit
import CoreGraphics

/// A monitor to detect session state changes.
///
/// This monitor works well for fast user switching,
/// i.e. the session getting de/activated if the user
/// logs in or out.
///
/// This monitor does not work for lock screen detection.
public actor SessionMonitor {
	/// Creates a monitor.
	public init() {}

	/// The monitor's current state.
	private var state: State = .stopped

	/// The last seen sessionState.
	private var lastSeenSessionState: SessionState = .unknown

	/// The current session state.
	public var sessionState: SessionState {
		if let sessionDictionary = CGSessionCopyCurrentDictionary() as NSDictionary?,
		   let isOnConsole: Bool = sessionDictionary[kCGSessionOnConsoleKey] as? Bool {
			isOnConsole ? .active : .inactive
		} else {
			.unknown
		}
	}

	/// Starts the monitor.
	///
	/// - Parameter callback: The callback to call with an updated session state.
	/// - Throws: An error describing the failure.
	public func start(callback: @Sendable @escaping (SessionState) -> Void) throws {
		guard case .stopped = state else {
			throw Error.invalidState(stateDescription: state.description)
		}

		let sessionObservers: [NSObjectProtocol] = startMonitoringWorkspace()
		let timer: DispatchSourceTimer = startMonitoringScreenLock()

		state = .started(callback: callback, sessionObservers: sessionObservers, timer: timer)
	}

	/// Stops the monitor.
	///
	/// - Throws: An error describing the failure.
	public func stop() throws {
		guard case let .started(_, sessionObservers, timer) = state else {
			throw Error.invalidState(stateDescription: state.description)
		}

		stopMonitoringWorkspace(observers: sessionObservers)
		stopMonitoringScreenLock(timer: timer)

		state = .stopped
	}
}

extension SessionMonitor {
	/// Starts monitoring for `NSWorkspace` session state change notifications.
	///
	/// - Returns: The notification observers registered in the `NSWorkspace`
	///            notification center.
	private func startMonitoringWorkspace() -> [NSObjectProtocol] {
		let notificationCenter = NSWorkspace.shared.notificationCenter

		// Session became active (login/switch in)
		let activeObserver = notificationCenter.addObserver(
			forName: NSWorkspace.sessionDidBecomeActiveNotification,
			object: nil,
			queue: .current
		) { _ in
			Task { await self.executeCallback(with: .active) }
		}

		// Session resigned active (logout/switch out)
		let resignObserver = notificationCenter.addObserver(
			forName: NSWorkspace.sessionDidResignActiveNotification,
			object: nil,
			queue: .current
		) { _ in
			Task { await self.executeCallback(with: .inactive) }
		}

		// Power off/logout notification
		let powerOffObserver = notificationCenter.addObserver(
			forName: NSWorkspace.willPowerOffNotification,
			object: nil,
			queue: .current
		) { _ in
			Task { await self.executeCallback(with: .loggingOut) }
		}

		return [activeObserver, resignObserver, powerOffObserver]
	}

	/// Stops monitoring for `NSWorkspace` notifications.
	///
	/// - Parameter observers: The notification observers to remove.
	private func stopMonitoringWorkspace(observers: [NSObjectProtocol]) {
		observers.forEach {
			NSWorkspace
				.shared
				.notificationCenter
				.removeObserver($0)
		}
	}

	/// Starts monitoring for screen lock state changes.
	///
	/// - Parameter interval: The interval between state polls.
	/// - Returns: The running timer triggering polls.
	private func startMonitoringScreenLock(interval: TimeInterval = 1.0) -> DispatchSourceTimer {
		let timer = DispatchSource.makeTimerSource(queue: .global(qos: .utility))

		timer.schedule(deadline: .now(), repeating: interval)
		timer.setEventHandler { [weak self] in
			guard let self = self else { return }
			Task { await self.checkSessionState() }
		}
		timer.resume()

		return timer
	}

	/// Compares the current session state against the last seen one
	/// and executes the callback with any changed value.
	private func checkSessionState() {
		let sessionState = sessionState
		guard sessionState != lastSeenSessionState else { return }

		lastSeenSessionState = sessionState
		executeCallback(with: sessionState)
	}

	/// Stops monitoring for screen lock state changes.
	///
	/// - Parameter timer: The timer to stop.
	private func stopMonitoringScreenLock(timer: DispatchSourceTimer) {
		timer.cancel()
	}

	/// Starts monitoring for Darwin Notifications.
	///
	/// - Caveat: No notifications delivered in macOS 15.5.
	private func startMonitoringDarwinNotifications() {
		let center = CFNotificationCenterGetDarwinNotifyCenter()
		let observer = Unmanaged.passUnretained(self).toOpaque()

		// Screen lock notification
		CFNotificationCenterAddObserver(
			center,
			observer,
			{ _, observer, _, _, _ in
				guard let observer = observer else { return }
				let sessionMonitor = Unmanaged<SessionMonitor>.fromOpaque(observer).takeUnretainedValue()
				Task { await sessionMonitor.executeCallback(with: .inactive) }
			},
			"com.apple.screenIsLocked" as CFString,
			nil,
			.deliverImmediately
		)

		// Screen unlock notification
		CFNotificationCenterAddObserver(
			center,
			observer,
			{ _, observer, _, _, _ in
				guard let observer = observer else { return }
				let sessionMonitor = Unmanaged<SessionMonitor>.fromOpaque(observer).takeUnretainedValue()
				Task { await sessionMonitor.executeCallback(with: .active) }
			},
			"com.apple.screenIsUnlocked" as CFString,
			nil,
			.deliverImmediately
		)
	}

	/// Stops monitoring for Darwin notifications.
	private func stopMonitoringDarwinNotifications() {
		CFNotificationCenterRemoveObserver(
			CFNotificationCenterGetDarwinNotifyCenter(),
			Unmanaged.passUnretained(self).toOpaque(),
			nil,
			nil
		)
	}

	/// Executes the `.started` state's callback with the passed in session state.
	///
	/// This method does nothing if state is not `.started`.
	private func executeCallback(with sessionState: SessionState) {
		guard case let .started(callback, _, _) = state else { return }
		callback(sessionState)
	}
}

extension SessionMonitor {
	public enum SessionState {
		case active
		case inactive
		case loggingOut
		case unknown
	}

	public enum Error {
		case invalidState(stateDescription: String)
	}
}

extension SessionMonitor.SessionState: Sendable {}

extension SessionMonitor.Error: BaseErrorWithAssociatedValues {
	public static let allCases: [SessionMonitor.Error] = [
		.invalidState(stateDescription: ""),
	]

	public static let domain: String = String(describing: Self.self)

	public var errorMessage: String {
		switch self {
		case let .invalidState(stateDescription): "Invalid state: \(stateDescription)"
		}
	}
}

extension SessionMonitor {
	fileprivate enum State {
		case started(callback: (SessionState) -> Void, sessionObservers: [NSObjectProtocol], timer: DispatchSourceTimer)
		case stopped
	}
}

extension SessionMonitor.State: CustomStringConvertible {
	var description: String {
		switch self {
		case .started: "started"
		case .stopped: "stopped"
		}
	}
}
