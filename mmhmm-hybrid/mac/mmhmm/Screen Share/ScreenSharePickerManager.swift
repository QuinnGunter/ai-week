//
//  ScreenSharePickerManager.swift
//  mmhmm
//
//  Created by Beni Federer on 25.07.24.
//

import AVFoundation
@preconcurrency import ScreenCaptureKit

struct ScreenSharePickerRequest {
	/// Whether the screen share picker should present screens.
	let includeScreens: Bool

	/// Whether the screen share picker should present windows.
	let includeWindows: Bool

	/// The unique identifier for this screen share request.
	let id: Int

	/// The browser ID originating the screen share request.
	let browserID: Int

	/// Whether the selected window should be activated (brought to front) after selection.
	let activateWindowTarget: Bool

	/// Whether to present the modern screen share picker (macOS 15.2+).
	let presentPickerV2: Bool

	/// From `//content/browser/media/capture/screen_capture_kit_config_mac.h`:
	/// ```
	/// SCContentFilter Initialization Selection Logic:
	/// The function selects the appropriate SCContentFilter initializer based on
	/// the combination of properties present in the contentFilter configuration:
	///
	/// 1. Single Window Mode:
	///    - If only "includedWindows" is present with a single window:
	///      Uses: initWithDesktopIndependentWindow:
	///
	/// 2. Display with Excluded Windows:
	///    - If "includedDisplays" is present without "includedWindows" or
	///      "includedApplications", but with "excludedWindows":
	///      Uses: initWithDisplay:excludingWindows:
	///
	/// 3. Display with Included Windows:
	///    - If both "includedDisplays" and "includedWindows" are present:
	///      Uses: initWithDisplay:including: (windows variant)
	///
	/// 4. Display with Included Applications:
	///    - If both "includedDisplays" and "includedApplications" are present:
	///      Uses: initWithDisplay:including:exceptingWindows: (applications variant)
	///      Note: "exceptingWindows" can optionally be included
	///
	/// 5. Display with Excluded Applications:
	///    - If "includedDisplays" is present with "excludedApplications"
	///      and/or "exceptingWindows":
	///      Uses: initWithDisplay:excludingApplications:exceptingWindows:
	///
	/// In all display-based cases, the first display from "includedDisplays" is used.
	/// The "includeMenuBar" property (macOS 14.2+) is applied when available.
	/// ```
	// let excludedApplications: [(bundleIdentifier: String, processID: pid_t)]
	// let exceptingWindows: [CGWindowID]

	let excludedWindows: [CGWindowID]
}

@MainActor
protocol ScreenSharePickerDelegate: AnyObject {
	@available(macOS 15.2, *)
	func shareContent(with configuration: SCStreamConfiguration, filter: SCContentFilter, inResponseTo request: ScreenSharePickerRequest)
	func shareDisplay(_ display: SCDisplay, inResponseTo request: ScreenSharePickerRequest)
	func shareWindow(_ window: SCWindow, inResponseTo request: ScreenSharePickerRequest)
	func shareDevice(device: AVCaptureDevice, inResponseToRequest request: ScreenSharePickerRequest)
	func cancelScreenShare(inResponseTo request: ScreenSharePickerRequest)
	func cancelScreenShare(with errorMessage: String, inResponseTo request: ScreenSharePickerRequest)
}

@MainActor
final class ScreenSharePickerManager {
	static var shared: ScreenSharePickerManager = { ScreenSharePickerManager() }()

	func showScreenSharePicker(withRequest request: ScreenSharePickerRequest) {
		Task {
			do {
				try await checkScreenRecordingPermission()
			} catch let error as NSError {
				cancelScreenShare(with: "\(error.domain): \(error.localizedDescription) (\(error.code))", inResponseTo: request)
				return
			}

			if request.presentPickerV2, #available(macOS 15.2, *) {
				ModernScreenSharePicker.shared.showScreenSharePicker(withRequest: request, delegate: self)
			} else {
				LegacyScreenSharePicker.shared.showScreenSharePicker(withRequest: request, delegate: self)
			}
		}
	}

	func openPrivacySystemPreferences() {
		guard let url = URL(string: "x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture") else {
			Logger.logMessage("Couldn't create URL to open System Preferences Screen Recording pane.", level: .error)
			return
		}

		NSWorkspace.shared.open(url)
	}

	/// Throws an error if screen recording permission is not granted.
	private func checkScreenRecordingPermission() async throws {
		_ = try await SCShareableContent.excludingDesktopWindows(false, onScreenWindowsOnly: true)
	}

	private func chromiumSourceID(with type: String, sourceID: UInt32) -> String {
		"\(type):\(sourceID):0"
	}
}

