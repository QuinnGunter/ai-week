//
//  DeviceManager+HybridAppCapabilities.swift
//  mmhmm
//
//  Created by Beni Federer on 12.11.24.
//

import AVFoundation

extension DeviceManager {
	var hybridAppCapabilities: mmhmm.AppCapabilities {
		get async {
			let cameraState = mmhmm.CaptureDeviceState(await cameraPermissionStatus.hybridState, "")
			let camera = mmhmm.Camera(state: cameraState)

			let microphoneState = mmhmm.CaptureDeviceState(await microphonePermissionStatus.hybridState, "")
			let microphone = mmhmm.Microphone(state: microphoneState)

			var appCapabilities = mmhmm.AppCapabilities()
			appCapabilities.nativeSeg = true
			appCapabilities.supportsWebMiniRemote = true
			appCapabilities.camera = camera
			appCapabilities.hardwareInfo = SystemReporter.SystemInfo().hybridHardwareInfo
			appCapabilities.microphone = microphone

			if #available(macOS 15.2, *) {
				appCapabilities.supportsScreenSharePickerV2 = true
			}

			return appCapabilities
		}
	}

	func updateHybridWithAppCapabilities() async {
		Logger.logMessage("Updating web app with app capabilities.", level: .info)

		let hybridAppCapabilities: mmhmm.AppCapabilities = await hybridAppCapabilities
		CxxBridge.updateAppCapabilities(hybridAppCapabilities)
	}
}

extension SystemReporter.SystemInfo {
	fileprivate var hybridHardwareInfo: mmhmm.HardwareInfo {
		var hardwareInfo = mmhmm.HardwareInfo()
		hardwareInfo.cpuArch = std.string(cpuArch)
		hardwareInfo.cpuCores = std.string(cpuCores)
		hardwareInfo.gpuName = std.string(gpuName)
		hardwareInfo.memory = std.string(memory)
		hardwareInfo.model = std.string(model)
		hardwareInfo.os = std.string(os)
		hardwareInfo.osVersion = std.string(osVersion)
		return hardwareInfo
	}
}

extension AVAuthorizationStatus {
	fileprivate var hybridState: mmhmm.CaptureDeviceRawState {
		switch self {
		case .authorized: .authorized
		case .denied: .denied
		case .notDetermined: .notDetermined
		case .restricted: .restricted
		@unknown default: .notDetermined
		}
	}
}
