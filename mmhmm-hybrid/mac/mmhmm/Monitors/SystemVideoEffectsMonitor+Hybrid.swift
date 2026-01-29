//
//  SystemVideoEffectsMonitor+Hybrid.swift
//  mmhmm
//
//  Created by Beni Federer on 11.07.25.
//

import AVFoundation

import Common

extension SystemVideoEffectsMonitor {
	func startMonitoringForHybrid() throws {
		try start(callback: statusChanged)
	}
}

extension SystemVideoEffectsMonitor {
	private func statusChanged(status: Status) {
		Logger.logMessage("System video effects changed: \(status)", level: .info)
		Task { @MainActor in
			CxxBridge.notifyHybridOfSystemVideoEffectsStatusChange(status.hybridStatus)
		}
	}
}

public struct SystemVideoEffectsMonitorBridge {
	/// Zero sized value types cannot be exposed to C++ yet.
	public let cxxInteropDummy: String = ""

	/// - Warning: This method yields a default `mmhmm.SystemVideoEffectsStatus` struct
	/// of all `false` boolean members when called from C++ via cxx-interop, but only
	/// in release builds, presumably due to optimizations.
	///
	/// Call the individual getters below via cxx-interop instead.
	public static var status: mmhmm.SystemVideoEffectsStatus {
		MainActor.assumeIsolated {
			systemVideoEffectsMonitor.status.hybridStatus
		}
	}

	public static var isPortraitEffectEnabled: Bool {
		MainActor.assumeIsolated {
			systemVideoEffectsMonitor.status.isPortraitEffectEnabled
		}
	}

	public static var isCenterStageEnabled: Bool {
		MainActor.assumeIsolated {
			systemVideoEffectsMonitor.status.isCenterStageEnabled
		}
	}

	public static var isStudioLightEnabled: Bool {
		MainActor.assumeIsolated {
			systemVideoEffectsMonitor.status.isStudioLightEnabled
		}
	}

	public static var isBackgroundReplacementEnabled: Bool {
		MainActor.assumeIsolated {
			systemVideoEffectsMonitor.status.isBackgroundReplacementEnabled
		}
	}

	public static var reactionEffectGesturesEnabled: Bool {
		MainActor.assumeIsolated {
			systemVideoEffectsMonitor.status.reactionEffectGesturesEnabled
		}
	}

	public static func showSystemUI() {
		AVCaptureDevice.showSystemUserInterface(.videoEffects)
	}
}

extension SystemVideoEffectsMonitorBridge {
	@MainActor
	private static var systemVideoEffectsMonitor: SystemVideoEffectsMonitor {
		Application.cefAppDelegate.systemVideoEffectsMonitor
	}
}

extension SystemVideoEffectsMonitor.Status {
	fileprivate var hybridStatus: mmhmm.SystemVideoEffectsStatus {
		mmhmm.SystemVideoEffectsStatus(
			isPortraitEffectEnabled: isPortraitEffectEnabled,
			isCenterStageEnabled: isCenterStageEnabled,
			isStudioLightEnabled: isStudioLightEnabled,
			isBackgroundReplacementEnabled: isBackgroundReplacementEnabled,
			reactionEffectGesturesEnabled: reactionEffectGesturesEnabled
		)
	}
}
