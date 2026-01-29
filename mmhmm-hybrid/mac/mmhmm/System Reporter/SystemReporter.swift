//
//  SystemReporter.swift
//  mmhmm
//
//  Created by Beni Federer on 27.03.24.
//

import AVFoundation
import Combine

import CxxCEF

struct SystemReporter {
	static let osVersionString: String = "macOS \(ProcessInfo.processInfo.operatingSystemVersionString)"

	enum AppBuildDisplayMode: Equatable {
		case raw
		case localDate
		case utcDate
	}

	static func appBuildString(mode: AppBuildDisplayMode) -> String {
		switch mode {
		case .raw:
			return appBuildString
		case .localDate:
			return "\(Formatter.localDateFormatter.string(from: appBuildDate)) (Local)"
		case .utcDate:
			return "\(Formatter.utcDateFormatter.string(from: appBuildDate)) (UTC)"
		}
	}

	static func appVersionDescription(withVersionDetail versionDetail: String) -> String {
		let bundleVersion: String = Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String ?? "Unknown"
		let releaseConfiguration: String = Configuration.Release.default.stringValue.capitalized
		let cefVersion: String = "\(CEF_VERSION_MAJOR)"
		return "\(bundleVersion) \(versionDetail) \(releaseConfiguration) - \(cefVersion)"
	}

	static func generateReport() async throws -> String {
		let (browserInfo, deviceManagerInfo): (WebApp.Info, DeviceManager.Info) = try await fetchBrowserAndDeviceManagerInfo()
		let processInfo = ProcessInfo.processInfo
		let architecture: String? = try? Sysctl.string(for: [CTL_HW, HW_MACHINE])
		let model: String? = try? Sysctl.string(for: [CTL_HW, HW_PRODUCT])
		let gpu: String? = MTLCreateSystemDefaultDevice()?.name
		let storageDescription = StorageDescription()
		let appTranslocationInfo = AppTranslocationInfo()
		let divider: String = "\n------------------------------------------------\n"

		return [
			"APPLICATION:",
			"Build: \(appBuildString(mode: .raw))",
			"Build: \(appBuildString(mode: .localDate))",
			"Build: \(appBuildString(mode: .utcDate))",
			"Track: \(Configuration.Release.default.stringValue.capitalized)",
			"CEF: \(CEF_VERSION_MAJOR).\(CEF_VERSION_MINOR).\(CEF_VERSION_PATCH).\(CEF_COMMIT_NUMBER)",
			"URL: \(appTranslocationInfo.appBundleURL.path) (\(appTranslocationInfo.appBundleLocation))",
			"Login Item: \(LoginItemInstaller.status(for: AirtimeMenuProxy.airtimeMenuBundleIdentifier))",
			divider,
			"SYSTEM:",
			"OS: \(osVersionString)",
			"Architecture: \(architecture ?? "Unknown")",
			"Processor Count: \(String(processInfo.processorCount))",
			"Model: \(model ?? "Unknown")",
			"GPU: \(gpu ?? "Unknown")",
			"Total Memory: \(Formatter.memoryByteCountFormatter.string(fromByteCount: Int64(processInfo.physicalMemory)))",
			"Free Storage (General):       \(storageDescription.generalAvailableStorage)",
			"Free Storage (Important):     \(storageDescription.importantAvailableStorage)",
			"Free Storage (Opportunistic): \(storageDescription.opportunisticAvailableStorage)",
			"Boot Time: \((try? ProcessInfo.bootTime.description) ?? "Unknown")",
			"Hardware ID: \(Hardware.identifier.uuidString)",
			divider,
			"DEVICES:",
			"Active Microphone: \(browserInfo.activeAudioDevice)",
			"Active Camera: \(browserInfo.activeVideoDevice)",
			"Microphones: \(AVCaptureDevice.availableAudioDeviceDescriptions())",
			"Cameras: \(AVCaptureDevice.availableVideoDeviceDescriptions())",
			"PERMISSIONS:",
			"Microphone: \(deviceManagerInfo.microphonePermissionStatus)",
			"Camera: \(deviceManagerInfo.cameraPermissionStatus)",
			"Virtual Camera: \(deviceManagerInfo.virtualCameraStatus)",
			divider,
			"ACCOUNT:",
			"Email: \(browserInfo.loggedInUserEmail)",
			"ID: \(browserInfo.loggedInUserID)",
			"Service: \(Configuration.Service.default.stringValue.capitalized)",
		].joined(separator: "\n")
	}

	static func logAppInfoLaunchSummary() {
		SystemReporter
			.appInfoLaunchSummary
			.forEach {
				Logger.logMessage($0, level: .info)
			}
	}

