//
//  Bundle+Extensions.swift
//  Common
//
//  Created by Beni Federer on 16.06.25.
//

import Foundation

extension Bundle {
	public func loginItemBundle(withIdentifier identifier: String) throws -> Bundle? {
		try FileManager
			.default
			.contentsOfDirectory(
				at: loginItemsURL,
				includingPropertiesForKeys: nil
			)
			.compactMap { Bundle(url: $0) }
			.first {
				if let bundleIdentifier = $0.infoDictionary?["CFBundleIdentifier"] as? String {
					bundleIdentifier == identifier
				} else {
					false
				}
			}
	}

	public func isOlder(than bundle: Bundle) -> Bool {
		guard let bundleVersion: String = bundle.infoDictionary?["CFBundleVersion"] as? String else {
			return true
		}

		return isOlder(than: bundleVersion)
	}

	public func isOlder(than version: String) -> Bool {
		guard let bundleVersion: String = infoDictionary?["CFBundleVersion"] as? String else {
			return true
		}

		return version.versionCompare(bundleVersion) == .orderedDescending
	}

	public func isNewer(than version: String) -> Bool {
		guard let bundleVersion: String = infoDictionary?["CFBundleVersion"] as? String else {
			return true
		}

		return version.versionCompare(bundleVersion) == .orderedAscending
	}
}

extension Bundle {
	private var contentsURL: URL {
		return bundleURL.appendingPathComponent("Contents")
	}

	private var libraryURL: URL {
		return contentsURL.appendingPathComponent("Library")
	}

	private var loginItemsURL: URL {
		return libraryURL.appendingPathComponent("LoginItems")
	}
}

extension String {
	fileprivate func versionCompare(_ otherVersion: String) -> ComparisonResult {
		return compare(otherVersion, options: .numeric)
	}
}
