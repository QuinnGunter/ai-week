//
//  PowerMonitor.swift
//  Common
//
//  Created by Beni Federer on 10.07.25.
//

import AppKit
import IOKit.ps

public actor PowerMonitor {
	/// Creates a monitor.
	public init() {}

	/// The monitor's current state.
	private var state: State = .stopped

	/// The run loop used internally to schedule
	/// an IOKit PS notification source.
	private let runLoop: CFRunLoop = CFRunLoopGetCurrent()

	/// Current power method without battery capacity.
	///
	/// `.unknown`, right after a power method change was
	/// reported, might turn out to mean `.battery` when
	/// queried again after a short delay.
	public var currentPowerMethod: PowerMethod {
		let timeRemaining: CFTimeInterval = IOPSGetTimeRemainingEstimate()

		if timeRemaining == kIOPSTimeRemainingUnlimited {
			return .ac
		} else if timeRemaining == kIOPSTimeRemainingUnknown {
			return .unknown
		} else {
			return .battery(capacity: nil)
		}
	}

	/// Current power method including battery capacity.
	public var powerSourceInfo: PowerMethod {
		guard
			let powerSources: CFTypeRef? = IOPSCopyPowerSourcesInfo()?.takeRetainedValue(),
			let sources = IOPSCopyPowerSourcesList(powerSources)?.takeRetainedValue() as? [CFTypeRef] else {
			return .unknown
		}

		for source in sources {
			guard
				let sourceInfo = IOPSGetPowerSourceDescription(powerSources, source)?.takeUnretainedValue() as? [String: Any],
				let powerSourceState = sourceInfo[kIOPSPowerSourceStateKey] as? String
			else {
				continue
			}

			if powerSourceState == kIOPSACPowerValue {
				return .ac
			} else if powerSourceState == kIOPSBatteryPowerValue {
				let currentCapacity = sourceInfo[kIOPSCurrentCapacityKey] as? Int
				return .battery(capacity: currentCapacity)
			}
		}

		return .unknown
	}

	// Current power state.
	public var powerState: PowerState {
		get throws {
			var powerState: PowerState = .unknown
			let service: io_service_t = IOServiceGetMatchingService(kIOMainPortDefault, IOServiceMatching("IOPMrootDomain"))

			guard service != 0 else {
				throw Error.ioServiceIsUnavailable
			}

			defer {
				IOObjectRelease(service)
			}

			var properties: Unmanaged<CFMutableDictionary>?
			let returnCode: Int32 = IORegistryEntryCreateCFProperties(service, &properties, kCFAllocatorDefault, 0)

			guard returnCode == kIOReturnSuccess else {
				throw Error.failedToRetrieveIORegistryProperties(returnCode: returnCode)
			}

			guard let properties = properties?.takeRetainedValue() as? [String: Any] else {
				throw Error.failedToGetIORegistryProperties
			}

			guard let pmProperties = properties["IOPowerManagement"] as? [String: Any] else {
				throw Error.failedToGetPowerManagementProperties
			}

			// Try two sources to increase chances of finding power state information.

			if
				let currentPowerState = pmProperties["CurrentPowerState"] as? Int,
				let ioPMCurrentPowerState = IOPMrootDomain.CurrentPowerState(rawValue: currentPowerState) {
				powerState = ioPMCurrentPowerState.powerState
			}

			if
				let systemState = pmProperties["SystemState"] as? String,
				let ioPMSystemState = IOPMrootDomain.SystemState(rawValue: systemState) {
				powerState = ioPMSystemState.powerState
			}

			return powerState
		}
	}

	/// Starts the monitor.
	///
	/// - Parameter powerMethodChangedCallback: The callback to call with an updated power method.
	/// - Parameter powerStateChangedCallback: The callback to call with an updated power state.
	/// - Throws: An error describing the failure.
	public func start(powerMethodChangedCallback: @Sendable @escaping (PowerMethod) -> Void,
					  powerStateChangedCallback: @Sendable @escaping (PowerState) -> Void) throws {
		guard case .stopped = state else {
			throw Error.invalidState(stateDescription: state.description)
		}

		// Monitor for power method changes.
		let source: CFRunLoopSource = try startMonitoringPowerMethodChanges()

		// Monitor for power state changes.
		// These notifications are most accurate, but don't seem to trigger for a GUI session process aka app.
		let notificationPort: IONotificationPortRef = try startMonitoringPowerStateChanges()

		// Monitor for NSWorkspace notifications indicating power state changes.
		// These notifications allow determining the underlying power states and trigger in GUI apps.
		let workspaceObservances: [NSObjectProtocol] = startMonitoringWorkspace()

		state = .started(powerMethodChangedCallback: powerMethodChangedCallback,
						 powerStateChangedCallback: powerStateChangedCallback,
						 runLoopSource: source,
						 powerStateNotificationPort: notificationPort,
						 workspaceObservances: UncheckedSendableObservances(value: workspaceObservances))
	}

	// Stops the monitor.
	public func stop() throws {
		guard case let .started(_, _, runLoopSource, notificationPort, observances) = state else {
			throw Error.invalidState(stateDescription: state.description)
		}

		// Destruct created run loop source.
		CFRunLoopRemoveSource(runLoop, runLoopSource, .defaultMode)

		// Destruct notification port on the run loop that owns it.
		let sourceToRemove: CFRunLoopSource = IONotificationPortGetRunLoopSource(notificationPort).takeUnretainedValue()
		CFRunLoopRemoveSource(runLoop, sourceToRemove, .defaultMode)
		// Calling `IONotificationPortDestroy(notificationPort)` crashes, so doesn't appear to require manual handling.

		stopWorkspaceMonitoring(observances: observances.value)

		state = .stopped
	}
}

