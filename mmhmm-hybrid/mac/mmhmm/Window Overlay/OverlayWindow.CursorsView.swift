//
//  OverlayWindow.CursorsView.swift
//  mmhmm
//
//  Created by Beni Federer on 12.06.25.
//

import AppKit

import Common

extension OverlayWindow {
	final class CursorsView: NSView {
		private var participants: [mmhmm.WindowOverlayParticipant] = []
		private var target: OverlayWindow.Target?
		private var windowMasks: [CGWindowInfo] = []

		fileprivate static let cursorImage: NSImage? = .init(named: "Symbols/StacksCursor")

		override init(frame frameRect: NSRect) {
			super.init(frame: frameRect)
			wantsLayer = true
		}

		required init?(coder: NSCoder) {
			super.init(coder: coder)
			wantsLayer = true
		}
	}
}

extension OverlayWindow.CursorsView {
	func update(participants: [mmhmm.WindowOverlayParticipant], target: OverlayWindow.Target, windowMasks: [CGWindowInfo]) {
		self.participants = participants
		self.target = target
		self.windowMasks = windowMasks
		needsDisplay = true
	}

	override func draw(_ dirtyRect: NSRect) {
		super.draw(dirtyRect)

		do {
			switch target {
			case let .window(id):
				let info = try CGWindowInfo(windowNumber: id)
				try drawOnTop(ofWindow: info)
			case let .display(id):
				let info = CGDisplayInfo(id: id)
				try draw(participants: participants, into: info.bounds)
			case .none:
				break
			}
		} catch {
			Logger.logError(error, messagePrefix: "Failed to draw target \(String(describing: target))")
		}
	}
}

extension OverlayWindow.CursorsView {
	private func drawOnTop(ofWindow windowInfo: CGWindowInfo) throws {
		let windowBounds: CGRect = try windowInfo.bounds

		// Create clipping path of overlapping windows in global coordinate space

		let clipPath = NSBezierPath(rect: windowBounds)

		windowMasks
			.compactMap {
				// Filter any windows which are not high ordered overlays, not onscreen or fully transparent.
				//
				// For example the app switcher has windows level (layer) 499 and screen capture overlays have
				// levels 24, 25, 499 and 1499. However, the app switcher automatically takes away the focus from
				// the Stacks window, so that it stops receiving and forwarding local mouse pointer coordinates.
				// The Dock has level 20 and full screen dimensions and switches `isOnscreen` when un/hiding.
				//
				// Some system windows have levels close to Int.min, which is why negative levels are also filtered.
				if $0.layer ?? 0 < 20, $0.layer ?? 0 >= 0, $0.isOnscreen ?? true, $0.alpha ?? 1.0 > 0, let bounds = try? $0.bounds {
					bounds
				} else {
					nil
				}
			}
			// Remove overlap between window masks to make the clipping path
			// behave correctly with the `evenOdd` winding rule.
			.decomposedOverlappingRects
			.forEach {
				clipPath.appendRect($0)
			}

		// Move clipping path from global coordinate space to window coordinate space

		let transform = AffineTransform(translationByX: -windowBounds.origin.x, byY: -windowBounds.origin.y)
		clipPath.transform(using: transform)

		// Add the clipping path to the view

		clipPath.windingRule = .evenOdd
		clipPath.addClip()

		draw(participants: participants, into: windowBounds)
	}

	private func draw(participants: [mmhmm.WindowOverlayParticipant], into bounds: CGRect) {
		participants
			.map { $0.projection }
			.forEach {
				let debugIsEnabled: Bool = (window as? OverlayWindow)?.debugIsEnabled ?? false
				$0.draw(into: bounds, debugIsEnabled: debugIsEnabled)
			}
	}
}

extension mmhmm.WindowOverlayParticipant {
	/// Swift projection of the cxx struct.
	fileprivate struct Projection {
		let identifier: String
		let name: String
		let color: NSColor
		let opacity: CGFloat
		let coordinate: CGPoint
	}

	fileprivate var projection: Projection {
		Projection(
			identifier: String(identifier),
			name: String(name),
			color: NSColor(hex: String(color.GetSanitizedHexColor())),
			opacity: color.opacity,
			coordinate: CGPoint(
				x: CGFloat(coordinate.x),
				y: CGFloat(coordinate.y)
			)
		)
	}
}

extension mmhmm.WindowOverlayParticipant.Projection {
	// swiftlint:disable function_body_length
	/// Draws itself into a view.
	///
	/// Call from within `NSView.draw(_:)`.
	@MainActor
	fileprivate func draw(into bounds: CGRect, debugIsEnabled: Bool = false) {
		guard opacity > 0.0 else {
			if debugIsEnabled {
				Logger.logMessage("Skipped drawing transparent \(self)", level: .debug, targets: .local)
			}
			return
		}

		// Web code appears to be sending pixel instead of point coordinates.
		// Y coordinate must also be flipped due to CG vs AppKit coordinate space.
		let coordinateX: CGFloat = coordinate.x * 0.5
		let coordinateY: CGFloat = bounds.height - coordinate.y * 0.5

		if debugIsEnabled {
			Logger.logMessage(
				"""
				Drawing \(self)
				- into bounds adjusted for bottom left coordinate space of menu bar screen: \(bounds)
				- with coordinates adjusted for view coordinate space: (\(coordinateX), \(coordinateY)).
				""",
				level: .debug, targets: .local
			)
		}

		// Calculate cursor rectangle

		let cursorRect = CGRect(
			x: Int(coordinateX),
			y: Int(coordinateY) - 32,
			width: 32,
			height: 32
		)

		let cursorOutlineRect = CGRect(
			x: cursorRect.origin.x - 1,
			y: cursorRect.origin.y - 1,
			width: cursorRect.size.width + 2,
			height: cursorRect.size.height + 2
		)

		// Draw cursor

		if let cursorImage = OverlayWindow.CursorsView.cursorImage {
			cursorImage.tinted(with: .white.withAlphaComponent(opacity)).draw(in: cursorOutlineRect)
			cursorImage.tinted(with: color.withAlphaComponent(opacity)).draw(in: cursorRect)
		}

		// Calculate name tag rectangle

		let attributes: [NSAttributedString.Key: Any] = [
			.font: NSFont.systemFont(ofSize: 12),
			.foregroundColor: NSColor(calibratedWhite: 0.7, alpha: opacity),
		]
		let textSize: CGSize = name.size(withAttributes: attributes)

		let offsetNameTextOrigin = CGPoint(x: coordinateX + 36, y: coordinateY - 16)
		let padding: CGFloat = 6
		let rectOrigin = CGPoint(
			x: offsetNameTextOrigin.x - padding,
			y: offsetNameTextOrigin.y - (textSize.height / 2) - padding
		)
		let rectSize = CGSize(
			width: textSize.width + 2 * padding,
			height: textSize.height + 2 * padding
		)
		let backgroundRect = CGRect(origin: rectOrigin, size: rectSize)

		// Draw semi-transparent rounded rectangle

		let cornerRadius: CGFloat = rectSize.height / 4
		let path = NSBezierPath(roundedRect: backgroundRect, xRadius: cornerRadius, yRadius: cornerRadius)
		let backgroundColor = color.withAlphaComponent(0.2 * opacity)
		backgroundColor.setFill()
		path.fill()

		// Draw text on top of rounded rectangle

		let namePoint = CGPoint(
			x: offsetNameTextOrigin.x,
			y: offsetNameTextOrigin.y - (textSize.height / 2)
		)
		name.draw(at: namePoint, withAttributes: attributes)
	}
	// swiftlint:enable function_body_length
}
