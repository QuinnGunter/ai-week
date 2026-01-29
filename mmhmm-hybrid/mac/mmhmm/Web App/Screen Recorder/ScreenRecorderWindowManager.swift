//
//  ScreenRecorderWindowManager.swift
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
	final class ScreenRecorderWindowManager: WindowManager {
		override static var representedWebApp: WebApp.WebAppType { .screenRecorder }

		override static var frameAutosaveName: NSWindow.FrameAutosaveName { NSWindow.FrameAutosaveName.screenRecorderWindow }

		override func willConfigureWindow(_ window: NSWindow) {
			window.isScreenRecorderWindow = true
		}

		override func wantsWindow() {}

		fileprivate static let defaultSize = NSSize(width: 480, height: 450)

		override var defaultFrame: NSRect { NSRect(origin: .zero, size: Self.defaultSize) }

		override var defaultTitle: String { "Screen Recorder" }
	}
}

extension NSWindow.FrameAutosaveName {
	fileprivate static let screenRecorderWindow: String = "ScreenRecorderWindow"
}

extension NSWindow {
	public var isScreenRecorderWindow: Bool {
		get { frameAutosaveName == NSWindow.FrameAutosaveName.screenRecorderWindow }
		set { setFrameAutosaveName(newValue ? FrameAutosaveName.screenRecorderWindow : "") }
	}
}
