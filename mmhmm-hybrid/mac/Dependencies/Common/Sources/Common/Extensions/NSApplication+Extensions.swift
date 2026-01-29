//
//  NSApplication+Extensions.swift
//  Common
//

import AppKit

extension NSApplication {
	/// Returns true if Liquid Glass is available, i.e. on
	/// macOS 26.0 or later and built with Xcode 16.4 or later.
	public static var isLiquidGlassAvailable: Bool {
		if #available(macOS 26.0, *) {
			NSClassFromString("NSGlassEffectView") != nil
		} else {
			false
		}
	}
}
