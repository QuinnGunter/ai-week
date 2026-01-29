//
//  Bundle+AppTranslocation.swift
//  mmhmm
//
//  Created by Beni Federer on 31.07.24.
//

import Foundation

import Common

extension Bundle {
	/// The non-translocated bundle URL, if ``bundleURL`` points to a bundle that has been
	/// subject to app translocation aka Gatekeeper path randomization, otherwise ``bundleURL``.
	///
	/// - Important: This code calls private API which can potentially crash at any time.
	///              However, ``CrashLoopPrevention`` limits crashes to one occurrence
	///              per unique private API call, of which there are **two** in this code.
	///              Subsequent calls to this code log any previous crashes.
	///
	/// See https://en.wikipedia.org/wiki/Gatekeeper_(macOS)#Path_randomization
	var nonTranslocatedBundleURL: URL {
		get throws {
			guard bundleURL.isTranslocated else { return bundleURL }

			// First try private API to determine the original bundle URL.

			do {
				return try bundleURL.nonTranslocated
			} catch {
				// There are many valid reasons for an error,
				// so log it for investigation and use the fallback.
				Logger.logError(error, messagePrefix: "Failed to determine original bundle URL")
			}

			// As a fallback, try to determine the original bundle URL heuristically.

			let urls: Set<URL> = try localBundleURLsMatchingIdentifierAndVersion

			// Check for the presence of exactly one bundle, which is _this_ bundle.
			// All other results are either insufficient or ambiguous information which indicate a stop to proceed:
			// * No URLs found
			//   This app bundle is outside of the searched scope, e.g. on another volume like an external or a network drive,
			//   or Spotlight indexing is disabled for this bundle's file system location.
			// * More than one URL found
			//   There are multiple identical app bundles which makes it unclear which of them is _this_ bundle.
			guard urls.count == 1, let url = urls.first else {
				throw AppTranslocation.Error.ambiguousSearchResult(result: urls)
			}

			return url
		}
	}
}

extension Bundle {
	/// All bundle URLs matching the identifier of the receiving bundle
	/// in the user's home folder.
	///
	/// - Attention: A wider search scope should be carefully considered
	/// in regards to potential implications to other users of the found
	/// bundles.
	///
	/// - Throws: A `Bundle.Search.Error` describing the failure.
	private var localBundleURLsMatchingIdentifier: Set<URL> {
		get throws {
			guard let bundleIdentifier = object(forInfoDictionaryKey: kCFBundleIdentifierKey as String) else {
				throw AppTranslocation.Error.failedRetrievingBundleIdentifier
			}
			let query: String = "kMDItemCFBundleIdentifier = \(bundleIdentifier)"
			let urls: [URL] = try MDQuery.Swifty.urlsForItems(inQuery: query, withScope: .home)
			return Set(urls)
		}
	}

	/// All bundle URLs matching the identifier and version keyed by `CFBundleVersionKey`
	/// of the receiving bundle in the user's home folder.
	///
	/// - Throws: A `Bundle.Search.Error` describing the failure.
	private var localBundleURLsMatchingIdentifierAndVersion: Set<URL> {
		get throws {
			guard let searchedVersion = object(forInfoDictionaryKey: kCFBundleVersionKey as String) as? String else {
				throw AppTranslocation.Error.failedRetrievingBundleVersion
			}
			let urls: [URL] = try localBundleURLsMatchingIdentifier
				.compactMap { Bundle(url: $0) }
				.filter { $0.object(forInfoDictionaryKey: kCFBundleVersionKey as String) as? String ?? "" == searchedVersion }
				.map { $0.bundleURL }
			return Set(urls)
		}
	}
}

extension Bundle {
	enum AppTranslocation {}
}

extension Bundle.AppTranslocation {
	enum Error {
		case failedRetrievingBundleIdentifier
		case failedRetrievingBundleVersion
		case ambiguousSearchResult(result: Set<URL>)
	}
}

extension Bundle.AppTranslocation.Error: BaseErrorWithAssociatedValues {
	static let allCases: [Bundle.AppTranslocation.Error] =
		[
			.failedRetrievingBundleIdentifier,
			.failedRetrievingBundleVersion,
			.ambiguousSearchResult(result: []),
		]

	static let domain: String = String(describing: Self.self)

	var errorMessage: String {
		switch self {
		case .failedRetrievingBundleIdentifier:
			String(localized: "Failed retrieving bundle identifier.")
		case .failedRetrievingBundleVersion:
			String(localized: "Failed retrieving bundle version.")
		case let .ambiguousSearchResult(result):
			if result.isEmpty {
				String(localized: "Search result is inconclusive with no results.")
			} else {
				String(localized: "Search result is inconclusive with \(result.count) results: \(String(describing: result))")
			}
		}
	}
}
