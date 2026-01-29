//
//  StacksWindowManager.swift
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
	final class StacksWindowManager: WindowManager {
		override static var representedWebApp: WebApp.WebAppType { .stacks }

		override static var frameAutosaveName: NSWindow.FrameAutosaveName { NSWindow.FrameAutosaveName.stacksWindow }

		override func willConfigureWindow(_ window: NSWindow) {
			window.isStacksWindow = true
		}

		override func wantsWindow() {}

		fileprivate static let defaultSize = NSSize(width: 480, height: 450)

		override var defaultFrame: NSRect { NSRect(origin: .zero, size: Self.defaultSize) }

		override var defaultTitle: String { "Stacks" }
	}
}

extension NSWindow.FrameAutosaveName {
	fileprivate static let stacksWindow: String = "StacksWindow"
}

extension NSWindow {
	public var isStacksWindow: Bool {
		get { frameAutosaveName == NSWindow.FrameAutosaveName.stacksWindow }
		set { setFrameAutosaveName(newValue ? FrameAutosaveName.stacksWindow : "") }
	}
}
