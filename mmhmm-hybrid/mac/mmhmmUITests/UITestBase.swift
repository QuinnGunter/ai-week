//
//  UITestBase.swift
//  mmhmm-UITests
//
//  Created by Martin Pilkington on 13/03/2024.
//

import XCTest

/// Base class for all UI tests
///
/// Use this class as the base for any mmhmm UI tests as it will correctly wait for the app to finish loading.
/// It also exposes many convenience methods to access common elements.
@MainActor
class UITestBase: XCTestCase {
	override func setUp() async throws {
		continueAfterFailure = false
		try await MainActor.run {
			try launchAppAndWaitForStage()
		}
	}

	@MainActor
	private func launchAppAndWaitForStage() throws {
		let app = XCUIApplication()
		app.launch()

		guard showLogoCheckbox.waitForExistence(timeout: 10) else {
			throw Error.stageDidNotLoad
		}
	}
}

extension UITestBase {
	enum Error: Swift.Error {
		case stageDidNotLoad
	}
}
