//
//  Constants.swift
//  CameraExtensionHost
//
//  Created by Beni Federer on 29.10.24.
//

import Foundation

public enum Constants {
	public static let systemPreferencesApprovalURL: URL = {
		if #available(macOS 15.0, *) {
			return URL(string: "x-apple.systempreferences:com.apple.LoginItems-Settings.extension?ExtensionItems")!
		} else {
			return URL(string: "x-apple.systempreferences:com.apple.preference.security?General")!
		}
	}()
}
