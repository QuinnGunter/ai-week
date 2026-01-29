//
//  ScreenSharePickerViewController.swift
//  mmhmm
//
//  Created by Matthew Tonkin on 27/9/2022.
//  Copyright © 2022 mmhmm, inc. All rights reserved.
//

import AVKit
import Cocoa
import CoreMediaIO
@preconcurrency import ScreenCaptureKit

@MainActor
protocol ScreenSharePickerViewControllerDelegate: NSObjectProtocol {
	func screenSharePickerViewController(_ screenSharePickerViewController: ScreenSharePickerViewController, selectedDisplay display: SCDisplay, withTitle title: String?)
	func screenSharePickerViewController(_ screenSharePickerViewController: ScreenSharePickerViewController, selectedWindow window: SCWindow)
	func screenSharePickerViewController(_ screenSharePickerViewController: ScreenSharePickerViewController, selectedDevice device: AVCaptureDevice)
	func screenSharePickerViewControllerSelectedCancel(_ screenSharePickerViewController: ScreenSharePickerViewController)
}

class ScreenSharePickerViewController: NSViewController {
	let request: ScreenSharePickerRequest

	init(request: ScreenSharePickerRequest) {
		self.request = request
		super.init(nibName: nil, bundle: nil)

		NotificationCenter.default.addObserver(forName: NSApplication.didUpdateNotification,
											   object: nil,
											   queue: .main) { [weak self] _ in
			MainActor.assumeIsolated {
				self?.needsScreenShareContentUpdate = true
			}
		}
	}

	@available(*, unavailable)
	required init?(coder: NSCoder) {
		fatalError("init(coder:) has not been implemented")
	}

	weak var delegate: ScreenSharePickerViewControllerDelegate?

	override func viewWillAppear() {
		super.viewWillAppear()
		updateContent()
	}

	// MARK: State

	enum State: Equatable {
		case initial
		case updating
		case permissionsRequired
		case error(NSError)
		case loaded(ScreenSharePickerCollectionViewController)
	}

	private var state: State = .initial {
		didSet {
			guard state != oldValue else {
				return
			}

			if case .updating = oldValue {
				updatingProgressIndicator?.stopAnimation(nil)
			} else if case let .loaded(collectionViewController) = oldValue {
				collectionViewController.removeFromParent()
			}

			switch state {
			case .initial:
				contentView = nil
				createButton?.isEnabled = false
			case .updating:
				updatingProgressIndicator?.startAnimation(nil)
				contentView = updatingView
				createButton?.isEnabled = false
			case .permissionsRequired:
				contentView = permissionsRequiredView
				createButton?.isEnabled = false
			case let .error(error):
				errorLabel?.stringValue = error.localizedDescription
				contentView = errorView
				createButton?.isEnabled = false
			case let .loaded(collectionViewController):
				addChild(collectionViewController)
				contentView = collectionViewController.view
				createButton?.isEnabled = selectedSource != nil
			}
		}
	}

	private var contentView: NSView? {
		didSet {
			guard contentView != oldValue else {
				return
			}

			oldValue?.removeFromSuperview()

			if let contentView = contentView {
				contentViewContainer?.addSubview(contentView, constraintMode: .fill)
			}
		}
	}

	@IBOutlet private var contentViewContainer: NSView?

	@IBOutlet private var updatingView: NSView?

	@IBOutlet private var updatingProgressIndicator: NSProgressIndicator?

	@IBOutlet private var permissionsRequiredView: NSView?

	@IBAction private func openSystemPreferences(_ sender: Any?) {
		guard let url = URL(string: "x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture") else {
			return
		}

		NSWorkspace.shared.open(url)
	}

	@IBOutlet private var errorView: NSView?

	@IBOutlet private var errorLabel: NSTextField?

	// MARK: - Create

	@IBOutlet private var createButton: NSButton?

	@IBAction private func create(_ sender: Any?) {
		guard let selectedSource: ScreenShare.Source = selectedSource else {
			return
		}

		switch selectedSource {
		case let .display(display):
			let title: String? = NSScreen.localizedName(forScreenWithDisplayID: display.displayID)
			delegate?.screenSharePickerViewController(self, selectedDisplay: display, withTitle: title)
		case let .window(window):
			delegate?.screenSharePickerViewController(self, selectedWindow: window)
		case let .device(device):
			delegate?.screenSharePickerViewController(self, selectedDevice: device)
		}
	}

	// MARK: - Cancel

