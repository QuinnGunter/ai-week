//
//  Configuration+LogSummary.swift
//  mmhmm
//
//  Created by Beni Federer on 10.02.25.
//

import Foundation

extension Configuration {
	static func logSummary() {
		Configuration
			.summary
			.forEach {
				Logger.logMessage($0, level: .info)
			}
	}

	private static var summary: [String] {
		var summary: [String] = [
			"Release: " + Release.bundleDefault.rawValue,
			"Update track: " + Release.effectiveUpdate.rawValue,
			"Service: " + Service.default.rawValue,
		]

		if let releaseOverride = Release.override {
			summary += ["Release override: " + releaseOverride.rawValue]
		}
		if let updateOverride = Release.updateOverride {
			summary += ["Update override: " + updateOverride.rawValue]
		}

		if let serviceOverride = Service.override {
			summary += ["Service override: " + serviceOverride.rawValue]
		}

		return summary
	}
}
