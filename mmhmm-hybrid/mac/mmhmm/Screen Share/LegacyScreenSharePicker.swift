//
//  LegacyScreenSharePicker.swift
//  mmhmm
//
//  Created by Beni Federer on 28.11.25.
//

import AVFoundation
@preconcurrency import ScreenCaptureKit

// MARK: - Legacy Manager (macOS 15.1 and below)

@MainActor
final class LegacyScreenSharePicker: NSObject {
	static let shared: LegacyScreenSharePicker = { LegacyScreenSharePicker() }()

	private weak var delegate: ScreenSharePickerDelegate?

	func showScreenSharePicker(withRequest request: ScreenSharePickerRequest, delegate: ScreenSharePickerDelegate) {
		guard let pickingWindow: NSWindow = Application.cefAppDelegate.browser.webAppManagingBrowser(withID: request.browserID)?.windowManager.window else {
			Logger.logMessage("Couldn't find main window to attach share sheet.", level: .fault)
			return
		}

		guard pickingWindow.attachedSheet == nil else {
			Logger.logMessage("Can't show share sheet on window which already has a share sheet.", level: .error, targets: .uncheckedLocal)
			delegate.cancelScreenShare(with: "Failed to present screen picker. Is it already open?", inResponseTo: request)
			return
		}

		let pickerViewController = ScreenSharePickerViewController(request: request)
		pickerViewController.delegate = self

		let screenShareWindow = NSWindow()
		screenShareWindow.isReleasedWhenClosed = false
		screenShareWindow.contentViewController = pickerViewController
		pickingWindow.beginSheet(screenShareWindow)

		self.delegate = delegate
	}

	private func closeScreenSharePicker(screenSharePickerViewController: ScreenSharePickerViewController, returnCode: NSApplication.ModalResponse) {
		delegate = nil

		guard let screenShareWindow: NSWindow = screenSharePickerViewController.view.window else {
			Logger.logMessage("Can't close share sheet because view window is unavailable.", level: .fault)
			return
		}

		screenShareWindow.sheetParent?.endSheet(screenShareWindow, returnCode: returnCode)
		screenShareWindow.close()
	}
}

// MARK: - Legacy Picker Delegate
extension LegacyScreenSharePicker: ScreenSharePickerViewControllerDelegate {
	func screenSharePickerViewController(_ screenSharePickerViewController: ScreenSharePickerViewController, selectedWindow window: SCWindow) {
		delegate?.shareWindow(window, inResponseTo: screenSharePickerViewController.request)
		closeScreenSharePicker(screenSharePickerViewController: screenSharePickerViewController, returnCode: .OK)
	}

	func screenSharePickerViewController(_ screenSharePickerViewController: ScreenSharePickerViewController, selectedDisplay display: SCDisplay, withTitle title: String?) {
		delegate?.shareDisplay(display, inResponseTo: screenSharePickerViewController.request)
		closeScreenSharePicker(screenSharePickerViewController: screenSharePickerViewController, returnCode: .OK)
	}

	func screenSharePickerViewController(_ screenSharePickerViewController: ScreenSharePickerViewController, selectedDevice device: AVCaptureDevice) {
		delegate?.shareDevice(device: device, inResponseToRequest: screenSharePickerViewController.request)
		closeScreenSharePicker(screenSharePickerViewController: screenSharePickerViewController, returnCode: .OK)
	}

	func screenSharePickerViewControllerSelectedCancel(_ screenSharePickerViewController: ScreenSharePickerViewController) {
		delegate?.cancelScreenShare(inResponseTo: screenSharePickerViewController.request)
		closeScreenSharePicker(screenSharePickerViewController: screenSharePickerViewController, returnCode: .cancel)
	}
}