extension ScreenSharePickerManager: ScreenSharePickerDelegate {
	@available(macOS 15.2, *)
	func shareContent(with configuration: SCStreamConfiguration, filter: SCContentFilter, inResponseTo request: ScreenSharePickerRequest) {
		guard filter.includedDisplays.isEmpty != filter.includedWindows.isEmpty else {
			Logger.logMessage("Attempting to share neither displays nor windows or trying to share both.", level: .error)
			return
		}

		do {
			let streamConfigurationJSON: String = try Self.jsonSerialize(streamConfiguration: configuration, filter: filter)

			if let display: SCDisplay = filter.includedDisplays.first {
				shareDisplay(display, inResponseTo: request, streamConfigurationJSON: streamConfigurationJSON)
			} else if let window: SCWindow = filter.includedWindows.first {
				shareWindow(window, inResponseTo: request, streamConfigurationJSON: streamConfigurationJSON)
			} else {
				Logger.logMessage("No display or window found in content filter to share.", level: .error)
			}
		} catch {
			Logger.logError(error, messagePrefix: "Failed to serialize stream configuration to JSON.")
		}
	}

	func shareDisplay(_ display: SCDisplay, inResponseTo request: ScreenSharePickerRequest) {
		let streamConfigurationJSON: String? = if #available(macOS 15.2, *), request.excludedWindows.isEmpty == false {
			{
				do {
					return try Self.jsonSerialize(
						streamConfiguration: nil,
						filter: SCContentFilter(display: display, excludingWindows: []),
						excludedWindows: request.excludedWindows
					)
				} catch {
					Logger.logError(error, messagePrefix: "Failed to serialize excluded windows to JSON")
					return nil
				}
			}()
		} else {
			nil
		}

		shareDisplay(display, inResponseTo: request, streamConfigurationJSON: streamConfigurationJSON)
	}

	private func shareDisplay(_ display: SCDisplay, inResponseTo request: ScreenSharePickerRequest, streamConfigurationJSON: String?) {
		let displayID: CGDirectDisplayID = display.displayID
		let title: String = NSScreen.localizedName(forScreenWithDisplayID: displayID) ?? "Unknown"
		let chromiumSourceID: String = chromiumSourceID(with: "screen", sourceID: displayID)

		let ipcMessage = ScreenShareMediaInterprocessMessage(action: .share,
															 requestID: Int32(request.id),
															 browserID: Int32(request.browserID),
															 content: .display,
															 argument: chromiumSourceID,
															 title: title,
															 processName: nil,
															 streamConfiguration: streamConfigurationJSON)
		InterprocessMessenger.shared.send(ipcMessage)
	}

	func shareWindow(_ window: SCWindow, inResponseTo request: ScreenSharePickerRequest) {
		shareWindow(window, inResponseTo: request, streamConfigurationJSON: nil)
	}

	private func shareWindow(_ window: SCWindow, inResponseTo request: ScreenSharePickerRequest, streamConfigurationJSON: String?) {
		let applicationName: String = window.owningApplication?.applicationName ?? "Unknown"
		let windowID: CGWindowID = window.windowID
		let title: String = window.title ?? "Unknown"
		let chromiumSourceID: String = chromiumSourceID(with: "window", sourceID: windowID)

		let ipcMessage = ScreenShareMediaInterprocessMessage(action: .share,
															 requestID: Int32(request.id),
															 browserID: Int32(request.browserID),
															 content: .window,
															 argument: chromiumSourceID,
															 title: title,
															 processName: applicationName,
															 streamConfiguration: streamConfigurationJSON)
		InterprocessMessenger.shared.send(ipcMessage)

		if request.activateWindowTarget,
		   let bundleIdentifier: String = window.owningApplication?.bundleIdentifier,
		   let application: NSRunningApplication = NSRunningApplication.runningApplications(withBundleIdentifier: bundleIdentifier).first {
			application.activate(options: [.activateAllWindows])
		}
	}

	func shareDevice(device: AVCaptureDevice, inResponseToRequest request: ScreenSharePickerRequest) {
		// TODO: #302 Support this when we figure out how to get Chromium to accept AVCaptureDevices
	}

	func cancelScreenShare(inResponseTo request: ScreenSharePickerRequest) {
		let ipcMessage = ScreenShareMediaInterprocessMessage(action: .cancel,
															 requestID: Int32(request.id),
															 browserID: Int32(request.browserID),
															 content: .none,
															 argument: "User canceled screen picker.",
															 title: nil,
															 processName: nil,
															 streamConfiguration: nil)
		InterprocessMessenger.shared.send(ipcMessage)
	}

	func cancelScreenShare(with errorMessage: String, inResponseTo request: ScreenSharePickerRequest) {
		let ipcMessage = ScreenShareMediaInterprocessMessage(action: .cancel,
															 requestID: Int32(request.id),
															 browserID: Int32(request.browserID),
															 content: .none,
															 argument: errorMessage,
															 title: nil,
															 processName: nil,
															 streamConfiguration: nil)
		InterprocessMessenger.shared.send(ipcMessage)
	}
}

