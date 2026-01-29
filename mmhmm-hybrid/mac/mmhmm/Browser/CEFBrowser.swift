//
//  CEFBrowser.swift
//  mmhmm
//
//  Created by Beni Federer on 11.09.24.
//

import AppKit

import Common

enum CEFBrowser {
	/// Information about a freshly created browser.
	struct CreationInfo {
		let url: URL?
		let webAppType: WebApp.WebAppType
		let window: NSWindow
		let browserID: Int
	}

	/// Information about the destination a browser is about to load.
	struct BrowsingInfo {
		let url: URL?
		let webAppType: WebApp.WebAppType
		let browserID: Int
		let isMainFrame: Bool
		let frameIdentifier: String
	}

	/// Information about the content a browser loaded.
	struct LoadInfo {
		let url: URL?
		let webAppType: WebApp.WebAppType
		let httpStatusCode: Int
		let browserID: Int
		let isMainFrame: Bool
		let frameIdentifier: String
	}
}

extension CEFBrowser.LoadInfo: RedactedURLDescriptionProvider {}
extension CEFBrowser.BrowsingInfo: RedactedURLDescriptionProvider {}
extension CEFBrowser.CreationInfo: RedactedURLDescriptionProvider {}

extension CEFBrowser {
	/// Errors that can occur when interacting with a CEF browser.
	enum Error {
		/// The type of web app associated with a browser could not be identified.
		case failedIdentifyingWebAppType(rawURL: String, browserID: Int)
		/// The native browser window could not be found.
		case failedRetrievingWindow(browserID: Int)
		/// The browser failed loading a URL as a web app with the specified error.
		case failedLoading(rawURL: String, webApp: WebApp.WebAppType, error: Swift.Error, browserID: Int, frameIsMain: Bool, frameIdentifier: String)
	}
}

extension CEFBrowser.Error: BaseErrorWithAssociatedValues {
	static let domain: String = String(describing: Self.self)

	var errorMessage: String {
		switch self {
		case let .failedIdentifyingWebAppType(rawURL: rawURL, _):
			"Failed to identify web app type for \(rawURL)."
		case .failedRetrievingWindow:
			"Failed to retrieve window."
		case let .failedLoading(rawURL: rawURL, webApp: webApp, error: error, _, _, _):
			"Failed to load \(webApp) from \(rawURL) with error \(error.localizedDescription)."
		}
	}

	static let allCases: [CEFBrowser.Error] = [
		.failedIdentifyingWebAppType(rawURL: "", browserID: 0),
		.failedRetrievingWindow(browserID: 0),
		.failedLoading(rawURL: "", webApp: .external, error: GenericError.bogus, browserID: 0, frameIsMain: false, frameIdentifier: ""),
	]
}
