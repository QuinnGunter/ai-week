//
//  OverlayWindow.Target.swift
//  mmhmm
//
//  Created by Beni Federer on 25.06.25.
//

import CoreGraphics

import Common

extension OverlayWindow {
	enum Target {
		case window(id: CGWindowID)
		case display(id: CGDirectDisplayID)
	}
}

extension OverlayWindow.Target: Equatable {}

extension OverlayWindow.Target {
	var bounds: CGRect {
		get throws {
			switch self {
			case let .window(id):
				let windowInfo = try CGWindowInfo(windowNumber: id)
				return try windowInfo.bounds
			case let .display(id):
				let displayInfo = CGDisplayInfo(id: id)
				return try displayInfo.bounds
			}
		}
	}
}

extension mmhmm.WindowOverlayInfo {
	var overlayWindowTarget: OverlayWindow.Target {
		get throws {
			switch target {
			case .Window:
				return .window(id: CGWindowID(target_id))
			case .Display:
				return .display(id: CGDirectDisplayID(target_id))
			case .Count:
				throw OverlayWindow.Target.Error.invalidTarget
			@unknown default:
				throw OverlayWindow.Target.Error.unknownTarget
			}
		}
	}
}

extension OverlayWindow.Target {
	enum Error: Int {
		case invalidTarget
		case unknownTarget
	}
}

extension OverlayWindow.Target.Error: BaseError {
	static let domain: String = String(describing: Self.self)

	var errorMessage: String {
		switch self {
		case .invalidTarget: "Invalid target."
		case .unknownTarget: "Unknown target."
		}
	}
}
