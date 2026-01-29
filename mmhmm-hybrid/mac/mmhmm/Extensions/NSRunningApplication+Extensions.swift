//
//  NSRunningApplication+Extensions.swift
//  mmhmm
//
//  Created by Matthew Tonkin on 28/11/2023.
//

import AppKit

extension NSRunningApplication {
	/// Returns `true` for the main app bundle and the bundled helper app bundles.
	var hasMmhmmHybridAppBundleIdentifier: Bool {
		bundleIdentifier?.contains("app.mmhmm.hybrid") ?? false
	}
}
