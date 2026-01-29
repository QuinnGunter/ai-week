//
//  WebApp.WindowManager.ToolbarDelegate.swift
//  mmhmm
//
//  Created by Beni Federer on 28.02.25.
//

import AppKit
import SwiftUI

import Common

extension WebApp.WindowManager {
	/// A class wrapping `NSToolbarDelegate` conformance for
	/// the `MainAppWindowManagerBase`, thereby isolating the legacy
	/// `NSObject` inheritance.
	@MainActor
	final class ToolbarDelegate: NSObject {
		/// The model representing the app mode.
		private let appState: AppState

		/// The configuration of the toolbox button.
		private let toolboxButtonConfiguration: WebApp.WindowManager.ToolboxButtonView.Configuration

		/// The toolbar items to present in the toolbar.
		private let toolbarItems: [NSToolbarItem.Identifier]

		/// The view to use for the virtual camera status toolbar item.
		var virtualCameraStatusView: NSView?

		init(appState: AppState,
			 toolboxButtonConfiguration: WebApp.WindowManager.ToolboxButtonView.Configuration,
			 representedWebApp: WebApp.WebAppType,
			 virtualCameraStatusView: NSView? = nil) {
			self.appState = appState
			self.toolboxButtonConfiguration = toolboxButtonConfiguration
			toolbarItems = representedWebApp.toolbarItems
			self.virtualCameraStatusView = virtualCameraStatusView
		}

		/// Resets the toolbar items of the given toolbar with `toolbarItems`.
		///
		/// - Parameter toolbar: The toolbar to reset the items of.
		func resetToolbarItems(in toolbar: NSToolbar) {
			toolbar.resetToolbarItems(with: toolbarItems)
		}

		/// The default toolbar items of Camera and Creator windows.
		fileprivate static var malkToolbarItems: [NSToolbarItem.Identifier] {
			if NSApplication.isLiquidGlassAvailable {
				[
					.flexibleSpace,
					.toolboxButton,
					.virtualCameraStatus,
				]
			} else {
				[
					.flexibleSpace,
					.toolboxButton,
					.verticalLineSeparator,
					.virtualCameraStatus,
				]
			}
		}

		/// The default toolbar items of the Stacks window.
		fileprivate static let stacksToolbarItems: [NSToolbarItem.Identifier] = [
			.flexibleSpace,
			.toolboxButton,
		]
	}
}

extension WebApp.WindowManager.ToolbarDelegate: NSToolbarDelegate {
	func toolbar(_ toolbar: NSToolbar, itemForItemIdentifier itemIdentifier: NSToolbarItem.Identifier, willBeInsertedIntoToolbar flag: Bool) -> NSToolbarItem? {
		switch itemIdentifier {
		case .verticalLineSeparator:
			return NSToolbarItem(content: VerticalLineSeparator(), identifier: itemIdentifier)
		case .toolboxButton:
			return NSToolbarItem(content: WebApp.WindowManager.ToolboxButtonView(onButtonTap: {
				Application.cefAppDelegate.browser.toolbox.windowManager.isPresenting = true
				CxxBridge.notifyHybridOfTitlebarToolboxButtonClicked()
			}, configuration: toolboxButtonConfiguration), identifier: itemIdentifier)
		case .virtualCameraStatus:
			return NSToolbarItem(content: CameraExtensionStatusView(viewProvider: {
				self.virtualCameraStatusView ?? NSView()
			}), identifier: itemIdentifier)
		case .debugInfo:
			return NSToolbarItem(content: DebugInfoView(), identifier: itemIdentifier)
		default:
			return NSToolbarItem(itemIdentifier: itemIdentifier)
		}
	}

	func toolbarAllowedItemIdentifiers(_ toolbar: NSToolbar) -> [NSToolbarItem.Identifier] {
		toolbarItems + [.debugInfo]
	}

	func toolbarDefaultItemIdentifiers(_ toolbar: NSToolbar) -> [NSToolbarItem.Identifier] {
		[] // Toolbar only appears when web app has fully loaded.
	}
}

extension WebApp.WebAppType {
	@MainActor
	fileprivate var toolbarItems: [NSToolbarItem.Identifier] {
		switch self {
		case .camera, .creator, .mmhmm:
			WebApp.WindowManager.ToolbarDelegate.malkToolbarItems
		case .stacks, .screenRecorder:
			WebApp.WindowManager.ToolbarDelegate.stacksToolbarItems
		case .broadcast, .external, .hybridAPITester, .localHost, .miniRemote, .offline, .prompt, .segmentationPanel, .toolbox, .settings:
			[]
		}
	}
}

extension NSToolbar {
	/// Removes any existing toolbar items and adds the given `toolbarItems`.
	///
	/// - Parameter toolbarItems: The toolbar items to set.
	fileprivate func resetToolbarItems(with toolbarItems: [NSToolbarItem.Identifier]) {
		removeAllToolbarItems()

		let newToolbarItems = if FeatureFlags.DebugInfo.toolbarItemIsAvailable {
			[.flexibleSpace, .debugInfo] + toolbarItems.dropFirst()
		} else {
			toolbarItems
		}

		newToolbarItems
			.forEach { insertItem(withItemIdentifier: $0, at: items.count) }
	}

	private func removeAllToolbarItems() {
		for index: Int in (0..<items.count).reversed() {
			removeItem(at: index)
		}
	}
}

extension NSToolbarItem.Identifier {
	static let verticalLineSeparator = NSToolbarItem.Identifier("verticalLineSeparator")
	static let toolboxButton = NSToolbarItem.Identifier("toolboxButton")
	static let virtualCameraStatus = NSToolbarItem.Identifier("virtualCameraStatus")
	static let debugInfo = NSToolbarItem.Identifier("debugInfo")
}
