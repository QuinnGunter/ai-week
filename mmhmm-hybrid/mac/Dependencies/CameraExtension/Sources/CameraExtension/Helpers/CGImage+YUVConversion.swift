//
//  CGImage+YUVConversion.swift
//  CameraExtension
//
//  Created by Beni Federer on 02.02.24.
//

import Accelerate
import CoreMedia
import Foundation

import CameraExtensionCommon
import Common

extension CGImage {
	/// Color channel orders defining the mapping between data and the colors they represent.
	public enum ColorChannelMap {
		case argb
		case abgr
		case rgba
		case bgra
		case custom([UInt8])

		public var indices: [UInt8] {
			switch self {
			case .argb: [0, 1, 2, 3]
			case .abgr: [0, 3, 2, 1]
			case .rgba: [1, 2, 3, 0]
			case .bgra: [3, 2, 1, 0]
			case let .custom(map): map
			}
		}
	}

	/// Converts an image from a RGBA format to NV12 into a pixel buffer.
	///
	/// - Parameters:
	///   - pixelBuffer: The pre-allocated pixel buffer to fill with the conversion result.
	///   - colorChannels: A map describing the color channel configuration of the input image.
	public func convertedFromRGBA888To420Yp8_CbCr8(using420Yp8_CbCr8Buffer pixelBuffer: inout CVPixelBuffer, colorChannels: ColorChannelMap) throws {
		let lockReturn: CVReturn = CVPixelBufferLockBaseAddress(pixelBuffer, .readOnly)
		guard lockReturn == kCVReturnSuccess else {
			throw ConversionError.failedLockingPixelBufferBaseAddress(lockReturn)
		}
		defer { CVPixelBufferUnlockBaseAddress(pixelBuffer, .readOnly) }

		guard let rgbSourceImageFormat = vImage_CGImageFormat(cgImage: self) else {
			throw ConversionError.failedCreatingSourceImageFormat
		}

		// Source buffer
		var sourceImageBuffer = try vImage_Buffer(cgImage: self, format: rgbSourceImageFormat)

		// Destination buffers
		let width: UInt = vImagePixelCount(self.width)
		let height: UInt = vImagePixelCount(self.height)

		let destinationYpRowBytes: Int = CVPixelBufferGetBytesPerRowOfPlane(pixelBuffer, 0)
		let destinationYpData: UnsafeMutableRawPointer? = CVPixelBufferGetBaseAddressOfPlane(pixelBuffer, 0)
		var destinationYpImageBuffer = vImage_Buffer(data: destinationYpData, height: height, width: width, rowBytes: destinationYpRowBytes)

		let destinationCbCrRowBytes: Int = CVPixelBufferGetBytesPerRowOfPlane(pixelBuffer, 1)
		let destCbCrData: UnsafeMutableRawPointer? = CVPixelBufferGetBaseAddressOfPlane(pixelBuffer, 1)
		var destinationCbCrImageBuffer = vImage_Buffer(data: destCbCrData, height: height, width: width, rowBytes: destinationCbCrRowBytes)

		var conversionInfo: vImage_ARGBToYpCbCr = try ARGBToYpCbCrConversionInfo.shared
		var permuteMapArray: [UInt8] = colorChannels.indices
		let conversionError: vImage_Error = vImageConvert_ARGB8888To420Yp8_CbCr8(&sourceImageBuffer, &destinationYpImageBuffer, &destinationCbCrImageBuffer, &conversionInfo, &permuteMapArray, 0)
		guard conversionError == kvImageNoError else {
			throw ConversionError.conversionFailedWithError(conversionError)
		}
	}

