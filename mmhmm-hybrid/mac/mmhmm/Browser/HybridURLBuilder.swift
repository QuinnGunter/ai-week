//
//  HybridURLBuilder.swift
//  mmhmm
//
//  Created by Beni Federer on 27.08.25.
//

import Foundation

extension URLComponents {
	enum Hybrid {}
}

extension URLComponents.Hybrid {
	/// The URL scheme used to launch mmhmm hybrid web apps.
	static let scheme: String = "mmhmm-hybrid"

	/// The first path element in URLs targeting the Camera web app.
	static let camera: String = "camera"

	/// The first path element in URLs targeting the Creator web app.
	static let creator: String = "creator"

	/// The first path element in URLs targeting the Screen Recorder web app.
	static let recorder: String = "recorder"

	/// The first path element in URLs targeting the Stacks web app.
	static let stacks: String = "stacks"

	/// The first path element in URLs targeting the last used web app.
	static let lastUsed: String = "lastused"

	/// The first path element in URLs targeting the Toolbox web app.
	static let toolbox: String = "toolbox"

	/// All valid first path elements in URLs targeting a specific web app.
	static let allWebAppTargetComponents: [String] = [
		camera,
		creator,
		recorder,
		stacks,
		lastUsed,
		toolbox,
	]
}

struct HybridURLBuilder {
	/// Builds a URL that launches a specific web app.
	static func buildURL(launching webApp: WebApp.WebAppType) -> URL? {
		switch webApp {
		case .camera: URL(string: "\(URLComponents.Hybrid.scheme):///\(URLComponents.Hybrid.camera)")
		case .creator: URL(string: "\(URLComponents.Hybrid.scheme):///\(URLComponents.Hybrid.creator)")
		case .screenRecorder: URL(string: "\(URLComponents.Hybrid.scheme):///\(URLComponents.Hybrid.recorder)")
		case .stacks: URL(string: "\(URLComponents.Hybrid.scheme):///\(URLComponents.Hybrid.stacks)")
		default: nil
		}
	}

	/// A URL that points to the last used web app.
	static let lastUsedURL: URL = URL(string: "\(URLComponents.Hybrid.scheme):///\(URLComponents.Hybrid.lastUsed)")!

	/// A URL that only contains the hybrid scheme and no other components.
	static let schemeOnlyURL: URL = URL(string: "\(URLComponents.Hybrid.scheme):///")!
}

extension URL {
	var hasHybridAppScheme: Bool {
		scheme == URLComponents.Hybrid.scheme
	}

	var isOOOAppDomain: Bool {
		if let host {
			host.hasPrefix("ooo") && host.hasSuffix("mmhmm.app")
		} else {
			false
		}
	}

	var isAirtimeAppDomain: Bool {
		if let host {
			host.hasPrefix("app") && host.hasSuffix("airtimetools.com")
		} else {
			false
		}
	}
}