extension PowerMonitor {
	/// Starts monitoring for IOKit power source change notifications.
	///
	/// - Returns: A scheduled run loop source.
	private func startMonitoringPowerMethodChanges() throws -> CFRunLoopSource {
		let runLoopSource: Unmanaged<CFRunLoopSource>? = IOPSCreateLimitedPowerNotification(
			{ (context: UnsafeMutableRawPointer?) in
				guard let context else { fatalError("Expected context pointer.") }
				let powerMonitor = Unmanaged<PowerMonitor>.fromOpaque(context).takeUnretainedValue()

				Task { await powerMonitor.executePowerMethodCallback() }
			},
			Unmanaged.passUnretained(self).toOpaque()
		)

		guard let source: CFRunLoopSource = runLoopSource?.takeRetainedValue() else { throw Error.runLoopSourceCreationFailed }

		CFRunLoopAddSource(runLoop, source, .defaultMode)

		return source
	}

	/// Starts monitoring for IOKit power state change notifications.
	///
	/// - Returns: An armed notification port, scheduled on a run loop.
	private func startMonitoringPowerStateChanges() throws -> IONotificationPortRef {
		guard let notificationPort = IONotificationPortCreate(kIOMainPortDefault) else {
			throw Error.failedToCreatePort
		}

		guard let source: CFRunLoopSource = IONotificationPortGetRunLoopSource(notificationPort)?.takeRetainedValue() else { throw Error.runLoopSourceCreationFailed }

		CFRunLoopAddSource(runLoop, source, .defaultMode)

		guard let serviceDictionary: CFMutableDictionary = IOServiceMatching("IOPMrootDomain") else {
			throw Error.failedToRetrieveServiceDictionary
		}

		let callback: IOServiceMatchingCallback = { (refcon: UnsafeMutableRawPointer?, iterator: io_iterator_t) in
			guard let refcon else { fatalError("Expected refcon pointer.") }
			let powerMonitor = Unmanaged<PowerMonitor>.fromOpaque(refcon).takeUnretainedValue()

			Task { await powerMonitor.executePowerStateCallback() }

			// Consume iterator to re-"arm" notification.
			var service: io_service_t = 0
			repeat {
				service = IOIteratorNext(iterator)
				if service != 0 {
					IOObjectRelease(service)
				}
			} while service != 0
		}

		let refconPointer = Unmanaged.passUnretained(self).toOpaque()
		var powerStateIterator: io_iterator_t = 0

		IOServiceAddMatchingNotification(
			notificationPort,
			kIOMatchedNotification,
			serviceDictionary,
			callback,
			refconPointer,
			&powerStateIterator
		)

		// Consume initial iterator to "arm" notification.
		var service: io_service_t = 0
		repeat {
			service = IOIteratorNext(powerStateIterator)
			if service != 0 {
				IOObjectRelease(service)
			}
		} while service != 0

		return notificationPort
	}

	/// Starts monitoring for `NSWorkspace` power state change notifications.
	///
	/// - Returns: The notification observers registered in the `NSWorkspace`
	///            notification center.
	private func startMonitoringWorkspace() -> [NSObjectProtocol] {
		let notificationCenter = NSWorkspace.shared.notificationCenter

		let sleepObserver = notificationCenter.addObserver(
			forName: NSWorkspace.willSleepNotification,
			object: nil,
			queue: .current
		) { _ in
			Task { [weak self] in
				await self?.executePowerStateCallback(with: .suspended)
			}
		}

		let wakeObserver = notificationCenter.addObserver(
			forName: NSWorkspace.didWakeNotification,
			object: nil,
			queue: .current
		) { _ in
			Task { [weak self] in
				await self?.executePowerStateCallback(with: .normal)
			}
		}

		let powerOffObserver = notificationCenter.addObserver(
			forName: NSWorkspace.willPowerOffNotification,
			object: nil,
			queue: .current
		) { _ in
			Task { [weak self] in
				await self?.executePowerStateCallback(with: .shutdown)
			}
		}

		return [sleepObserver, wakeObserver, powerOffObserver]
	}

	/// Stops `NSWorkspace` notification observers.
	///
	/// - Parameter observances: The observers to stop.
	private func stopWorkspaceMonitoring(observances: [NSObjectProtocol]) {
		observances.forEach {
			NSWorkspace
				.shared
				.notificationCenter
				.removeObserver($0)
		}
	}

