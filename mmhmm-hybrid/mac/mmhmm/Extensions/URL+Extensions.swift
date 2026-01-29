//
//  URL+Extensions.swift
//  mmhmm
//
//  Created by Matthew Tonkin on 21/11/2022.
//

import Foundation

import Common

extension URL {
	func appendingQueryParameters(_ queryParameters: [String: String]) -> URL {
		guard var components = URLComponents(url: self, resolvingAgainstBaseURL: false) else {
			return self
		}

		var queryItems: [URLQueryItem] = components.queryItems ?? []
		for queryParameter in queryParameters {
			queryItems.append(URLQueryItem(name: queryParameter.key, value: queryParameter.value))
		}

		components.queryItems = queryItems

		return components.url ?? self
	}
}

extension URL {
	static let helpURL = URL(string: "https://updates.airtimetools.com/mac/hybrid/links/help")!

	/// The application support directory URL.
	///
	/// It keeps using "mmhmm" for CEF cache migration purposes for now.
	static var applicationSupportDirectory: URL? {
		FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask).first?.appendingPathComponent("mmhmm")
	}

	static var userLibraryDirectory: URL? {
		FileManager.default.urls(for: .libraryDirectory, in: .userDomainMask).first
	}

	static var cefCacheDirectory: URL {
		applicationSupportDirectory!.appendingPathComponent("cef-cache")
	}

	static var webAppLogFilePath: URL {
		applicationSupportDirectory!.appendingPathComponent("desktop-applog.txt")
	}

	static var nativeAppLogFilePath: URL {
		applicationSupportDirectory!.appendingPathComponent("desktop-applog-native.txt")
	}

	static let menuBarAppLogFileName: String = "desktop-applog-menu.txt"

	static var menuBarAppLogFilePath: URL {
		if ProcessInfo.isSandboxed {
			return applicationSupportDirectory!.appendingPathComponent(menuBarAppLogFileName)
		} else {
			let librarySubpath: String = "Containers/M3KUT44L48.app.mmhmm.hybrid.menu/Data/Library/Application Support/mmhmm/\(menuBarAppLogFileName)"
			return userLibraryDirectory!.appending(path: librarySubpath, directoryHint: .notDirectory)
		}
	}

	static var applicationsDirectory: URL? {
		FileManager.default.urls(for: .applicationDirectory, in: .localDomainMask).first
	}

	static var userApplicationsDirectory: URL? {
		FileManager.default.urls(for: .applicationDirectory, in: .userDomainMask).first
	}
}

// MARK: - 10.13+ API Compatibility

extension URL {
	@available(macOS, introduced: 10.10, deprecated: 13.0)
	func path() -> String {
		path
	}

	@available(macOS, introduced: 10.10, deprecated: 13.0)
	func appending(component: String) -> URL {
		appendingPathComponent(component)
	}
}
