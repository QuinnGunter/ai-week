//
//  SessionMonitorTests.swift
//  Common
//
//  Created by Beni Federer on 20.12.24.
//

@testable import Common

import Foundation
import Testing

@Suite("SessionMonitor Tests")
final class SessionMonitorTests {
	@Test("Monitoring starts and stops")
	func startStop() async throws {
		let monitor = SessionMonitor()
		await #expect(throws: Never.self) {
			try await monitor.start { _ in
			}
		}

		try await Task.sleep(for: .seconds(1))

		await #expect(throws: Never.self) {
			try await monitor.stop()
		}
	}

	@Test("Current session state")
	func currentSessionState() async throws {
		let monitor = SessionMonitor()
		#expect(await monitor.sessionState == .active)
	}
}
