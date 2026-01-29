//
//  CameraWindowManager.swift
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
	final class CameraWindowManager: WindowManager {
		override static var representedWebApp: WebApp.WebAppType { .camera }

		override static var frameAutosaveName: NSWindow.FrameAutosaveName { NSWindow.FrameAutosaveName.cameraWindow }

		override func willConfigureWindow(_ window: NSWindow) {
			window.isCameraWindow = true
			window.contentMinSize = CGSize(width: 320, height: 480)
			window.contentMaxSize = CGSize(width: 480, height: .max)
			window.collectionBehavior.formUnion([.fullScreenNone])
		}

		override func wantsWindow() {}

		fileprivate static let defaultSize = NSSize(width: 320, height: 660)

		override var defaultFrame: NSRect { NSRect(origin: .zero, size: Self.defaultSize) }

		override var defaultTitle: String { "Camera" }
	}
}

extension NSWindow.FrameAutosaveName {
	fileprivate static let cameraWindow: String = "CameraWindow"
}

extension NSWindow {
	public var isCameraWindow: Bool {
		get { frameAutosaveName == NSWindow.FrameAutosaveName.cameraWindow }
		set { setFrameAutosaveName(newValue ? FrameAutosaveName.cameraWindow : "") }
	}
}
