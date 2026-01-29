//
//  RemoteControlMenu.swift
//  mmhmm
//
//  Created by Matthew Tonkin on 3/10/2023.
//

import AppKit

@MainActor
class RemoteControlMenu: NSMenu {
	init(remoteReceiver: RemoteControlled) {
		self.remoteReceiver = remoteReceiver
		super.init(title: "Mini Remote")
		delegate = self
		updateMenuItems(with: remoteReceiver.state)
	}

	@available(*, unavailable)
	required init(coder: NSCoder) {
		fatalError("init(coder:) has not been implemented")
	}

	private let remoteReceiver: RemoteControlled
}

extension RemoteControlMenu {
	private func updateMenuItems(with remoteControlState: RemoteControlState) {
		removeAllItems()

		if remoteControlState.webApps.contains(.creator) {
			addCreatorMenu(with: remoteControlState)
			addItem(NSMenuItem.separator())
		}

		let openCameraTitle = String(localized: "Open Camera")
		let openCameraItem = addItem(withTitle: openCameraTitle, action: #selector(openCamera(_:)), keyEquivalent: "")
		openCameraItem.isEnabled = remoteControlState.webApps.contains(.camera) == false
		openCameraItem.target = self

		let openCreatorTitle = String(localized: "Open Creator")
		let openCreatorItem = addItem(withTitle: openCreatorTitle, action: #selector(openCreator(_:)), keyEquivalent: "")
		openCreatorItem.isEnabled = remoteControlState.webApps.contains(.creator) == false
		openCreatorItem.target = self

		let openRecorderTitle = String(localized: "Open Screen Recorder")
		let openRecorderItem = addItem(withTitle: openRecorderTitle, action: #selector(openRecorder(_:)), keyEquivalent: "")
		openRecorderItem.isEnabled = true
		openRecorderItem.target = self

		let openStacksTitle = String(localized: "Open Stacks")
		let openStacksItem = addItem(withTitle: openStacksTitle, action: #selector(openStacks(_:)), keyEquivalent: "")
		openStacksItem.isEnabled = remoteControlState.webApps.contains(.stacks) == false
		openStacksItem.target = self
	}

	// MARK: - Full App Mode Menu

	private func addCreatorMenu(with remoteControlState: RemoteControlState) {
		if let slideStatus: String = remoteControlState.slideStatus, !slideStatus.isEmpty {
			addItem(withTitle: slideStatus, action: nil, keyEquivalent: "")
			addItem(NSMenuItem.separator())
		}

		let previousSlideItem: NSMenuItem = addItem(withTitle: NSLocalizedString("Previous Slide", comment: "Previous Slide"), action: #selector(previousSlide(_:)), keyEquivalent: "")
		previousSlideItem.target = self

		let nextSlideItem: NSMenuItem = addItem(withTitle: NSLocalizedString("Next Slide", comment: "Next Slide"), action: #selector(nextSlide(_:)), keyEquivalent: "")
		nextSlideItem.target = self

		addItem(NSMenuItem.separator())

		let toggleSlidesTitle: String = remoteControlState.slideVisible ? NSLocalizedString("Hide Slides", comment: "Hide Slides") : NSLocalizedString("Show Slides", comment: "Show Slides")
		let toggleSlides: NSMenuItem = addItem(withTitle: toggleSlidesTitle, action: #selector(toggleSlideVisible(_:)), keyEquivalent: "")
		toggleSlides.target = self

		let toggleCameraTitle: String = remoteControlState.cameraEnabled ? NSLocalizedString("Disable Camera", comment: "Disable Camera") : NSLocalizedString("Enable Camera", comment: "Enable Camera")
		let toggleCamera: NSMenuItem = addItem(withTitle: toggleCameraTitle, action: #selector(toggleCameraEnabled(_:)), keyEquivalent: "")
		toggleCamera.target = self

		let togglePresenterFullscreen: NSMenuItem = addItem(withTitle: NSLocalizedString("Presenter Fullscreen", comment: "Presenter Fullscreen"), action: #selector(togglePresenterFullscreen(_:)), keyEquivalent: "")
		togglePresenterFullscreen.target = self
		togglePresenterFullscreen.state = remoteControlState.presenterFullscreen ? .on : .off

		let toggleGestures: NSMenuItem = addItem(withTitle: NSLocalizedString("Big Hands", comment: "Big Hands"), action: #selector(toggleGesturesEnabled(_:)), keyEquivalent: "")
		toggleGestures.target = self
		toggleGestures.state = remoteControlState.gesturesEnabled ? .on : .off
	}

	@objc private func previousSlide(_ sender: Any?) {
		remoteReceiver.previousSlide()
	}

	@objc private func nextSlide(_ sender: Any?) {
		remoteReceiver.nextSlide()
	}

	@objc private func toggleSlideVisible(_ sender: Any?) {
		remoteReceiver.toggleSlideVisible()
	}

	@objc private func toggleCameraEnabled(_ sender: Any?) {
		remoteReceiver.toggleCameraEnabled()
	}

	@objc private func togglePresenterFullscreen(_ sender: Any?) {
		remoteReceiver.togglePresenterFullscreen()
	}

	@objc private func toggleGesturesEnabled(_ sender: Any?) {
		remoteReceiver.toggleGesturesEnabled()
	}

	// MARK: - App Mode Menu

	@objc private func openCamera(_ sender: Any?) {
		remoteReceiver.openWebApp(.camera)
	}

	@objc private func openCreator(_ sender: Any?) {
		remoteReceiver.openWebApp(.creator)
	}

	@objc private func openRecorder(_ sender: Any?) {
		remoteReceiver.openWebApp(.screenRecorder)
	}

	@objc private func openStacks(_ sender: Any?) {
		remoteReceiver.openWebApp(.stacks)
	}

	@objc private func quitApp(_ sender: Any?) {
		NSApp.terminate(self)
	}
}

extension RemoteControlMenu: NSMenuDelegate {
	func menuNeedsUpdate(_ menu: NSMenu) {
		updateMenuItems(with: remoteReceiver.state)
	}
}

extension RemoteControlMenu: NSMenuItemValidation {
	func validateMenuItem(_ menuItem: NSMenuItem) -> Bool {
		if menuItem.action == #selector(previousSlide(_:)) {
			return remoteReceiver.state.hasPreviousSlide
		} else if menuItem.action == #selector(nextSlide(_:)) {
			return remoteReceiver.state.hasNextSlide
		}

		return true
	}
}
