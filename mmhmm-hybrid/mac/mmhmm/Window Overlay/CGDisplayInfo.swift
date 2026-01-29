//
//  CGDisplayInfo.swift
//  mmhmm
//
//  Created by Beni Federer on 24.06.25.
//

import ColorSync
import CoreGraphics

import Common

struct CGDisplayInfo {
	/// The display's identifier.
	let id: CGDirectDisplayID

	/// The bounds of the display, expressed as a rectangle in the global display
	/// coordinate space (relative to the upper-left corner of the main display).
	private let originalBounds: CGRect

	/// The size of the specified display in millimeters, or 0 if the display is not valid.
	let mmSize: CGSize

	/// A vendor number for the monitor associated with the specified display.
	let vendor: UInt32

	/// A model number for the monitor associated with the specified display.
	let model: UInt32

	/// A serial number for the monitor associated with the specified display.
	let serial: UInt32

	/// A UUID identifying the specified display.
	let uuid: UUID?

	/// The display bounds translated to AppKit's flipped coordinate space.
	var bounds: CGRect {
		get throws {
			if let flippedBounds: CGRect = originalBounds.asAppKitFlippedBounds {
				flippedBounds
			} else {
				throw Error.displayBoundsAreNotAvailable(displayID: id)
			}
		}
	}

	init(id: CGDirectDisplayID) {
		self.id = id
		originalBounds = CGDisplayBounds(id)
		mmSize = CGDisplayScreenSize(id)
		vendor = CGDisplayVendorNumber(id)
		model = CGDisplayModelNumber(id)
		serial = CGDisplaySerialNumber(id)
		uuid = if let cfUUID = CGDisplayCreateUUIDFromDisplayID(id)?.takeUnretainedValue() {
			UUID(uuidString: CFUUIDCreateString(nil, cfUUID) as String)
		} else {
			nil
		}
	}
}

extension CGDisplayInfo {
	enum Error {
		case displayBoundsAreNotAvailable(displayID: CGDirectDisplayID)
	}
}

extension CGDisplayInfo.Error: BaseErrorWithAssociatedValues {
	static let domain: String = String(describing: Self.self)

	static let allCases: [CGDisplayInfo.Error] = [
		.displayBoundsAreNotAvailable(displayID: 0),
	]

	var errorMessage: String {
		switch self {
		case let .displayBoundsAreNotAvailable(displayID): "Display bounds are not available for display (\(displayID))."
		}
	}
}
