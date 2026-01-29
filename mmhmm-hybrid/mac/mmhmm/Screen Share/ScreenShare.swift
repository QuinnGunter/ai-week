//
//  ScreenShare.swift
//  mmhmm
//
//  Created by Matthew Tonkin on 27/9/2022.
//  Copyright © 2022 mmhmm, inc. All rights reserved.
//

import AVKit
import ScreenCaptureKit

import Common

struct ScreenShare {
	enum Source: Equatable {
		case display(SCDisplay)
		case window(SCWindow)
		case device(AVCaptureDevice)
	}
}

extension ScreenShare.Source {
	var title: String? {
		switch self {
		case let .display(display):
			let displayID: CGDirectDisplayID = display.displayID
			return NSScreen.localizedName(forScreenWithDisplayID: displayID)
		case let .window(window):
			return window.displayTitle
		case let .device(device):
			return device.localizedName
		}
	}
}

extension SCWindow {
	var displayTitle: String? {
		if let applicationName: String = owningApplication?.applicationName {
			if let windowTitle: String = title, windowTitle != applicationName {
				return "\(applicationName) - \(windowTitle)"
			} else {
				return applicationName
			}
		} else {
			return title
		}
	}
}

protocol StreamProvider {
	var streamFrame: CGRect { get }
	var streamFilter: SCContentFilter { get }
}

extension SCDisplay: StreamProvider {
	var streamFrame: CGRect {
		return frame
	}

	var streamFilter: SCContentFilter {
		return SCContentFilter(display: self, excludingWindows: [])
	}
}

extension SCWindow: StreamProvider {
	var streamFrame: CGRect {
		return frame
	}

	var streamFilter: SCContentFilter {
		return SCContentFilter(desktopIndependentWindow: self)
	}
}

extension StreamProvider {
	func stream(withSize size: CGSize, delgate: SCStreamDelegate) -> SCStream {
		let configuration = SCStreamConfiguration()
		let thumbnailSize: CGSize = streamFrame.size.scaled(toSize: size)
		configuration.width = Int((thumbnailSize.width * 2).rounded(.down))
		configuration.height = Int((thumbnailSize.height * 2).rounded(.down))
		configuration.scalesToFit = true
		configuration.minimumFrameInterval = CMTime(value: 1, timescale: CMTimeScale(5)) // 5fps
		configuration.showsCursor = false
		return SCStream(filter: streamFilter,
						configuration: configuration,
						delegate: delgate)
	}
}