	@IBAction private func cancel(_ sender: Any?) {
		delegate?.screenSharePickerViewControllerSelectedCancel(self)
	}

	// MARK: - Content

	private func updateContent() {
		guard state != .updating else {
			return
		}

		state = .updating

		Task { @MainActor in
			do {
				_ = try await SCShareableContent.excludingDesktopWindows(true, onScreenWindowsOnly: true)
				let collectionViewController = ScreenSharePickerCollectionViewController()
				collectionViewController.delegate = self
				state = .loaded(collectionViewController)
				updateScreenShareContent()
			} catch {
				if (error as NSError).code == SCStreamError.userDeclined.rawValue {
					state = .permissionsRequired
				} else {
					state = .error(error as NSError)
				}
			}
		}
	}

	private var needsScreenShareContentUpdateWorkItem: DispatchWorkItem?

	private var needsScreenShareContentUpdate: Bool = false {
		didSet {
			needsScreenShareContentUpdateWorkItem?.cancel()
			needsScreenShareContentUpdateWorkItem = nil
			if needsScreenShareContentUpdate {
				let workItem = DispatchWorkItem { [weak self] in
					self?.updateScreenShareContent()
				}
				needsScreenShareContentUpdateWorkItem = workItem
				DispatchQueue.main.asyncAfter(deadline: .now() + 1, execute: workItem)
			}
		}
	}

	private func updateScreenShareContent() {
		guard case let .loaded(collectionViewController) = state else {
			return
		}

		Task { @MainActor in
			guard let shareableContent = try? await SCShareableContent.excludingDesktopWindows(true, onScreenWindowsOnly: true) else {
				return
			}

			// TODO: #302 - Enable when we support AVCaptureDevice being shared
			// let deviceDiscoverySession = AVCaptureDevice.DiscoverySession(deviceTypes: [.externalUnknown], mediaType: .muxed, position: .unspecified)
			// let devices: [AVCaptureDevice] = deviceDiscoverySession.devices
			// let devices: Set<AVCaptureDevice> = []

			let displays: Set<SCDisplay>? = request.includeScreens ? .init(shareableContent.displays) : nil
			let filteredWindows: Set<SCWindow>? = request.includeWindows ? Set<SCWindow>(shareableContent.windows.filtered(hostWindow: view.window)) : nil

			collectionViewController.updateContent(displays: displays, windows: filteredWindows, devices: nil)
		}
	}

	// MARK: - Selection

	private var selectedSource: ScreenShare.Source? {
		didSet {
			createButton?.isEnabled = selectedSource != nil
		}
	}
}

extension ScreenSharePickerViewController: ScreenSharePickerCollectionViewControllerDelegate {
	func screenSharePickerCollectionViewController(_ screenSharePickerCollectionViewController: ScreenSharePickerCollectionViewController, selectedSource source: ScreenShare.Source?) {
		selectedSource = source
	}

	func screenSharePickerCollectionViewController(_ screenSharePickerCollectionViewController: ScreenSharePickerCollectionViewController, doubleClickedSource source: ScreenShare.Source) {
		selectedSource = source
		switch source {
		case let .display(display):
			let title: String? = NSScreen.localizedName(forScreenWithDisplayID: display.displayID)
			delegate?.screenSharePickerViewController(self, selectedDisplay: display, withTitle: title)
		case let .window(window):
			delegate?.screenSharePickerViewController(self, selectedWindow: window)
		case let .device(device):
			delegate?.screenSharePickerViewController(self, selectedDevice: device)
		}
	}
}

extension ScreenSharePickerViewController {
	private static var iOSDevicesEnabled: Bool = false

	static func enableiOSDevices() {
		guard !iOSDevicesEnabled else {
			return
		}

		// WWDC video 2014 #508 at 5:34
		var address = CMIOObjectPropertyAddress(mSelector: UInt32(kCMIOHardwarePropertyAllowScreenCaptureDevices),
												mScope: UInt32(kCMIOObjectPropertyScopeGlobal),
												mElement: UInt32(kCMIOObjectPropertyElementMain))
		var value: UInt32 = 1
		let status: OSStatus = CMIOObjectSetPropertyData(UInt32(kCMIOObjectSystemObject), &address, 0, nil, 4, &value)
		if status == noErr {
			iOSDevicesEnabled = true
		} else {
			Logger.logMessage("CMIOObjectSetPropertyData returned error: \(status)", level: .error)
		}
	}
}
