//
//  OverlayWindow.swift
//  mmhmm
//
//  Created by Beni Federer on 12.06.25.
//

import AppKit

import Common

final class OverlayWindow: NSWindow {
	let target: Target
	var participants: [mmhmm.WindowOverlayParticipant] = []

	var debugIsEnabled: Bool = false {
		didSet {
			backgroundColor = debugModeAwareBackgroundColor
			level = .init(9999)
		}
	}

	private var debugModeAwareBackgroundColor: NSColor? {
		if debugIsEnabled {
			NSColor(red: 1, green: 0, blue: 0, alpha: 0.2)
		} else {
			.clear
		}
	}

	init(onTopOf target: Target) throws {
		self.target = target

		try super.init(
			contentRect: target.bounds,
			styleMask: [.borderless, .fullSizeContentView],
			backing: .buffered,
			defer: false
		)

		isOpaque = false
		backgroundColor = .clear
		hidesOnDeactivate = false
		ignoresMouseEvents = true
		hasShadow = false
		collectionBehavior = [.canJoinAllSpaces, .fullScreenAuxiliary]

		switch target {
		case .window:
			// Participant cursors in a window overlay must not interfere
			// with UI elements, which are presented above window content,
			// e.g. popup menus or modals.
			level = .floating
		case .display:
			// Participant cursors in a fullscreen overlay must stay on
			// top of all other views.
			level = .screenSaver

			// Don't include the participant cursors in the shared screen
			// capture, since the cursors are already applied in web code,
			// which would lead to echo artifacts if duplicated natively.
			sharingType = .none
		}

		guard let contentView else {
			throw Error.windowHasNoContentView
		}

		let cursorsView = CursorsView(frame: contentView.bounds)
		cursorsView.autoresizingMask = [.width, .height]
		self.contentView = cursorsView
	}

	func draw() throws {
		switch target {
		case .window:
			try drawInWindowTarget(target)
		case .display:
			try cursorsView.update(participants: participants, target: target, windowMasks: [])
		}
	}
}

extension OverlayWindow {
	private var cursorsView: CursorsView {
		get throws {
			if let cursorsView = contentView as? CursorsView {
				cursorsView
			} else {
				throw Error.contentViewDoesNotHaveCursorsViewType
			}
		}
	}

	private func drawInWindowTarget(_ target: Target) throws {
		guard case let .window(windowID) = target else {
			throw Error.invalidTarget
		}

		let windowInfo = try CGWindowInfo(windowNumber: windowID)
		let windowMasks: [CGWindowInfo] = if debugIsEnabled {
			// Debug mode applies no masks, so cursors are always visible
			[]
		} else {
			CGWindowInfo.infoForWindows(aboveWindow: windowID)
		}

		// Remove this overlay window from the windows masking the overlaid window
		// since it must not affect masking cursors.
		let windowMasksWithoutOverlayWindow: [CGWindowInfo] = windowMasks.reduce(into: []) { result, mask in
			guard mask.number != CGWindowID(windowNumber) else { return }
			result.append(mask)
		}

		let bounds = try windowInfo.bounds
		if bounds != frame {
			setFrame(bounds, display: true)
		}

		try cursorsView.update(participants: participants, target: target, windowMasks: windowMasksWithoutOverlayWindow)
	}
}

extension OverlayWindow {
	enum Error: Int {
		case basicWindowInfoIsNotAvailable
		case contentViewDoesNotHaveCursorsViewType
		case invalidTarget
		case windowHasNoContentView
	}
}

extension OverlayWindow.Error: BaseError {
	static let domain: String = String(describing: Self.self)

	var errorMessage: String {
		switch self {
		case .basicWindowInfoIsNotAvailable: "Basic window info is not available."
		case .contentViewDoesNotHaveCursorsViewType: "Content view does not have expected type."
		case .invalidTarget: "Invalid target."
		case .windowHasNoContentView: "Window has no content view."
		}
	}
}
