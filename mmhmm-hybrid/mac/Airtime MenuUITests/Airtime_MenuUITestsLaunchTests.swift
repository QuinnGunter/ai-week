//
//  Airtime_MenuUITestsLaunchTests.swift
//  Airtime MenuUITests
//
//  Created by Beni Federer on 12.05.25.
//

import XCTest

final class Airtime_MenuUITestsLaunchTests: XCTestCase {
	override static var runsForEachTargetApplicationUIConfiguration: Bool {
		true
	}

	override func setUpWithError() throws {
		continueAfterFailure = false
	}

	@MainActor
	func testLaunch() throws {
		let app = XCUIApplication()
		app.launch()

		// Insert steps here to perform after app launch but before taking a screenshot,
		// such as logging into a test account or navigating somewhere in the app

		let attachment = XCTAttachment(screenshot: app.screenshot())
		attachment.name = "Launch Screen"
		attachment.lifetime = .keepAlways
		add(attachment)
	}
}
