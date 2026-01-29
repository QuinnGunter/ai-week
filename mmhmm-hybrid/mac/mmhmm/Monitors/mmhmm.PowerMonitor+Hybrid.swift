//
//  mmhmm.PowerMonitor+Hybrid.swift
//  mmhmm
//
//  Created by Beni Federer on 11.07.25.
//

extension mmhmm.PowerMonitor {
	static func updateHybridWithCurrentState() {
		Task {
			let powerMonitor: Self = await self.currentPowerMonitor
			CxxBridge.notifyHybridOfPowerMonitorChange(powerMonitor)
		}
	}
}

extension mmhmm.PowerMonitor {
	private static var currentPowerMonitor: mmhmm.PowerMonitor {
		get async {
			let (powerMonitor, sessionMonitor) = await MainActor.run {
				return (Application.cefAppDelegate.powerMonitor, Application.cefAppDelegate.sessionMonitor)
			}

			var monitor = mmhmm.PowerMonitor()
			monitor.lockState = await sessionMonitor.sessionState.hybridLockState
			monitor.powerMethod = await powerMonitor.powerSourceInfo.hybridPowerMethod
			do {
				monitor.powerState = try await powerMonitor.powerState.hybridPowerState
			} catch {
				Logger.logError(error, messagePrefix: "Failed to retrieve power state")
				monitor.powerState = .Unknown
			}
			return monitor
		}
	}
}
