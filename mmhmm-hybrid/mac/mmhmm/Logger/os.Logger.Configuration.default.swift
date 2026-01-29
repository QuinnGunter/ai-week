//
//  os.Logger.Configuration.default.swift
//  mmhmm
//
//  Created by Beni Federer on 13.05.25.
//

import struct os.Logger

extension os.Logger.Configuration {
	/// Determines whether messages are logged at the `.debug` level.
	///
	/// Defaults to `true` in debug builds and `false` otherwise.
	#if DEBUG
	private static let logsDebugLevel: Bool = true
	#else
	private static let logsDebugLevel: Bool = FeatureFlags.DebugInfo.logsDebugMessages
	#endif

	static let `default` = Self(subsystem: os.Logger.airtimeSubsystem, category: "hybrid", logsDebugMessages: logsDebugLevel)
}
