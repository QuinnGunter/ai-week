//
//  CGWindowInfo.swift
//  mmhmm
//
//  Created by Beni Federer on 12.06.25.
//

import AppKit

import Common

struct CGWindowInfo {
	let number: CGWindowID?
	let ownerPID: pid_t?
	private let originalBounds: CGRect?
	let storeType: CGWindowBackingType?
	let layer: Int?
	let sharingState: CGWindowSharingType?
	let alpha: CGFloat?
	let memoryUsageInBytes: CLongLong?
	/// Optional in underlying window list info.
	let ownerName: String?
	/// Optional in underlying window list info.
	let name: String?
	/// Optional in underlying window list info.
	let isOnscreen: Bool?
	/// Optional in underlying window list info.
	let backingStoreIsVideoMemory: Bool?

	/// The window bounds translated to the AppKit coordinate space.
	///
	/// The window's original bounds are flipped, i.e. with the origin
	/// in the top left of the screen containing the menu bar. To draw
	/// in the AppKit context, e.g. in `NSView`, window coordinates must
	/// be recalculated in the AppKit coordinate space, where the origin
	/// is in the bottom left of the screen containing the menu bar.
	var bounds: CGRect {
		get throws {
			if let flippedBounds: CGRect = originalBounds?.asAppKitFlippedBounds {
				flippedBounds
			} else {
				throw Error.windowBoundsAreNotAvailable(ownerPID: ownerPID ?? -1)
			}
		}
	}

	init() {
		number = nil
		ownerPID = nil
		originalBounds = nil
		storeType = nil
		layer = nil
		sharingState = nil
		alpha = nil
		memoryUsageInBytes = nil
		ownerName = nil
		name = nil
		isOnscreen = nil
		backingStoreIsVideoMemory = nil
	}

	init(windowInfo: [CFString: Any]) {
		number = windowInfo[kCGWindowNumber] as? CGWindowID
		ownerPID = windowInfo[kCGWindowOwnerPID] as? pid_t
		originalBounds = if let boundsDictionary = windowInfo[kCGWindowBounds],
							CFGetTypeID(boundsDictionary as CFTypeRef) == CFDictionaryGetTypeID(),
							let bounds = CGRect(dictionaryRepresentation: unsafeBitCast(boundsDictionary as CFTypeRef, to: CFDictionary.self)) {
			bounds
		} else {
			nil
		}
		storeType = if let rawValue = windowInfo[kCGWindowStoreType] as? UInt32 {
			CGWindowBackingType(rawValue: rawValue)
		} else {
			nil
		}
		layer = windowInfo[kCGWindowLayer] as? Int ?? -1
		sharingState = if let rawValue = windowInfo[kCGWindowSharingState] as? UInt32 {
			CGWindowSharingType(rawValue: rawValue)
		} else {
			nil
		}
		alpha = windowInfo[kCGWindowAlpha] as? CGFloat
		memoryUsageInBytes = windowInfo[kCGWindowMemoryUsage] as? CLongLong
		ownerName = windowInfo[kCGWindowOwnerName] as? String
		name = windowInfo[kCGWindowName] as? String
		isOnscreen = windowInfo[kCGWindowIsOnscreen] as? Bool
		backingStoreIsVideoMemory = windowInfo[kCGWindowBackingLocationVideoMemory] as? Bool
	}

	init(windowNumber: CGWindowID) throws {
		guard
			let windowInfoList = CGWindowListCopyWindowInfo([.optionOnScreenAboveWindow, .optionIncludingWindow], windowNumber) as? [[String: Any]],
			let windowInfo: [String: Any] = windowInfoList.last
		else {
			throw Error.windowInfoIsNotAvailable(windowID: windowNumber)
		}

		self.init(windowInfo: windowInfo as [CFString: Any])
	}
}

extension CGWindowInfo {
	static func infoForWindows(aboveWindow windowNumber: CGWindowID) -> [CGWindowInfo] {
		info(option: [.optionOnScreenAboveWindow], relativeToWindow: windowNumber)
	}

	static func info(option: CGWindowListOption, relativeToWindow windowNumber: CGWindowID) -> [CGWindowInfo] {
		(CGWindowListCopyWindowInfo(option, windowNumber) as? [[CFString: Any]] ?? [[CFString: Any]]())
			.map { CGWindowInfo(windowInfo: $0) }
	}
}

extension CGWindowInfo {
	enum Error {
		case windowBoundsAreNotAvailable(ownerPID: pid_t)
		case windowInfoIsNotAvailable(windowID: CGWindowID)
	}
}

extension CGWindowInfo.Error: BaseErrorWithAssociatedValues {
	static let domain: String = String(describing: Self.self)

	static let allCases: [CGWindowInfo.Error] = [
		.windowBoundsAreNotAvailable(ownerPID: -1),
		.windowInfoIsNotAvailable(windowID: kCGNullWindowID),
	]

	var errorMessage: String {
		switch self {
		case let .windowBoundsAreNotAvailable(pid): "Window bounds are not available for \(pid.logDescription) (\(pid))."
		case let .windowInfoIsNotAvailable(windowID): "Window info is not available for window ID: \(windowID)."
		}
	}
}

extension pid_t {
	fileprivate var logDescription: String {
		(try? processName) ?? "unknown process"
	}
}
