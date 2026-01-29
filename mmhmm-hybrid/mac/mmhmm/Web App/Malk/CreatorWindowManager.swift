//
//  CreatorWindowManager.swift
//  mmhmm
//
//  Created by Beni Federer on 10.09.24.
//

import AppKit
import Combine
import CoreGraphics

import Common

extension WebApp {
	@MainActor
	final class CreatorWindowManager: WindowManager {
		override static var representedWebApp: WebApp.WebAppType { .creator }

		override static var frameAutosaveName: NSWindow.FrameAutosaveName { NSWindow.FrameAutosaveName.creatorWindow }

		override func willConfigureWindow(_ window: NSWindow) {
			window.isCreatorWindow = true
			window.contentMinSize = CGSize(width: 600, height: 460)
			window.contentMaxSize = CGSize(width: .max, height: .max)
			window.collectionBehavior.formUnion([.fullScreenPrimary, .fullScreenAllowsTiling])
		}

		override func wantsWindow() {}

		fileprivate static let defaultSize = NSSize(width: 1036, height: 680)

		override var defaultFrame: NSRect { NSRect(origin: .zero, size: Self.defaultSize) }

		override var defaultTitle: String { "Creator" }
	}
}

extension NSWindow.FrameAutosaveName {
	fileprivate static let creatorWindow: String = "CreatorWindow"
}

extension NSWindow {
	public var isCreatorWindow: Bool {
		get { frameAutosaveName == NSWindow.FrameAutosaveName.creatorWindow }
		set { setFrameAutosaveName(newValue ? FrameAutosaveName.creatorWindow : "") }
	}
}
