//
//  Configuration.swift
//  CameraExtensionCommon
//
//  Copyright © 2022 mmhmm, inc. All rights reserved.
//

import CoreMediaIO
import Foundation

/// The configuration specifying the details of a virtual camera backed by a CMIO extension.
///
/// In this context,
/// * _sink_ refers to the input side of the virtual camera, i.e. where the producer pushes frames to,
/// * _source_ refers to the output side of the virtual camera, i.e. where frames are pushed to consumers.
public protocol Configuration {
	/// Name of the asset to be presented when no stream producer is connected.
	var landingPageAssetName: String { get }
	/// File extension of the asset to be presented when no stream producer is connected.
	var landingPageAssetExtension: String { get }
	/// Name of the camera as presented in consuming apps.
	var name: String { get }
	/// Manufacturer of the camera as presented in consuming apps.
	var manufacturer: String { get }
	/// Model of the camera as presented in consuming apps.
	var model: String { get }
	/// Stream identifier in reverse domain name notation, used by `CMIODeviceID` API to discover the stream.
	var sourceStreamName: String { get }
	/// Stream identifier in reverse domain name notation, used by `CMIODeviceID` API to discover the stream.
	var sinkStreamName: String { get }
	/// The playthrough frame rate.
	var frameRate: Int { get }
	/// The frame rate when presenting the landing page.
	var idleFrameRate: Int { get }
	/// The dimensions of the camera resolution.
	var resolution: CMVideoDimensions { get }
	/// The codec type of the camera stream.
	var codecType: SupportedVideoCodec { get }
	/// The UUID by which `CMIODeviceID` API can discover the camera device.
	var deviceUUID: UUID { get }
	/// Stream unique identifier.
	var cameraStreamUUID: UUID { get }
	/// Stream unique identifier.
	var sinkStreamUUID: UUID { get }
	/// The subsystem name for the system logging facility where fatal errors are logged to.
	var logSubsystem: String { get }
	/// The category name for the system logging facility where fatal errors are logged to.
	var logCategory: String { get }
	/// The prefix for all non-fatal log messages.
	var logMessagePrefix: String { get }
	/// Determines how logs are collected.
	var logCollectionMode: LogCollectionMode { get }
}

extension Configuration {
	public static func makeVideoFormatDescription(codecType: CMVideoCodecType, dimensions: CMVideoDimensions) throws -> CMFormatDescription {
		var videoDescription: CMFormatDescription?
		let error: OSStatus = CMVideoFormatDescriptionCreate(allocator: kCFAllocatorDefault,
															 codecType: codecType,
															 width: dimensions.width,
															 height: dimensions.height,
															 extensions: nil,
															 formatDescriptionOut: &videoDescription)
		guard error == noErr, let videoDescription else {
			throw ConfigurationError.creatingVideoFormatDescriptionFailed(error)
		}
		return videoDescription
	}
}

public enum ConfigurationError: Swift.Error {
	case creatingVideoFormatDescriptionFailed(OSStatus)
}

public enum LogCollectionMode {
	/// The camera extension provides logs by pushing via `notifyPropertiesChanged`.
	/// Consumers must set up a listener for the `CameraProperty.log.selectorName`.
	/// Logs get bulk pushed every 200 ms and are joined by `CameraProperty.logMessagesSeparator`.
	case push
	/// The camera extension provides logs via `streamProperties`.
	/// Listeners must set `CameraProperty.log.property` to a random value and
	/// then get `CameraProperty.log.property` to retrieve the next log message.
	case pull
}

/// The video codecs supported by the camera extension.
///
/// - Note: "Supported" really means "tested" in this context. Other codecs,
///         especially related ones, are likely to work just as well, but
///         haven't been tried out.
public enum SupportedVideoCodec: CMVideoCodecType, RawRepresentable {
	case nv12
	case bgra

	/// The underlying raw value of a supported video codec.
	///
	/// - Note: Although all video codec types and pixel format types are four-character codes,
	/// 		only certain codec types are also pixel formats.
	public var rawValue: FourCharCode {
		switch self {
		case .nv12: kCVPixelFormatType_420YpCbCr8BiPlanarVideoRange
		case .bgra: kCVPixelFormatType_32BGRA
		}
	}

	/// Creates a supported video codec enum value from a raw value.
	public init?(rawValue: Self.RawValue) {
		switch rawValue {
		case kCVPixelFormatType_420YpCbCr8BiPlanarVideoRange:
			self = .nv12
		case kCVPixelFormatType_32BGRA:
			self = .bgra
		default:
			return nil
		}
	}
}
