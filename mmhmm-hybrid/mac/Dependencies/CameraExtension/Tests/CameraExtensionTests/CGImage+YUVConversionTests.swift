//
//  CGImage+YUVConversionTests.swift
//  CameraExtensionTests
//
//  Created by Beni Federer on 02.02.24.
//

import XCTest

@testable import CameraExtension
import CameraExtensionCommon
import CoreMedia

final class CGImage_YUVConversionTests: XCTestCase {
	private static var tempFileURL: URL {
		URL(fileURLWithPath: "/tmp/\(String(describing: Self.self))/testImage.png")
	}

	private static let testImage: CGImage = {
		let imageName: String = "no_producer"
		let imageExtension: String = "png"

		// There are quite some prerequisites to get the `module` API, see https://stackoverflow.com/a/63242343
		guard let imageURL: URL = Bundle.module.url(forResource: imageName, withExtension: imageExtension) else {
			XCTFail("Expected \(imageName).\(imageExtension) to exist.")
			abort()
		}

		guard
			let imageSource = CGImageSourceCreateWithURL(imageURL as CFURL, nil),
			let cgImage = CGImageSourceCreateImageAtIndex(imageSource, 0, nil)
		else {
			XCTFail("Failed creating image.")
			abort()
		}

		return cgImage
	}()

	private var bufferPool: CVPixelBufferPool?

	func testConvertedFromRGBA888To420Yp8_CbCr8DoesNotThrow() throws {
		let testImage: CGImage = Self.testImage
		var pixelBuffer: CVPixelBuffer = try make420YpCbCr8BiPlanarFullRangePixelBuffer(forDimensionsOfImage: testImage, codec: .nv12)
		XCTAssertGreaterThan(CVPixelBufferGetDataSize(pixelBuffer), 0)
		XCTAssertNoThrow(try testImage.convertedFromRGBA888To420Yp8_CbCr8(using420Yp8_CbCr8Buffer: &pixelBuffer, colorChannels: .bgra))
	}

	func testConvertedFromRGBA888To420Yp8_CbCr8ResultHasData() throws {
		let testImage: CGImage = Self.testImage
		var pixelBuffer: CVPixelBuffer = try make420YpCbCr8BiPlanarFullRangePixelBuffer(forDimensionsOfImage: testImage, codec: .nv12)
		try testImage.convertedFromRGBA888To420Yp8_CbCr8(using420Yp8_CbCr8Buffer: &pixelBuffer, colorChannels: .bgra)
		XCTAssertGreaterThan(CVPixelBufferGetDataSize(pixelBuffer), 0)
	}

	func testConvertedFromRGBA888To420Yp8_CbCr8ResultToSampleBufferAndReconversionFileWrite() throws {
		let testImage: CGImage = Self.testImage
		var pixelBuffer: CVPixelBuffer = try make420YpCbCr8BiPlanarFullRangePixelBuffer(forDimensionsOfImage: testImage, codec: .nv12)
		try testImage.convertedFromRGBA888To420Yp8_CbCr8(using420Yp8_CbCr8Buffer: &pixelBuffer, colorChannels: .bgra)

		let codecType: SupportedVideoCodec = .nv12
		let resolution = CMVideoDimensions(width: Int32(testImage.width), height: Int32(testImage.height))
		let videoDescription = try TestConfiguration.makeVideoFormatDescription(codecType: codecType.rawValue, dimensions: resolution)

		var sampleBuffer: CMSampleBuffer?
		var timingInfo = CMSampleTimingInfo(duration: .zero,
											presentationTimeStamp: CMClock.hostTimeClock.time,
											decodeTimeStamp: .zero)
		let imageBufferError: OSStatus = CMSampleBufferCreateForImageBuffer(allocator: kCFAllocatorDefault,
																			imageBuffer: pixelBuffer,
																			dataReady: true,
																			makeDataReadyCallback: nil,
																			refcon: nil,
																			formatDescription: videoDescription,
																			sampleTiming: &timingInfo,
																			sampleBufferOut: &sampleBuffer)
		XCTAssertEqual(imageBufferError, noErr)
		XCTAssertNotNil(sampleBuffer)

		let convertedBufferImage: CGImage = try CGImage.convertedToRGBA888(from420Yp8_CbCr8SampleBuffer: sampleBuffer.unsafelyUnwrapped, colorChannels: .abgr)
		XCTAssertNotNil(convertedBufferImage)

		try? FileManager.default.removeItem(at: Self.tempFileURL)
		try FileManager.default.createDirectory(at: Self.tempFileURL.deletingLastPathComponent(), withIntermediateDirectories: true)
		XCTAssertTrue(convertedBufferImage.writePNG(toURL: Self.tempFileURL))
	}
}

extension CGImage_YUVConversionTests {
	enum ConversionError: Swift.Error {
		case pixelBufferPoolCreationFailed(error: CVReturn)
		case pixelBufferCreationFailed(error: CVReturn)
	}

	private func make420YpCbCr8BiPlanarFullRangePixelBuffer(forDimensionsOfImage image: CGImage, codec: SupportedVideoCodec) throws -> CVPixelBuffer {
		let pixelBufferAttributes: NSDictionary = [
			kCVPixelBufferWidthKey: image.width,
			kCVPixelBufferHeightKey: image.height,
			kCVPixelBufferPixelFormatTypeKey: codec.rawValue,
			kCVPixelBufferIOSurfacePropertiesKey: [:],
		]

		let createPoolResult: CVReturn = CVPixelBufferPoolCreate(kCFAllocatorDefault, nil, pixelBufferAttributes, &bufferPool)
		guard createPoolResult == kCVReturnSuccess, let bufferPool else {
			throw ConversionError.pixelBufferPoolCreationFailed(error: createPoolResult)
		}

		// Create a pixel buffer
		var pixelBuffer: CVPixelBuffer?
		let createBufferResult: CVReturn = CVPixelBufferPoolCreatePixelBufferWithAuxAttributes(kCFAllocatorDefault, bufferPool, nil, &pixelBuffer)
		guard createBufferResult == kCVReturnSuccess, let pixelBuffer else {
			throw ConversionError.pixelBufferCreationFailed(error: createPoolResult)
		}

		return pixelBuffer
	}

	private struct TestConfiguration: Configuration {
		var landingPageAssetName: String = ""
		var landingPageAssetExtension: String = ""
		var name: String = ""
		var manufacturer: String = ""
		var model: String = ""
		var sourceStreamName: String = ""
		var sinkStreamName: String = ""
		var frameRate: Int = 30
		var idleFrameRate: Int = 1
		var resolution = CMVideoDimensions(width: 1980, height: 1040)
		var codecType: SupportedVideoCodec = .nv12
		var deviceUUID = UUID()
		var cameraStreamUUID = UUID()
		var sinkStreamUUID = UUID()
		var logSubsystem: String = ""
		var logCategory: String = ""
		var logMessagePrefix: String = ""
		var logCollectionMode: CameraExtensionCommon.LogCollectionMode
	}
}
