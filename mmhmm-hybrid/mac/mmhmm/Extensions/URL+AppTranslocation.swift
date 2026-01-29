//
//  URL+AppTranslocation.swift
//  mmhmm
//
//  Created by Beni Federer on 31.07.24.
//

import Foundation

extension URL {
	/// Determines if a URL points to a file system location that has
	/// been subject to app translocation aka Gatekeeper path randomization.
	///
	/// - Important: This code calls private API which can potentially crash at any time.
	///              However, ``CrashLoopPrevention`` limits crashes to one occurrence
	///              per unique private API call, of which there is **one** in this code.
	///              Subsequent calls to this code log any previous crashes.
	///
	/// See https://en.wikipedia.org/wiki/Gatekeeper_(macOS)#Path_randomization
	var isTranslocated: Bool {
		do {
			// Determine app translocation by calling private API, which provides accurate
			// results, but is unsafe due its private, undocumented nature.
			return try DynamicLoading.AppTranslocation.isTranslocatedURL(self)
		} catch {
			// There are many valid reasons for an error,
			// so log it for investigation and use the fallback.
			Logger.logError(error, messagePrefix: "Failed to determine if URL is translocated")
		}

		// Use heuristics as a fallback, which is based on observing the results
		// of the current, private implementation at the time of coding.
		return pathComponents.contains("AppTranslocation")
	}

	/// The non-translocated URL, if the receiver points to an app translocated
	/// file system location, or the receiver.
	var nonTranslocated: URL {
		get throws {
			return try DynamicLoading.AppTranslocation.nonTranslocatedURL(ofURL: self)
		}
	}
}
