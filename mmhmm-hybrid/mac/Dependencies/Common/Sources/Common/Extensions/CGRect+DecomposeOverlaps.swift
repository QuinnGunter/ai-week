//
//  CGRect+DecomposeOverlaps.swift
//  Common
//
//  Created by Beni Federer on 19.06.25.
//

import CoreGraphics

extension Array where Element == CGRect {
	/// Decomposes a set of potentially overlapping rectangles into
	/// a set of non-overlapping rectangles that cover the same area.
	///
	/// This function takes an array of `CGRect` values, which may
	/// overlap, and returns a new array of `CGRect` values. The
	/// returned rectangles are guaranteed to be non-overlapping
	/// and together cover exactly the same area as the union of
	/// the input rectangles.
	///
	/// - Parameter rects: An array of `CGRect` values.
	/// - Returns: An array of non-overlapping `CGRect` values that
	///            together cover the union of the input rectangles.
	public var decomposedOverlappingRects: [CGRect] {
		let nonZeroRects: [CGRect] = filter { $0.area > 0 }
		guard nonZeroRects.isEmpty == false else { return [] }

		let xDividers: [CGFloat] = nonZeroRects.uniqueSortedXDividers

		return nonZeroRects
			.split(at: xDividers)
			.combinedWhereIntersectingVertically(at: xDividers)
	}

	private var uniqueSortedXDividers: [CGFloat] {
		var xValues = Set<CGFloat>()
		for rect in self {
			xValues.insert(rect.minX)
			xValues.insert(rect.maxX)
		}
		return [CGFloat](xValues).sorted()
	}

	/// Split all rects at X coordinates.
	///
	/// - Precondition: All rects must have non-zero area.
	private func split(at xDividers: [CGFloat]) -> [CGRect] {
		for rect in self {
			precondition(rect.area > 0)
		}

		var dividedRects: [CGRect] = self
		for xDivider in xDividers {
			var running: [CGRect] = []
			for rect in dividedRects {
				let dividedInputRects: [CGRect] = rect.splitAtX(xDivider)
				running.append(contentsOf: dividedInputRects)
			}
			dividedRects = running
		}

		return dividedRects
	}

	/// For each set of rects at an X boundary, i.e. between two X boundaries,
	/// combine the intersecting rects.
	private func combinedWhereIntersectingVertically(at xDividers: [CGFloat]) -> [CGRect] {
		var combinedRects: [CGRect] = []

		for xDivider in xDividers {
			let xFilteredRects: [CGRect] = filter { $0.minX == xDivider }
			let sortedRects: [CGRect] = xFilteredRects.sorted { $0.minY < $1.minY }

			guard let first: CGRect = sortedRects.first else { continue }

			if sortedRects.count == 1 {
				combinedRects.append(first)
				continue
			}

			var previous: CGRect = first
			for rect in sortedRects.dropFirst() {
				precondition(rect.width == previous.width)
				if rect.intersects(previous) {
					previous = previous.union(rect)
				} else {
					combinedRects.append(previous)
					previous = rect
				}
			}
			combinedRects.append(previous)
		}

		return combinedRects
	}
}

extension CGRect {
	/// The rectangle area.
	public var area: CGFloat {
		width * height
	}

	/// Split self into two rects at X. Otherwise, return self.
	fileprivate func splitAtX(_ xCoordinate: CGFloat) -> [CGRect] {
		if xCoordinate <= minX || xCoordinate >= maxX {
			return [self]
		}

		let rect1 = CGRect(
			x: minX,
			y: minY,
			width: xCoordinate - minX,
			height: height
		)

		let rect2 = CGRect(
			x: xCoordinate,
			y: minY,
			width: maxX - xCoordinate,
			height: height
		)

		return [rect1, rect2]
	}
}