	/// Executes the `.started` state's callback with the current power method.
	///
	/// This method does nothing if state is not `.started`.
	private func executePowerMethodCallback() {
		guard case let .started(callback, _, _, _, _) = state else { return }
		callback(powerSourceInfo)
	}

	/// Executes the `.started` state's callback with the current power state.
	///
	/// This method does nothing if state is not `.started`.
	private func executePowerStateCallback() {
		guard case let .started(_, callback, _, _, _) = state else { return }
		callback((try? powerState) ?? .unknown)
	}

	/// Executes the `.started` state's callback with the passed in power state.
	///
	/// This method does nothing if state is not `.started`.
	private func executePowerStateCallback(with powerState: PowerState) {
		guard case let .started(_, callback, _, _, _) = state else { return }
		callback(powerState)
	}
}

extension PowerMonitor {
	public enum PowerState {
		case unknown
		case suspended
		case normal
		case shutdown
	}

	public enum PowerMethod {
		case unknown
		case ac
		case battery(capacity: Int?)
	}

	public enum Error {
		case failedToCreatePort
		case failedToGetIORegistryProperties
		case failedToGetPowerManagementProperties
		case failedToRetrieveIORegistryProperties(returnCode: Int32)
		case failedToRetrieveServiceDictionary
		case invalidState(stateDescription: String)
		case ioServiceIsUnavailable
		case runLoopSourceCreationFailed
	}
}

extension PowerMonitor.PowerMethod: Equatable {}

extension PowerMonitor {
	fileprivate typealias UncheckedSendableObservances = UncheckedSendableBox<[NSObjectProtocol]>

	fileprivate enum State {
		case started(powerMethodChangedCallback: @Sendable (PowerMethod) -> Void,
					 powerStateChangedCallback: @Sendable (PowerState) -> Void,
					 runLoopSource: CFRunLoopSource,
					 powerStateNotificationPort: IONotificationPortRef,
					 workspaceObservances: UncheckedSendableObservances)
		case stopped
	}
}

extension PowerMonitor.State: CustomStringConvertible {
	var description: String {
		switch self {
		case .started: "started"
		case .stopped: "stopped"
		}
	}
}

extension PowerMonitor.PowerMethod: Sendable {}
extension PowerMonitor.PowerState: Sendable {}
extension PowerMonitor.State: Sendable {}
extension CFRunLoopSource: @unchecked @retroactive Sendable {}
extension IONotificationPortRef: @unchecked @retroactive Sendable {}

extension PowerMonitor.Error: BaseErrorWithAssociatedValues {
	public static let allCases: [PowerMonitor.Error] = [
		.failedToCreatePort,
		.failedToGetIORegistryProperties,
		.failedToGetPowerManagementProperties,
		.failedToRetrieveIORegistryProperties(returnCode: 0),
		.failedToRetrieveServiceDictionary,
		.invalidState(stateDescription: ""),
		.ioServiceIsUnavailable,
		.runLoopSourceCreationFailed,
	]

	public static let domain: String = String(describing: Self.self)

	public var errorMessage: String {
		switch self {
		case .failedToCreatePort: "Failed to create notification port."
		case .failedToGetIORegistryProperties: "Failed to get I/O registry properties."
		case .failedToGetPowerManagementProperties: "Failed to get power management properties."
		case let .failedToRetrieveIORegistryProperties(returnCode): "Failed to retrieve I/O registry properties (return code: \(returnCode))."
		case .failedToRetrieveServiceDictionary: "Failed to retrieve service dictionary."
		case let .invalidState(stateDescription): "Invalid state: \(stateDescription)"
		case .ioServiceIsUnavailable: "IO service is unavailable."
		case .runLoopSourceCreationFailed: "Run loop source creation failed."
		}
	}
}

enum IOPMrootDomain {
	/// Power state values returned by the `IOPMrootDomain`
	/// service for the `CurrentPowerState` property.
	///
	/// See https://github.com/apple/darwin-xnu/blob/main/iokit/Kernel/IOPMrootDomain.cpp
	enum CurrentPowerState: Int {
		case off = 0
		case restart = 1
		case sleep = 2
		// Maybe "always on standby"
		case aot = 3
		case on = 4
	}

	/// Power state values returned by the `IOPMrootDomain`
	/// service for the `SystemState` property.
	///
	/// See https://github.com/apple/darwin-xnu/blob/main/iokit/Kernel/IOPMrootDomain.cpp
	enum SystemState: String {
		case sleep
		case suspended
		case wake
		case on
		case normal
		case shutdown
		case off

		init?(anyCasedRawValue: String) {
			self.init(rawValue: anyCasedRawValue.lowercased())
		}
	}
}

extension IOPMrootDomain.CurrentPowerState {
	var powerState: PowerMonitor.PowerState {
		switch self {
		case .off: .shutdown
		case .restart, .sleep, .aot: .suspended
		case .on: .normal
		}
	}
}

extension IOPMrootDomain.SystemState {
	var powerState: PowerMonitor.PowerState {
		switch self {
		case .off, .shutdown: .shutdown
		case .sleep, .suspended: .suspended
		case .normal, .on, .wake: .normal
		}
	}
}
