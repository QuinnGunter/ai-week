//
//  Updater+ErrorLogging.swift
//  mmhmm
//
//  Created by Beni Federer on 23.07.24.
//

import Foundation

import Sparkle

extension Error {
	/// Selects `SUError`s that should not be logged as errors.
	///
	/// If an error should not be logged as an error, this function logs an
	/// info message with the passed in error.
	///
	/// - Parameter error: The error to check for its required log status.
	/// - Returns: `true` if `error` should be logged as an error, `false` otherwise.
	var shouldLogAsSparkleError: Bool {
		let nsError = self as NSError
		guard nsError.domain == SUSparkleErrorDomain else { return true }

		switch OSStatus(nsError.code) {
		case SUError.noUpdateError.rawValue:
			// There are a couple of reasons this error can be thrown, see all cases at
			// `[SPUBasicUpdateDriver didNotFindUpdateWithLatestAppcastItem:hostToLatestAppcastItemComparisonResult:background:]`.
			// Most likely, the user is already up to date. Since we only have `localizedDescription == "You're up to date!",
			// it's relatively hard to select only this particular error case in i18n'ed Sparkle runs.
			Logger.logMessage("Did not find update: \(nsError.localizedDescription)", level: .info)
			return false
		case SUError.downloadError.rawValue:
			guard Configuration.Release.effectiveUpdate == .engineering else { return true }
			Logger.logMessage("Ignoring error due to engineering update release configuration: \(nsError.localizedDescription)", level: .info)
			return false
		case SUError.installationCanceledError.rawValue:
			Logger.logMessage("Ignoring user initiated error: \(nsError.localizedDescription)", level: .info)
			return false
		default:
			return true
		}
	}
}
