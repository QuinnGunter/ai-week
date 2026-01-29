//
//  PowerMonitorTests.swift
//  Common
//
//  Created by Beni Federer on 20.12.24.
//

@testable import Common

import Foundation
import Testing

@Suite("PowerMonitor Tests")
final class PowerMonitorTests {
	@Test("Monitoring starts and stops")
	func startStop() async throws {
		let monitor = PowerMonitor()
		await #expect(throws: Never.self) {
			try await monitor.start { _ in
			} powerStateChangedCallback: { _ in
			}
		}

		try await Task.sleep(for: .seconds(1))

		await #expect(throws: Never.self) {
			try await monitor.stop()
		}
	}

	@Test("Current power method")
	func currentPowerMethod() async throws {
		let monitor = PowerMonitor()
		#expect(await monitor.currentPowerMethod != .unknown)
	}

	@Test("Power source info")
	func powerSourceInfo() async throws {
		let monitor = PowerMonitor()
		let powerSourceInfo = await monitor.powerSourceInfo
		#expect(powerSourceInfo != .unknown)
		if case let .battery(capacity) = powerSourceInfo {
			#expect(capacity != nil)
		}
	}

	@Test("Power state")
	func powerState() async throws {
		let monitor = PowerMonitor()
		#expect(try await monitor.powerState == .normal)
	}
}
