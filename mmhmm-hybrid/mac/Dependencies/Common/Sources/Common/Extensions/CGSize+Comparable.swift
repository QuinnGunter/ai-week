//
//  CGSize+Comparable.swift
//  Common
//
//  Created by Beni Federer on 28.02.25.
//

import CoreGraphics

extension CGSize: @retroactive Comparable {
	public static func < (lhs: Self, rhs: Self) -> Bool {
		lhs.width < rhs.width || lhs.height < rhs.height
	}

	public static func == (lhs: Self, rhs: Self) -> Bool {
		lhs.width == rhs.width && lhs.height == rhs.height
	}
}
