//
//  CameraConfiguration.swift
//  CameraExtension
//
//  Copyright © 2022 mmhmm, inc. All rights reserved.
//

import CoreMediaIO
import Foundation

import CameraExtensionCommon

enum VirtualCameraExtension {
	static let deviceUUID = UUID(uuidString: "54E37095-DA8C-4CE4-A5A3-3E8BA152F7BD")!
	static let sourceStreamName: String = "mmhmm.camera.extension.video.source"
}

extension VirtualCameraExtension {
	struct HybridConfiguration: CameraExtensionCommon.Configuration {
		let landingPageAssetName: String = "no_producer"
		let landingPageAssetExtension: String = "png"
		let name: String = "Airtime"
		let manufacturer: String = "mmhmm inc."
		let model: String = "Airtime Virtual Camera"
		let sourceStreamName: String = VirtualCameraExtension.sourceStreamName
		let sinkStreamName: String = "mmhmm.camera.extension.video.sink"
		let frameRate: Int = 30
		let idleFrameRate: Int = 1
		let resolution = CMVideoDimensions(width: 1920, height: 1080)
		let codecType: SupportedVideoCodec = .nv12
		let deviceUUID = VirtualCameraExtension.deviceUUID
		let cameraStreamUUID = UUID(uuidString: "F01D9B35-96B2-4E3C-A4A1-9F8B013FB301")!
		let sinkStreamUUID = UUID(uuidString: "F01D9B35-96B2-4E3C-A4A1-9F8B013FB302")!
		let logSubsystem: String = "airtime.camera.extension"
		let logCategory: String = "hybrid.virtualcamera"
		let logMessagePrefix: String = ""
		let logCollectionMode: LogCollectionMode = .push
	}
}
