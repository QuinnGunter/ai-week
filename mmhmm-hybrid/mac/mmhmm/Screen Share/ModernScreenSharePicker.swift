//
//  ModernScreenSharePicker.swift
//  mmhmm
//
//  Created by Beni Federer on 28.11.25.
//

import AVFoundation
@preconcurrency import ScreenCaptureKit

@available(macOS 15.2, *)
@MainActor
final class ModernScreenSharePicker: NSObject {
	static let shared: ModernScreenSharePicker = { ModernScreenSharePicker() }()

	private var activePicker: SCContentSharingPicker?
	private var activeRequest: ScreenSharePickerRequest?
	private weak var delegate: ScreenSharePickerDelegate?

	func showScreenSharePicker(withRequest request: ScreenSharePickerRequest, delegate: ScreenSharePickerDelegate) {
		guard activePicker == nil else {
			Logger.logMessage("Can't show modern screen share picker because one is already active.", level: .error)
			delegate.cancelScreenShare(with: "Failed to present screen picker. Is it already open?", inResponseTo: request)
			return
		}

		guard request.includeScreens || request.includeWindows else {
			Logger.logMessage("Can't show modern screen share picker without any content types enabled.", level: .error)
			delegate.cancelScreenShare(with: "Failed to present screen picker. No content types enabled.", inResponseTo: request)
			return
		}

		var pickerConfig = SCContentSharingPickerConfiguration()
		pickerConfig.allowedPickerModes = []

		if request.includeWindows {
			pickerConfig.allowedPickerModes.insert(.singleWindow)
			pickerConfig.allowedPickerModes.insert(.multipleWindows)
		}

		if request.includeScreens {
			pickerConfig.allowedPickerModes.insert(.singleDisplay)
		}

		if let pickingWindow: NSWindow = Application.cefAppDelegate.browser.webAppManagingBrowser(withID: request.browserID)?.windowManager.window {
			pickerConfig.excludedWindowIDs = [pickingWindow.windowNumber]
		}

		let picker = SCContentSharingPicker.shared
		picker.defaultConfiguration = pickerConfig
		picker.add(self)
		picker.isActive = true
		picker.present()

		activePicker = picker
		activeRequest = request
		self.delegate = delegate

		Logger.logMessage("Presenting screen share picker", level: .debug)
	}

	private func stopPicker() {
		guard let activePicker else {
			Logger.logMessage("No active modern screen share picker to stop.", level: .debug)
			return
		}

		activePicker.isActive = false
		activePicker.remove(self)

		Logger.logMessage("Stopped screen share picker.", level: .debug)

		self.activePicker = nil
		activeRequest = nil
	}
}

@available(macOS 15.2, *)
extension ModernScreenSharePicker: SCContentSharingPickerObserver {
	nonisolated func contentSharingPicker(_ picker: SCContentSharingPicker, didUpdateWith filter: SCContentFilter, for stream: SCStream?) {
		Task { @MainActor in
			guard let request = activeRequest else {
				Logger.logMessage("Received picker update but no active request", level: .error)
				return
			}

			// Support single window or display selection for now

			if filter.includedWindows.isEmpty == false {
				Logger.logMessage("User selected window: \(filter.includedWindows[0].title ?? "Untitled")", level: .info)
				delegate?.shareWindow(filter.includedWindows[0], inResponseTo: request)
			} else if filter.includedDisplays.isEmpty == false {
				Logger.logMessage("User selected display: \(filter.includedDisplays[0].displayID)", level: .info)
				delegate?.shareDisplay(filter.includedDisplays[0], inResponseTo: request)
			} else {
				Logger.logMessage("Unexpected empty filter from picker", level: .error)
			}

			stopPicker()
		}
	}

	nonisolated func contentSharingPicker(_ picker: SCContentSharingPicker, didCancelFor stream: SCStream?) {
		Task { @MainActor in
			guard let request = activeRequest else {
				Logger.logMessage("Received picker cancellation but no active request", level: .error)
				return
			}

			Logger.logMessage("Content sharing picker was cancelled by user", level: .info)
			delegate?.cancelScreenShare(inResponseTo: request)
			stopPicker()
		}
	}

	nonisolated func contentSharingPickerStartDidFailWithError(_ error: Error) {
		Task { @MainActor in
			guard let request = activeRequest else {
				Logger.logError(error, messagePrefix: "Content sharing picker failed without active request")
				return
			}

			Logger.logError(error, messagePrefix: "Content sharing picker failed")
			delegate?.cancelScreenShare(with: "Screen picker failed: \(error.localizedDescription)", inResponseTo: request)
			stopPicker()
		}
	}
}
