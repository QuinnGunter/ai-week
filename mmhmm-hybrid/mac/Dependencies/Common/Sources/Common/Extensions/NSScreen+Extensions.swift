//
//  NSScreen+Extensions.swift
//  Common
//
//  Created by Matthew Tonkin on 19/11/21.
//

import AppKit

extension NSScreen {
	public var displayID: CGDirectDisplayID? {
		return deviceDescription[NSDeviceDescriptionKey(rawValue: "NSScreenNumber")] as? CGDirectDisplayID
	}

	public class func screen(withDisplayID displayID: CGDirectDisplayID) -> NSScreen? {
		return NSScreen.screens.first(where: { (screen: NSScreen) -> Bool in
			screen.displayID == displayID
		})
	}

	public class func localizedName(forScreenWithDisplayID displayID: CGDirectDisplayID) -> String? {
		return screen(withDisplayID: displayID)?.localizedName
	}

	/// The screen containing the menu bar.
	///
	/// - Important: This is not always equal to the main screen.
	///              "The main screen refers to the screen containing
	///              the window that is currently receiving keyboard
	///              events. It is the main screen because it is the
	///              one with which the user is most likely interacting."
	public static var screenContainingMenuBar: NSScreen? {
		// "The screen containing the menu bar is always the first object
		// (index 0) in the array returned by the screens method."
		screens.first
	}
}
