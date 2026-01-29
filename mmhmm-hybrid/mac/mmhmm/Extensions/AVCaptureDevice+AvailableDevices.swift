//
//  AVCaptureDevice+AvailableDevices.swift
//  mmhmm
//
//  Created by Beni Federer on 04.04.24.
//

import AVFoundation

extension AVCaptureDevice {
	/// Creates a textual representation of all available audio capture devices,
	/// using their localized names.
	///
	/// - Returns: The names of available devices.
	static func availableAudioDeviceDescriptions() -> String {
		availableDeviceDescriptions(ofType: .audio)
	}

	/// Creates a textual representation of all available video capture devices,
	/// using their localized names.
	///
	/// - Returns: The names of available devices.
	static func availableVideoDeviceDescriptions() -> String {
		availableDeviceDescriptions(ofType: .video)
	}

	private static func availableDeviceDescriptions(ofType mediaType: AVMediaType) -> String {
		availableDevices(ofType: mediaType)
			.map { $0.localizedName }
			.joined(separator: ", ")
	}

	/// Lists all available capture devices matching the specified media type.
	///
	/// If available, the default capture device is ordered first in the returned array.
	///
	/// - Parameter mediaType: The media type of the devices to find availability for.
	/// - Returns: The available devices.
	static func availableDevices(ofType mediaType: AVMediaType) -> [AVCaptureDevice] {
		let deviceTypes: [AVCaptureDevice.DeviceType] =
			switch mediaType {
			case .video:
				[.builtInWideAngleCamera, .externalUnknown]
			case .audio:
				[.builtInMicrophone, .externalUnknown]
			default:
				[]
			}

		var devices: [AVCaptureDevice] = AVCaptureDevice
			.DiscoverySession(deviceTypes: deviceTypes, mediaType: mediaType, position: .unspecified)
			.devices
			.filter { $0.allowsInput }

		if let defaultDevice: AVCaptureDevice = .default(for: mediaType),
		   let defaultDeviceIndex: Int = devices.firstIndex(of: defaultDevice) {
			devices.move(fromOffsets: IndexSet(integer: defaultDeviceIndex), toOffset: 0)
		}

		return devices
	}

	private var allowsInput: Bool {
		// swiftformat:disable:indent
		isConnected &&
		isSuspended == false &&
		uniqueID.contains("CADefaultDeviceAggregate") == false
		// swiftformat:enable:indent
	}
}
