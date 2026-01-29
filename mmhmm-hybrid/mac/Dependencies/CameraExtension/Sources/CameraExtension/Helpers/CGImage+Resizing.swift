//
//  CGImage+Resizing.swift
//  CameraExtension
//
//  Created by Beni Federer on 13.12.23.
//

import CoreGraphics

extension CGImage {
	func resized(toSize size: CGSize) throws -> CGImage {
		guard
			let context = CGContext(data: nil,
									width: width,
									height: height,
									bitsPerComponent: 8,
									bytesPerRow: 0,
									space: CGColorSpaceCreateDeviceRGB(),
									bitmapInfo: CGImageAlphaInfo.noneSkipFirst.rawValue | CGBitmapInfo.byteOrder32Little.rawValue)
		else {
			throw Error.acquiringGraphicsContextFailed
		}

		context.interpolationQuality = .high
		context.draw(self, in: CGRect(x: 0, y: 0, width: width, height: height))

		guard let result = context.makeImage() else {
			throw Error.makingImageFailed
		}

		return result
	}

	enum Error: Swift.Error {
		case acquiringGraphicsContextFailed
		case makingImageFailed
	}
}
