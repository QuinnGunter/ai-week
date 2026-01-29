//
//  SystemVideoEffectsMonitor.swift
//  Common
//
//  Created by Beni Federer on 30.07.25.
//

import AVFoundation
import Common
import Dispatch

public actor SystemVideoEffectsMonitor {
	@MainActor
	public var status = Status()

	private var state: State = .stopped

	private var lastSeenStatus = Status() {
		didSet {
			guard lastSeenStatus != oldValue else { return }
			let status = lastSeenStatus
			Task { @MainActor [weak self] in
				self?.status = status
			}
		}
	}

	public init() {}

	public func start(callback: @escaping (Status) -> Void) throws {
		guard case .stopped = state else {
			throw Error.alreadyRunning
		}

		let timer: DispatchSourceTimer = startMonitoring()
		state = .running(timer: timer, callback: callback)
	}

	public func stop() throws {
		guard case let .running(timer, _) = state else {
			throw Error.notRunning
		}

		timer.cancel()
		state = .stopped
	}
}

extension SystemVideoEffectsMonitor {
	public struct Status: Equatable, Sendable {
		public let isPortraitEffectEnabled: Bool
		public let isCenterStageEnabled: Bool
		public let isStudioLightEnabled: Bool
		public let isBackgroundReplacementEnabled: Bool
		public let reactionEffectGesturesEnabled: Bool

		public init(
			isPortraitEffectEnabled: Bool = false,
			isCenterStageEnabled: Bool = false,
			isStudioLightEnabled: Bool = false,
			isBackgroundReplacementEnabled: Bool = false,
			reactionEffectGesturesEnabled: Bool = false
		) {
			self.isPortraitEffectEnabled = isPortraitEffectEnabled
			self.isCenterStageEnabled = isCenterStageEnabled
			self.isStudioLightEnabled = isStudioLightEnabled
			self.isBackgroundReplacementEnabled = isBackgroundReplacementEnabled
			self.reactionEffectGesturesEnabled = reactionEffectGesturesEnabled
		}
	}

	public enum Error: Int {
		case alreadyRunning
		case notRunning
	}
}

extension SystemVideoEffectsMonitor {
	private enum State {
		case stopped
		case running(timer: DispatchSourceTimer, callback: (Status) -> Void)
	}
}

extension SystemVideoEffectsMonitor {
	private static let timerInterval: TimeInterval = 1.0

	private func startMonitoring() -> DispatchSourceTimer {
		let timer = DispatchSource.makeTimerSource(queue: DispatchQueue.global())
		timer.schedule(deadline: .now(), repeating: Self.timerInterval)
		timer.setEventHandler { [weak self] in
			Task { [weak self] in
				await self?.checkStatus()
			}
		}
		timer.resume()

		return timer
	}

	private func checkStatus() {
		let newStatus: SystemVideoEffectsMonitor.Status = AVCaptureDevice.videoEffectsStatus
		guard case let .running(_, callback) = state, newStatus != lastSeenStatus else { return }
		lastSeenStatus = newStatus
		callback(newStatus)
	}
}

extension SystemVideoEffectsMonitor.Error: BaseError {
	public static let domain: String = String(describing: Self.self)

	public var errorMessage: String {
		switch self {
		case .alreadyRunning: return "The monitor is already running."
		case .notRunning: return "The monitor is not running."
		}
	}
}

extension AVCaptureDevice {
	fileprivate static var videoEffectsStatus: SystemVideoEffectsMonitor.Status {
		SystemVideoEffectsMonitor.Status(
			isPortraitEffectEnabled: isPortraitEffectEnabled,
			isCenterStageEnabled: isCenterStageEnabled,
			isStudioLightEnabled: isStudioLightEnabled,
			isBackgroundReplacementEnabled: isBackgroundReplacementEnabledOrFallback,
			reactionEffectGesturesEnabled: reactionEffectGesturesEnabledOrFallback
		)
	}

	private static var isBackgroundReplacementEnabledOrFallback: Bool {
		if #available(macOS 15.0, *) {
			AVCaptureDevice.isBackgroundReplacementEnabled
		} else {
			false
		}
	}

	private static var reactionEffectGesturesEnabledOrFallback: Bool {
		if #available(macOS 14.0, *) {
			AVCaptureDevice.reactionEffectGesturesEnabled
		} else {
			false
		}
	}
}
