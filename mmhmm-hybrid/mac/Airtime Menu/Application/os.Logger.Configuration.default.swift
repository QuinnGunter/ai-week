//
//  os.Logger.Configuration.default.swift
//  Airtime Menu
//
//  Created by Beni Federer on 20.05.25.
//

import Foundation
import struct os.Logger

extension os.Logger {
	static let menuBarAppCategory: String = "menu-bar-app"
}

extension os.Logger.Configuration {
	/// Determines whether messages are logged at the `.debug` level.
	///
	/// Defaults to `true` in debug builds and `false` otherwise.
	#if DEBUG
	private static let logsDebugLevel: Bool = true
	#else
	private static let logsDebugLevel: Bool = FeatureFlags.DebugInfo.logsDebugMessages
	#endif

	static let `default` = Self(subsystem: os.Logger.airtimeSubsystem, category: os.Logger.menuBarAppCategory, logsDebugMessages: logsDebugLevel)
}
