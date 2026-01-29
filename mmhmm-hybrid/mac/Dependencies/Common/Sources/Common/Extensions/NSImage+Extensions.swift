//
//  NSImage+Extensions.swift
//  Common
//
//  Created by Beni Federer on 09.10.24.
//

import AppKit

extension NSImage {
	enum NSImageError: Error {
		case invalidSize
	}

	public var jpegData: Data? {
		guard let data = tiffRepresentation else {
			return nil
		}
		let rep = NSBitmapImageRep(data: data)
		return rep?.representation(using: .jpeg, properties: [.compressionMethod: NSBitmapImageRep.TIFFCompression.none])
	}

	public func resized(toSize targetSize: CGSize) throws -> NSImage {
		guard targetSize.width > 0, targetSize.height > 0 else {
			let message: String = "Attempt to resize image to a size that has one or both dimensions set to 0. This can cause lockFocus to throw NSImageCacheException. Requested size: \(targetSize)"
			assertionFailure(message)
			throw NSImageError.invalidSize
		}

		let image = NSImage(size: targetSize)
		image.lockFocus()
		draw(in: CGRect(origin: CGPoint.zero, size: targetSize),
			 from: CGRect(origin: CGPoint.zero, size: size),
			 operation: .sourceOver,
			 fraction: 1.0)
		image.unlockFocus()
		image.isTemplate = isTemplate
		return image
	}

	public func scaled(toSize size: CGSize) throws -> NSImage {
		let targetSize: CGSize = self.size.scaled(toSize: size)
		return try resized(toSize: targetSize)
	}

	public func tinted(with color: NSColor) -> NSImage {
		guard color.alphaComponent > 0.0 else {
			let transparentImage = NSImage(size: size)
			transparentImage.lockFocus()
			NSColor.clear.setFill()
			NSRect(origin: .zero, size: size).fill()
			transparentImage.unlockFocus()
			return transparentImage
		}

		guard let tintedImage = copy() as? NSImage else {
			return self
		}

		// Apply tint color

		tintedImage.isTemplate = false
		tintedImage.lockFocus()
		let imageRect = NSRect(origin: .zero, size: tintedImage.size)
		color.set()
		imageRect.fill(using: .sourceAtop)
		tintedImage.unlockFocus()

		guard color.alphaComponent < 1.0 else {
			return tintedImage
		}

		// Apply color opacity

		let imageWithOpacity = NSImage(size: tintedImage.size)
		imageWithOpacity.lockFocus()
		tintedImage.draw(in: imageRect, from: imageRect, operation: .copy, fraction: color.alphaComponent)
		imageWithOpacity.unlockFocus()

		return imageWithOpacity
	}

	/// Renders the image on a capsule-shaped background with the specified color.
	///
	/// - Parameters:
	///   - backgroundColor: The background color of the capsule.
	///   - size: The size to render the image at. The resulting capsule will be 20 points wider
	///           and 8 points taller to provide padding. Defaults to a width of 18 and a height of 16.
	/// - Returns: A new `NSImage` with the rendered capsule background.
	public func render(on backgroundColor: NSColor, size: NSSize = .init(width: 18, height: 16)) -> NSImage {
		guard size.width > 0, size.height > 0 else {
			let message: String = "Attempt to render image with a size that has one or both dimensions set to 0 or negative. This can cause lockFocus to throw NSImageCacheException."
			assertionFailure(message)
			return NSImage()
		}

		let horizontalPadding: CGFloat = 20
		let verticalPadding: CGFloat = 8
		let capsuleSize = NSSize(
			width: size.width + horizontalPadding,
			height: size.height + verticalPadding
		)

		let image = NSImage(size: capsuleSize)
		image.lockFocus()
		defer { image.unlockFocus() }

		// Draw background capsule
		backgroundColor.setFill()
		let capsulePath = NSBezierPath(
			roundedRect: NSRect(origin: .zero, size: capsuleSize),
			xRadius: capsuleSize.height / 2, yRadius: capsuleSize.height / 2
		)
		capsulePath.fill()

		// Draw self centered on top
		let imageOrigin = NSPoint(
			x: (capsuleSize.width - size.width) / 2,
			y: (capsuleSize.height - size.height) / 2
		)
		draw(in: NSRect(origin: imageOrigin, size: size))

		return image
	}
}
