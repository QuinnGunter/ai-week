//
//  UITestBase+CommonElements.swift
//  mmhmm-UITests
//
//  Created by Martin Pilkington on 13/03/2024.
//

import XCTest

extension UITestBase {
	var mainWebView: XCUIElement {
		return XCUIApplication().windows.webViews["Airtime"].firstMatch
	}

	// MARK: - Header Elements
	var mmhmmButton: XCUIElement {
		return mainWebView.buttons["Airtime"].firstMatch
	}

	var inviteButton: XCUIElement {
		return mainWebView.buttons["Invite"].firstMatch
	}

	var joinButton: XCUIElement {
		return mainWebView.buttons["Join"].firstMatch
	}

	var addScreenshareButton: XCUIElement {
		return mainWebView.buttons["Screenshare"].firstMatch
	}

	var addMediaButton: XCUIElement {
		return mainWebView.buttons["Media"].firstMatch
	}

	var addTextButton: XCUIElement {
		return mainWebView.buttons["Text"].firstMatch
	}

	var addGIPHYButton: XCUIElement {
		return mainWebView.buttons["GIPHY"].firstMatch
	}

	var addMoreButton: XCUIElement {
		return mainWebView.buttons["More"].firstMatch
	}

	// MARK: - Appearance
	func frameButton(forType type: FrameType) -> XCUIElement {
		return mainWebView.buttons[type.rawValue].firstMatch
	}

	func frameBackgroundButton(forColor color: FrameBackgroundColor) -> XCUIElement {
		return mainWebView.buttons[color.rawValue].firstMatch
	}

	var sizeSlider: XCUIElement {
		return mainWebView.sliders["Size"].firstMatch
	}

	var fadeSlider: XCUIElement {
		return mainWebView.sliders["Fade"].firstMatch
	}

	var enhanceSlider: XCUIElement {
		return mainWebView.sliders["Enhance"].firstMatch
	}

	var rotateSlider: XCUIElement {
		return mainWebView.sliders["Rotate"].firstMatch
	}

	// TODO: Rotation buttons (currently not labelled)
	// TODO: Effects pop up (currently no identifier)
	// TODO: Effects options (currently not labelled)

	var bigHandsCheckbox: XCUIElement {
		return mainWebView.checkBoxes["Big Hands"].firstMatch
	}

	// MARK: - Background
	var backgroundCheckbox: XCUIElement {
		return mainWebView.checkBoxes["Background"].firstMatch
	}

	func backgroundButton(forRoomNamed roomName: String) -> XCUIElement {
		return mainWebView.buttons.containing(.image, identifier: roomName).firstMatch
	}

	var seeAllRoomsButton: XCUIElement {
		return mainWebView.buttons["See all"].firstMatch
	}

	// TODO: Room options (currently not labelled)

	// MARK: - Layout
	var showLogoCheckbox: XCUIElement {
		return mainWebView.checkBoxes["Show logo"].firstMatch
	}

	var mediaOnTopCheckbox: XCUIElement {
		return mainWebView.checkBoxes["Media on top"].firstMatch
	}

	// MARK: - Recording Toolbar
	var undoButton: XCUIElement {
		return mainWebView.buttons["Undo"].firstMatch
	}

	var redoButton: XCUIElement {
		return mainWebView.buttons["Redo"].firstMatch
	}

	var recordButton: XCUIElement {
		return mainWebView.buttons["Record"].firstMatch
	}

	// TODO: Video button (no title)

	var myVideosButton: XCUIElement {
		return mainWebView.buttons["My Videos"].firstMatch
	}

	// MARK: - Slide Tray
	var presentationsButton: XCUIElement {
		return mainWebView.buttons["Presentations"].firstMatch
	}

	// TODO: Presentation Options button (no identifier)
	// TODO: Close Presentation button (no title)

	var addSlideButton: XCUIElement {
		return mainWebView.buttons["Add Slide"].firstMatch
	}

	// TODO: Slides (no identifier on group)
}

extension UITestBase {
	enum FrameType: String {
		case silhouette = "Silhouette"
		case circle = "Circle"
		case rectangle = "Rectangle"
	}

	enum FrameBackgroundColor: String {
		case none = "None"
		case white = "White"
		case black = "Black"
		case orange = "Orange"
		case blue = "Blue"
		case purple = "Purple"
	}
}