	/// Converts an image from an NV12 image sample buffer into an RGBA image.
	///
	/// - Parameters:
	///   - sampleBuffer: The sample buffer to be converted.
	///   - colorChannels: A map describing the color channel configuration of the input image buffer.
	/// - Returns: The converted image
	static func convertedToRGBA888(from420Yp8_CbCr8SampleBuffer sampleBuffer: CMSampleBuffer, colorChannels: ColorChannelMap) throws -> CGImage {
		guard let imageBuffer = CMSampleBufferGetImageBuffer(sampleBuffer) else {
			throw ConversionError.failedGettingImageBuffer
		}

		let lockingResult: CVReturn = CVPixelBufferLockBaseAddress(imageBuffer, .readOnly)
		guard lockingResult == kCVReturnSuccess else {
			throw ConversionError.failedLockingPixelBufferBaseAddress(lockingResult)
		}
		defer { CVPixelBufferUnlockBaseAddress(imageBuffer, .readOnly) }

		let luminancePlaneIndex: Int = 0
		guard let lumaBaseAddress: UnsafeMutableRawPointer = CVPixelBufferGetBaseAddressOfPlane(imageBuffer, luminancePlaneIndex) else {
			throw ConversionError.failedGettingBaseAddress(planeIndex: luminancePlaneIndex)
		}

		let lumaWidth: Int = CVPixelBufferGetWidthOfPlane(imageBuffer, luminancePlaneIndex)
		let lumaHeight: Int = CVPixelBufferGetHeightOfPlane(imageBuffer, luminancePlaneIndex)
		let lumaBytesPerRow: Int = CVPixelBufferGetBytesPerRowOfPlane(imageBuffer, luminancePlaneIndex)
		var lumaBuffer = vImage_Buffer(data: lumaBaseAddress, height: vImagePixelCount(lumaHeight), width: vImagePixelCount(lumaWidth), rowBytes: lumaBytesPerRow)

		let chrominancePlaneIndex: Int = 1
		guard let chromaBaseAddress: UnsafeMutableRawPointer = CVPixelBufferGetBaseAddressOfPlane(imageBuffer, chrominancePlaneIndex) else {
			throw ConversionError.failedGettingBaseAddress(planeIndex: chrominancePlaneIndex)
		}

		let chromaWidth: Int = CVPixelBufferGetWidthOfPlane(imageBuffer, chrominancePlaneIndex)
		let chromaHeight: Int = CVPixelBufferGetHeightOfPlane(imageBuffer, chrominancePlaneIndex)
		let chromaBytesPerRow: Int = CVPixelBufferGetBytesPerRowOfPlane(imageBuffer, chrominancePlaneIndex)
		var chromaBuffer = vImage_Buffer(data: chromaBaseAddress, height: vImagePixelCount(chromaHeight), width: vImagePixelCount(chromaWidth), rowBytes: chromaBytesPerRow)

		var argbBuffer = try vImage_Buffer(size: CGSize(width: lumaWidth, height: lumaHeight), bitsPerPixel: 32)
		defer { free(argbBuffer.data) }

		var conversionInfo: vImage_YpCbCrToARGB = try YpCbCrToARGBConversionInfo.shared
		var permuteMapArray: [UInt8] = colorChannels.indices
		let conversionError: vImage_Error = vImageConvert_420Yp8_CbCr8ToARGB8888(&lumaBuffer, &chromaBuffer, &argbBuffer, &conversionInfo, &permuteMapArray, 255, 0)
		guard conversionError == kvImageNoError else {
			throw ConversionError.conversionFailedWithError(conversionError)
		}

		guard
			let context = CGContext(
				data: argbBuffer.data,
				width: Int(argbBuffer.width),
				height: Int(argbBuffer.height),
				bitsPerComponent: 8,
				bytesPerRow: argbBuffer.rowBytes,
				space: CGColorSpaceCreateDeviceRGB(),
				bitmapInfo: CGImageAlphaInfo.premultipliedFirst.rawValue
			),
			let image = context.makeImage()
		else {
			throw ConversionError.failedCreatingContext
		}

		return image
	}

	public enum ConversionError: BaseErrorWithAssociatedValues {
		case failedCreatingSourceImageFormat
		case failedLockingPixelBufferBaseAddress(CVReturn)
		case failedGettingBaseAddress(planeIndex: Int)
		case failedGettingImageBuffer
		case failedCreatingContext
		case conversionFailedWithError(vImage_Error)
		case conversionGenerationFailedWithError(vImage_Error)

		public static var domain: String = "CVPixelBuffer.Conversion"
		public static var allCases: [ConversionError] = [
			.failedCreatingSourceImageFormat,
			.failedLockingPixelBufferBaseAddress(kCVReturnSuccess),
			.failedLockingPixelBufferBaseAddress(kCVReturnSuccess),
			.failedGettingBaseAddress(planeIndex: 0),
			.failedCreatingContext,
			.conversionFailedWithError(kvImageNoError),
			.conversionGenerationFailedWithError(kvImageNoError),
		]

		public var errorMessage: String {
			switch self {
			case .failedCreatingSourceImageFormat: "Creating source image format failed."
			case let .failedLockingPixelBufferBaseAddress(cvReturn): "Locking pixel buffer base address failed: \(cvReturn)"
			case let .failedGettingBaseAddress(planeIndex): "Failed getting base address of plane with index: \(planeIndex)"
			case .failedGettingImageBuffer: "No image buffer found."
			case .failedCreatingContext: "Failed creating graphics context."
			case let .conversionFailedWithError(error): "Conversion failed: \(error)"
			case let .conversionGenerationFailedWithError(error): "Conversion generation failed: \(error)"
			}
		}
	}
}