	/// Most important app info available immediately at app launch,
	/// suitable to log over multiple lines as a log run header.
	static var appInfoLaunchSummary: [String] {
		let buildNumber: String = appBuildString(mode: .raw)
		let appTranslocationInfo = SystemReporter.AppTranslocationInfo()

		var summary: [String] = [
			appVersionDescription(withVersionDetail: buildNumber),
			osVersionString,
			"\(appTranslocationInfo.appBundleURL.path) (\(appTranslocationInfo.appBundleLocation))",
			"PID: \(getpid()) UID: \(getuid())",
		]

		if Configuration.hasOverrides {
			summary += ["Overrides: \(Configuration.overridesSummary)"]
		}
		if let checkIns: [String: [String: Any]] = UserDefaults.standard.crashLoopPreventionCheckIns, checkIns.isEmpty == false {
			summary += ["Check-In: \(checkIns.description)"]
		}

		return summary
	}

	static func copyAppVersionToPasteboard() {
		NSPasteboard.general.clearContents()
		let buildNumber: String = appBuildString(mode: .raw)
		let appVersion: String = appVersionDescription(withVersionDetail: "(\(buildNumber))")
		NSPasteboard.general.setString(appVersion, forType: .string)
	}
}

extension SystemReporter {
	private static let appBuildString: String = if let rawBuildString: String = Bundle.main.infoDictionary?["CFBundleVersion"] as? String, Int(rawBuildString) != 0 {
		rawBuildString
	} else {
		"Just now"
	}

	private static let appBuildDate: Date = if let rawBuildString: String = Bundle.main.infoDictionary?["CFBundleVersion"] as? String, Int(rawBuildString) != 0 {
		Date(timeIntervalSince1970: TimeInterval(rawBuildString) ?? 0)
	} else {
		Date()
	}

	private static func fetchBrowserAndDeviceManagerInfo() async throws -> (WebApp.Info, DeviceManager.Info) {
		let deviceManagerInfo: DeviceManager.Info = await Application.cefAppDelegate.deviceManager.info
		do {
			let browser: Browser = await Application.cefAppDelegate.browser
			async let webAppInfo: WebApp.Info = if browser.isPresenting(webAppOfType: .camera) {
				try await browser.camera.info
			} else if browser.isPresenting(webAppOfType: .creator) {
				try await browser.creator.info
			} else {
				WebApp.Info.unknown
			}
			// swiftformat:disable:next spaceAroundParens
			return try await (webAppInfo, deviceManagerInfo)
		} catch {
			Logger.logError(error, messagePrefix: "Failed to fetch browser info", level: .error, targets: .uncheckedAll)
			return (WebApp.Info.unknown, deviceManagerInfo)
		}
	}
}

extension SystemReporter {
	private struct StorageDescription {
		private static let unknownStorageDescription: String = "Unknown"
		let generalAvailableStorage: String
		let importantAvailableStorage: String
		let opportunisticAvailableStorage: String

		init() {
			let availableCapacityValues: URLResourceValues = if
				let applicationSupportDirectory = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask).first,
				let values: URLResourceValues = try? applicationSupportDirectory.resourceValues(forKeys: [
					.volumeAvailableCapacityKey,
					.volumeAvailableCapacityForImportantUsageKey,
					.volumeAvailableCapacityForOpportunisticUsageKey,
				]) {
				values
			} else {
				URLResourceValues()
			}

			let formatter = Formatter.fileByteCountFormatter

			generalAvailableStorage = if let generalAvailableStorage: Int = availableCapacityValues.volumeAvailableCapacity {
				formatter.string(fromByteCount: Int64(generalAvailableStorage))
			} else {
				StorageDescription.unknownStorageDescription
			}

			importantAvailableStorage = if let importantAvailableStorage: Int64 = availableCapacityValues.volumeAvailableCapacityForImportantUsage {
				formatter.string(fromByteCount: importantAvailableStorage)
			} else {
				StorageDescription.unknownStorageDescription
			}

			opportunisticAvailableStorage = if let opportunisticAvailableStorage: Int64 = availableCapacityValues.volumeAvailableCapacityForOpportunisticUsage {
				formatter.string(fromByteCount: opportunisticAvailableStorage)
			} else {
				StorageDescription.unknownStorageDescription
			}
		}
	}

	fileprivate struct AppTranslocationInfo {
		let appBundleURL: URL
		let appBundleLocation: RuntimeLocation

		init() {
			let bundle = Bundle.main
			appBundleURL = bundle.bundleURL
			appBundleLocation = RuntimeLocation(ofBundle: bundle)
		}
	}
}

extension SystemReporter.AppTranslocationInfo {
	enum RuntimeLocation {
		case translocated
		case original

		init(ofBundle bundle: Bundle) {
			self = if bundle.bundleURL.isTranslocated {
				.translocated
			} else {
				.original
			}
		}
	}
}

extension SystemReporter.AppTranslocationInfo.RuntimeLocation: CustomStringConvertible {
	var description: String {
		switch self {
		case .translocated:
			return "translocated"
		case .original:
			return "original"
		}
	}
}
