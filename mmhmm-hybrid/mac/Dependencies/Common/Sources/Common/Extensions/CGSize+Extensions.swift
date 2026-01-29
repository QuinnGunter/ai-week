//
//  CGSize+Extensions.swift
//  Common
//
//  Created by Matthew Tonkin on 1/11/2022.
//

import AppKit

extension CGSize {
	public func scaled(toSize scaledSize: CGSize, rounded: Bool = true) -> CGSize {
		guard width > 0, height > 0 else {
			return self
		}

		let widthFactor: CGFloat = scaledSize.width / width
		let heightFactor: CGFloat = scaledSize.height / height

		let scaleFactor: CGFloat = widthFactor < heightFactor ? widthFactor : heightFactor

		let scaledWidth: CGFloat = width * scaleFactor
		let scaledHeight: CGFloat = height * scaleFactor
		if rounded {
			return CGSize(width: scaledWidth.rounded(), height: scaledHeight.rounded())
		} else {
			return CGSize(width: scaledWidth, height: scaledHeight)
		}
	}

	@MainActor public func zeroLengthsReplacedWithScreenBoundsMax(ofWindow window: NSWindow) -> CGSize {
		guard
			width.isZero || height.isZero,
			let screen = window.screen
		else {
			return self
		}

		return CGSize(
			width: width.isZero ? screen.visibleFrame.width : width,
			height: height.isZero ? screen.visibleFrame.height : height
		)
	}
}
