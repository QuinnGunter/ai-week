//
//  StreamClient+ApplicationTitle.swift
//  CameraExtension
//
//  Created by Beni Federer on 26.05.25.
//

import Foundation

public enum StreamClient {
	/// Resolves well known process names to their better known application product names.
	///
	/// - Parameter processName: The process name to resolve.
	/// - Returns: An application name, if resolvable, or `processName` otherwise.
	public static func applicationTitle(forProcessName processName: String) -> String {
		let helperPluginString: String = " Helper (Plugin)"
		if let rangeOfHelperPlugin: Range = processName.range(of: helperPluginString), !rangeOfHelperPlugin.isEmpty {
			return processName.replacingOccurrences(of: helperPluginString, with: "")
		}

		switch processName.lowercased() {
		case "BlueJeans".lowercased():
			return "BlueJeans"
		case "GoToMeeting".lowercased():
			return "GoToMeeting"
		case "Safari Graphics and Media".lowercased():
			return "Safari"
		case "QuickTime Player".lowercased():
			return "QuickTime"
		case "caphost", "zoom.us":
			return "Zoom"
		case "avconferenced":
			return "FaceTime"
		default:
			return processName
		}
	}
}
