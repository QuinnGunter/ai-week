//
//  Configuration+Properties.swift
//  CameraExtension
//
//  Created by Beni Federer on 07.12.23.
//

import CoreMediaIO
import Foundation

import CameraExtensionCommon

extension Configuration {
	var frameDuration: CMTime { CMTime(value: 1, timescale: Int32(frameRate)) }

	var videoDescription: CMFormatDescription {
		get throws {
			try Self.makeVideoFormatDescription(codecType: codecType.rawValue, dimensions: resolution)
		}
	}

	var videoStreamFormat: CMIOExtensionStreamFormat {
		get throws {
			try CMIOExtensionStreamFormat(formatDescription: videoDescription,
										  maxFrameDuration: frameDuration,
										  minFrameDuration: frameDuration,
										  validFrameDurations: nil)
		}
	}

	var pixelBufferAttributes: NSDictionary {
		get throws {
			[
				kCVPixelBufferWidthKey: resolution.width,
				kCVPixelBufferHeightKey: resolution.height,
				kCVPixelBufferPixelFormatTypeKey: codecType.rawValue,
				kCVPixelBufferIOSurfacePropertiesKey: [:],
			]
		}
	}
}
