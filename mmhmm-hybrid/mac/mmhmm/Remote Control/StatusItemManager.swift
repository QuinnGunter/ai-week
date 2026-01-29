//
//  StatusItemManager.swift
//  mmhmm
//
//  Created by Beni Federer on 10.09.24.
//

import AppKit

/// Manages the mmhmm menu bar status item.
@MainActor
final class StatusItemManager {
	init(remoteReceiver: RemoteControlled) {
		self.remoteReceiver = remoteReceiver
	}

	private static let iconImageName: String = "Symbols/StatusItemIcon"

	private let remoteReceiver: RemoteControlled
	private var statusItem: NSStatusItem?

	/// Adds the status item to the menu bar.
	func presentStatusItem() {
		let image = NSImage(named: Self.iconImageName)
		statusItem = NSStatusItem.statusItem(with: self, action: #selector(showMenu(_:)), image: image)
	}

	/// Removes the status item from the menu bar.
	func removeStatusItem() {
		statusItem = nil
	}
}

extension StatusItemManager {
	@objc private func showMenu(_ sender: NSButton) {
		let menu = RemoteControlMenu(remoteReceiver: remoteReceiver)
		menu.appearance = NSAppearance.currentDrawing()
		menu.popUp(positioning: nil, at: NSPoint(x: -10, y: sender.bounds.maxY + 6), in: sender)
	}
}

extension NSStatusItem {
	@MainActor
	fileprivate static func statusItem(with target: AnyObject, action: Selector, image: NSImage?) -> NSStatusItem {
		let statusItem = NSStatusBar.system.statusItem(withLength: NSStatusItem.squareLength)
		statusItem.button?.image = image
		statusItem.button?.target = target
		statusItem.button?.action = action
		return statusItem
	}
}
