//
//  NSWindow.ButtonType+Extensions.swift
//  mmhmm
//
//  Created by Beni Federer on 09.04.24.
//

import AppKit

extension NSWindow.ButtonType {
	public static let allCases: [NSWindow.ButtonType] = [
		.closeButton,
		.miniaturizeButton,
		.zoomButton,
		.toolbarButton,
		.documentIconButton,
		.documentVersionsButton,
	]
}
