//
//  mmhmmUITests.swift
//  mmhmmUITests
//
//  Created by Martin Pilkington on 29/02/2024.
//

import XCTest

// swiftlint:disable:next type_name
final class mmhmmUITests: UITestBase {
	func testAppLaunchesAndStageLoads() throws {
		XCTAssertTrue(showLogoCheckbox.exists)
	}

	func testUncheckingBackgroundDisablesRooms() throws {
		XCTAssertTrue(backgroundCheckbox.exists)
		// Ensure checkbox is on at start
		if try XCTUnwrap(backgroundCheckbox.value as? Bool) == false {
			backgroundCheckbox.click()
			XCTAssertTrue((backgroundCheckbox.value as? Bool) ?? false)
		}

		let roomButton: XCUIElement = backgroundButton(forRoomNamed: "/waves_ocean.jpg")
		XCTAssertTrue(roomButton.isEnabled)

		backgroundCheckbox.click()
		XCTAssertFalse(roomButton.isEnabled)
	}
}