@available(macOS 15.2, *)
extension ScreenSharePickerManager {
	/// Serializes the given stream configuration and content filter into a JSON string.
	///
	/// Excluded windows must be provided separately to be included in the serialization,
	/// since the `SCContentFilter` instance can't be queried for them, even if created
	/// with excluded windows.
	///
	/// The JSON structure follows this schema:
	/// ```
	/// {
	///   "version": 1,
	///   "streamConfiguration": {
	///     "showsCursor": bool,
	///     "sourceRect": {"x": number, "y": number, "width": number, "height": number},
	///     "backgroundColor": string,
	///     "shouldBeOpaque": bool,
	///     "ignoreShadowsDisplay": bool,
	///     "ignoreShadowsSingleWindow": bool,
	///     "ignoreGlobalClipDisplay": bool,
	///     "ignoreGlobalClipSingleWindow": bool
	///   },
	///   "contentFilter": {
	///     "includeMenuBar": bool,
	///     "includedApplications": [{"bundleIdentifier": string, "processID": number}],
	///     "includedDisplays": [number],
	///     "includedWindows": [number],
	///     "excludedApplications": [{"bundleIdentifier": string, "processID": number}],
	///     "excludedWindows": [number],
	///     "exceptingWindows": [number]
	///   }
	/// }
	/// ```
	///
	/// Deserialization counterpart can be found in
	/// `//content/browser/media/capture/screen_capture_kit_config_mac.h`.
	///
	/// - Parameters:
	///  - streamConfiguration: The stream configuration to serialize.
	///  - filter: The content filter to serialize.
	///  - excludedWindows: Additional excluded windows to include in the serialization.
	///  - Returns: The serialized JSON string.
	///  - Throws: An error if serialization fails, e.g. due to exceeding ``maxJSONSizeInBytes``.
	private static func jsonSerialize(streamConfiguration: SCStreamConfiguration?, filter: SCContentFilter?, excludedWindows: [CGWindowID] = []) throws -> String {
		var rootDict: [String: Any] = ["version": 1]

		if let streamConfiguration {
			rootDict["streamConfiguration"] = streamConfiguration.dictionaryRepresentation
		}

		if let filter {
			rootDict["contentFilter"] = filter.dictionaryRepresentation
		}

		if excludedWindows.isEmpty == false {
			var contentFilterDict: [String: Any] = rootDict["contentFilter"] as? [String: Any] ?? [:]
			contentFilterDict["excludedWindows"] = excludedWindows
			rootDict["contentFilter"] = contentFilterDict
		}

		let jsonData: Data = try JSONSerialization.data(withJSONObject: rootDict, options: [.sortedKeys, .prettyPrinted])

		guard jsonData.count <= maxJSONSizeInBytes else {
			Logger.logMessage("Serialized stream configuration exceeds 8KB limit (\(jsonData.count) bytes)", level: .error)
			// TODO: throw error
			return ""
		}

		guard let jsonString = String(data: jsonData, encoding: .utf8) else {
			throw EncodableExtension.JSONStringError.encodableToJSON
		}

		return jsonString
	}

	/// Maximum size of the serialized JSON representation of the stream configuration and content filter.
	private static let maxJSONSizeInBytes: Int = 8 * 1024
}

@available(macOS 14.0, *)
extension SCStreamConfiguration {
	fileprivate var dictionaryRepresentation: [String: Any] {
		var dictionary: [String: Any] = [:]

		dictionary["showsCursor"] = showsCursor

		if sourceRect != .zero {
			dictionary["sourceRect"] = [
				"x": sourceRect.origin.x,
				"y": sourceRect.origin.y,
				"width": sourceRect.size.width,
				"height": sourceRect.size.height,
			]
		}

		if let components = backgroundColor.components, components.count >= 3 {
			let r = Int(components[0] * 255)
			let g = Int(components[1] * 255)
			let b = Int(components[2] * 255)
			let alpha = components.count >= 4 ? Int(components[3] * 255) : 255
			dictionary["backgroundColor"] = String(format: "#%02X%02X%02X%02X", r, g, b, alpha)
		}

		dictionary["shouldBeOpaque"] = shouldBeOpaque
		dictionary["ignoreShadowsDisplay"] = ignoreShadowsDisplay
		dictionary["ignoreShadowsSingleWindow"] = ignoreShadowsSingleWindow
		dictionary["ignoreGlobalClipDisplay"] = ignoreGlobalClipDisplay
		dictionary["ignoreGlobalClipSingleWindow"] = ignoreGlobalClipSingleWindow

		return dictionary
	}
}

@available(macOS 15.2, *)
extension SCContentFilter {
	fileprivate var dictionaryRepresentation: [String: Any] {
		var dictionary: [String: Any] = [:]

		dictionary["includeMenuBar"] = includeMenuBar

		if !includedApplications.isEmpty {
			dictionary["includedApplications"] = includedApplications
				.map {
					[
						"processID": $0.processID,
						"bundleIdentifier": $0.bundleIdentifier,
					]
				}
		}

		if !includedDisplays.isEmpty {
			dictionary["includedDisplays"] = includedDisplays
				.map { $0.displayID }
		}

		if !includedWindows.isEmpty {
			dictionary["includedWindows"] = includedWindows
				.map { $0.windowID }
		}

		return dictionary
	}
}
