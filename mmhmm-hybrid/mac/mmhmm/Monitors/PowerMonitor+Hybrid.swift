//
//  PowerMonitor+Hybrid.swift
//  mmhmm
//
//  Created by Beni Federer on 11.07.25.
//

import Foundation

import Common

extension PowerMonitor {
	func startMonitoringForHybrid() throws {
		try start(powerMethodChangedCallback: powerMethodChanged, powerStateChangedCallback: powerStateChanged)
	}
}

extension PowerMonitor {
	private func powerMethodChanged(powerMethod: PowerMethod) {
		Logger.logMessage("Power method changed: \(powerMethod)", level: .info)
		mmhmm.PowerMonitor.updateHybridWithCurrentState()
	}

	private func powerStateChanged(powerState: PowerState) {
		Logger.logMessage("Power state changed: \(powerState)", level: .info)
		mmhmm.PowerMonitor.updateHybridWithCurrentState()
	}
}

extension PowerMonitor.PowerState {
	var hybridPowerState: mmhmm.PowerState {
		switch self {
		case .unknown: .Unknown
		case .suspended: .Suspended
		case .normal: .Normal
		case .shutdown: .Shutdown
		}
	}
}

extension PowerMonitor.PowerMethod {
	var hybridPowerMethod: mmhmm.PowerMethod {
		switch self {
		case .unknown: .Unknown
		case .ac: .AC
		case .battery: .Battery
		}
	}
}
