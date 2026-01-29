//
//  WindowOverlayRenderer.swift
//  mmhmm
//
//  Created by Beni Federer on 12.06.25.
//

import CoreGraphics

import Common

@MainActor
final class WindowOverlayRenderer {
	static let shared = WindowOverlayRenderer()

	fileprivate(set) var debugIsEnabled: Bool = false {
		didSet {
			overlays.forEach { $0.debugIsEnabled = debugIsEnabled }
			Logger.logMessage("Window overlay debug mode is \(debugIsEnabled ? "enabled" : "disabled")", level: .debug, targets: .local)
		}
	}

	private var displayLink: DisplayLink?
	private var overlays: [OverlayWindow] = []

	// Enforce use of `shared`.
	private init() {}

	/// Draws the participant cursors over the specified target.
	///
	/// Creates and presents an overlay window, if the specified
	/// target does not have an overlay yet.
	///
	/// Removes an overlay window, if its participants count is
	/// zero.
	///
	/// - Parameter info: The window overlay spec to draw.
	func renderCursors(info: mmhmm.WindowOverlayInfo) throws {
		let target: OverlayWindow.Target = try info.overlayWindowTarget

		guard info.participants.isEmpty == false else {
			if let closingOverlayWindow: OverlayWindow = overlays.first(where: { $0.target == target }) {
				// Do everything possible to lose the overlay window, especially from the screen,
				// so it doesn't affect masking of other overlay windows.
				closingOverlayWindow.contentView = nil
				closingOverlayWindow.orderOut(nil)
				// Calling `close()` here crashes, maybe due to CEF's NSWindow delegation.
				// Calling `performClose()` beeps, probably since the window is in a non-closable state.
				// Overall, explicitly closing the window doesn't appear to be required as both
				// Instruments and a `print` statement in `OverlayWindow.deinit()` indicate that
				// it is correctly released after removing it from the `overlays` array below.
			}

			overlays.removeAll { $0.target == target }
			updateDisplayLink()

			if debugIsEnabled {
				Logger.logMessage("Removed overlay window for \(target).", level: .debug, targets: .local)
			}

			return
		}

		let overlayWindow = if let overlayWindow = overlays.first(where: { $0.target == target }) {
			overlayWindow
		} else {
			try makeOverlayWindow(for: target)
		}

		overlayWindow.participants = Array(info.participants)
	}
}

extension WindowOverlayRenderer {
	private func makeOverlayWindow(for target: OverlayWindow.Target) throws -> OverlayWindow {
		let overlayWindow = try OverlayWindow(onTopOf: target)
		overlayWindow.debugIsEnabled = debugIsEnabled
		overlayWindow.orderFront(nil)
		overlays.append(overlayWindow)
		updateDisplayLink()

		if debugIsEnabled {
			Logger.logMessage("Created overlay window for \(target).", level: .debug, targets: .local)
		}

		return overlayWindow
	}

	private func updateDisplayLink() {
		guard overlays.count < 2 else { return }

		if let displayLink, overlays.isEmpty {
			displayLink.stop()
			self.displayLink = nil

			if debugIsEnabled {
				Logger.logMessage("Stopped display link.", level: .debug, targets: .local)
			}
		} else if displayLink == nil, overlays.isEmpty == false {
			displayLink = DisplayLink()
			displayLink?.start {
				Task { @MainActor in
					self.drawCursors()
				}
			}

			if debugIsEnabled {
				Logger.logMessage("Started display link.", level: .debug, targets: .local)
			}
		}
	}

	private func drawCursors() {
		for overlayWindow in overlays {
			do {
				try overlayWindow.draw()
			} catch {
				Logger.logError(error, messagePrefix: "Failed to draw overlay for target \(overlayWindow.target)")
			}
		}
	}
}

public struct WindowOverlayBridge {
	/// Zero sized value types cannot be exposed to C++ yet.
	public let cxxInteropDummy: String = ""

	public static func drawCursors(info: mmhmm.WindowOverlayInfo) {
		Task { @MainActor in
			do {
				try WindowOverlayRenderer.shared.renderCursors(info: info)
			} catch {
				Logger.logError(error, messagePrefix: "Failed drawing cursors")
			}
		}
	}

	public nonisolated(unsafe) static var debugIsEnabled: Bool = false {
		didSet {
			Task { @MainActor in
				WindowOverlayRenderer.shared.debugIsEnabled = debugIsEnabled
			}
		}
	}
}

extension mmhmm.WindowOverlayInfo: @unchecked Sendable {}
