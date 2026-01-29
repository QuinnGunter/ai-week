//
//  NSToolbarItem+SwiftUI.swift
//  Common
//
//  Created by Beni Federer on 26.03.25.
//

import AppKit
import SwiftUI

@MainActor
extension NSToolbarItem {
	/// Creates a toolbar item from a SwiftUI view.
	///
	/// - Parameters:
	///   - content: The SwiftUI view to present in toolbar item.
	///   - identifier: The identifier to reference the toolbar item by.
	/// - Returns: The toolbar item.
	public convenience init<Content: View>(content: Content, identifier: NSToolbarItem.Identifier) {
		self.init(itemIdentifier: identifier)
		let hostingView = NSHostingView(rootView: content)
		hostingView.frame.size = hostingView.fittingSize
		view = hostingView
	}
}
