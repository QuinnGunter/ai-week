//
//  CGRect+Extensions.swift
//  mmhmm
//
//  Created by Beni Federer on 10.04.24.
//

import AVFoundation

extension CGRect {
	func maintainingAspectRatio(_ aspectRatio: CGSize) -> CGRect {
		AVMakeRect(aspectRatio: aspectRatio, insideRect: self)
	}

	/// A Boolean value indicating whether this instance is normal.
	///
	/// A *normal* value is a finite number that uses the full precision
	/// available to values of a type. Zero is neither a normal nor a subnormal
	/// number.
	///
	/// An `origin` containing any `0.0` coordinate is deemed a normal rectangle.
	var isNormal: Bool {
		// swiftformat:disable:indent
		size.width.isNormal &&
		size.height.isNormal &&
		origin.x.isNormal || origin.x.isZero &&
		origin.y.isNormal || origin.x.isZero
		// swiftformat:enable:indent
	}
}