extension CGImage {
	/// Information required by an ARGB to YpCbCr conversion.
	private struct ARGBToYpCbCrConversionInfo {
		/// This variable is created only once, as suggested by Accelerate documentation.
		private static var conversionInfoForARGBToYpCbCr: vImage_ARGBToYpCbCr?

		/// Creates information required by an ARGB to YpCbCr conversion.
		///
		/// The created information supports full 8-bit pixel range conversions.
		/// The result may be reused multiple times from multiple threads concurrently.
		///
		/// - Returns: Information supporting an ARGB to YpCbCr conversion
		/// - Throws: An error if generation of the information failed.
		/// 		  Additional diagnostics are logged to the console by the Accelerate framework.
		static var shared: vImage_ARGBToYpCbCr {
			get throws {
				if conversionInfoForARGBToYpCbCr == nil {
					var conversionInfo = vImage_ARGBToYpCbCr()

					// Create a pixel range for full range 8-bit, clamped to full range.
					var pixelRange = vImage_YpCbCrPixelRange(Yp_bias: 0, CbCr_bias: 128, YpRangeMax: 255, CbCrRangeMax: 255, YpMax: 255, YpMin: 1, CbCrMax: 255, CbCrMin: 0)
					let generationFlags = vImage_Flags(kvImagePrintDiagnosticsToConsole)

					let generationError: vImage_Error = vImageConvert_ARGBToYpCbCr_GenerateConversion(kvImage_ARGBToYpCbCrMatrix_ITU_R_709_2, &pixelRange, &conversionInfo, kvImageARGB8888, kvImage420Yp8_CbCr8, generationFlags)
					guard generationError == kvImageNoError else {
						throw ConversionError.conversionGenerationFailedWithError(generationError)
					}

					Self.conversionInfoForARGBToYpCbCr = conversionInfo
				}

				return conversionInfoForARGBToYpCbCr.unsafelyUnwrapped
			}
		}
	}

	/// Information required by a YpCbCr to ARGB conversion.
	private struct YpCbCrToARGBConversionInfo {
		/// This variable is created only once, as suggested by Accelerate documentation.
		private static var conversionInfoForYpCbCrToARGB: vImage_YpCbCrToARGB?

		/// Creates information required by an YpCbCr to ARGB conversion.
		///
		/// The created information supports full 8-bit pixel range conversions.
		/// The result may be reused multiple times from multiple threads concurrently.
		///
		/// - Returns: Information supporting an YpCbCr to ARGB conversion
		/// - Throws: An error if generation of the information failed.
		/// 		  Additional diagnostics are logged to the console by the Accelerate framework.
		static var shared: vImage_YpCbCrToARGB {
			get throws {
				if conversionInfoForYpCbCrToARGB == nil {
					var conversionInfo = vImage_YpCbCrToARGB()

					// Create a pixel range for full range 8-bit, clamped to full range.
					var pixelRange = vImage_YpCbCrPixelRange(Yp_bias: 0, CbCr_bias: 128, YpRangeMax: 255, CbCrRangeMax: 255, YpMax: 255, YpMin: 1, CbCrMax: 255, CbCrMin: 0)
					let generationFlags = vImage_Flags(kvImagePrintDiagnosticsToConsole)

					let generationError: vImage_Error = vImageConvert_YpCbCrToARGB_GenerateConversion(kvImage_YpCbCrToARGBMatrix_ITU_R_709_2, &pixelRange, &conversionInfo, kvImage420Yp8_CbCr8, kvImageARGB8888, generationFlags)
					guard generationError == kvImageNoError else {
						throw ConversionError.conversionGenerationFailedWithError(generationError)
					}

					Self.conversionInfoForYpCbCrToARGB = conversionInfo
				}

				return conversionInfoForYpCbCrToARGB.unsafelyUnwrapped
			}
		}
	}
}

extension CGImage {
	/// Writes an image to a PNG file.
	///
	/// - Parameter url: The URL to write the file to.
	/// - Returns: `true` if successful, `false` otherwise.
	func writePNG(toURL url: URL) -> Bool {
		guard let destination = CGImageDestinationCreateWithURL(url as CFURL, "public.png" as CFString, 1, nil) else { return false }
		CGImageDestinationAddImage(destination, self, nil)
		return CGImageDestinationFinalize(destination)
	}
}
