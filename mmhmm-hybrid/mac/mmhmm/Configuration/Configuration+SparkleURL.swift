//
//  Configuration+SparkleURL.swift
//  mmhmm
//
//  Created by Beni Federer on 22.10.24.
//

import Foundation

import Common

extension Configuration {
	private static let updatesBaseURL = Service.default.apiBaseURL.appending(components: "public", "updates")

	static var sparkleUpdateURL: URL? {
		#if SPARKLE_DEBUG && !TEST
		sparkleLocalDebugURL
		#elseif DEBUG && !TEST
		sparkleDebugURL
		#else
		guard var components = URLComponents(url: updatesBaseURL, resolvingAgainstBaseURL: true) else { return nil }
		components.queryItems = sparkleQueryItems
		return components.url
		#endif
	}

	private static var sparkleQueryItems: [URLQueryItem] {
		let shortVersion: String = Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "0.0.0"
		let bundleVersion: String = Bundle.main.infoDictionary?["CFBundleVersion"] as? String ?? "0"
		let appItems: [URLQueryItem] = [
			URLQueryItem(name: "releaseTrack", value: Release.effectiveUpdate.rawValue),
			URLQueryItem(name: "appID", value: Bundle.main.bundleIdentifier),
			URLQueryItem(name: "versionNumber", value: shortVersion),
			URLQueryItem(name: "buildNumber", value: bundleVersion),
			URLQueryItem(name: "clientUpdateID", value: clientUpdateID),
		]

		let publicKeyItems: [URLQueryItem] = if let publicKey: String = Bundle.main.infoDictionary?["SUPublicEDKey"] as? String {
			[
				URLQueryItem(name: "signature", value: "eddsa"),
				URLQueryItem(name: "publicKey", value: publicKey),
			]
		} else {
			[]
		}

		let osVersion: OperatingSystemVersion = ProcessInfo.processInfo.operatingSystemVersion
		let osVersionString: String = "\(osVersion.majorVersion).\(osVersion.minorVersion).\(osVersion.patchVersion)"
		let osVersionItems: [URLQueryItem] = [
			URLQueryItem(name: "osVersion", value: osVersionString),
			URLQueryItem(name: "os", value: "mac"),
			URLQueryItem(name: "architecture", value: ProcessInfo.processInfo.architecture),
		]

		return appItems + publicKeyItems + osVersionItems
	}

	private static var clientUpdateID: String {
		if let existingClientUpdateID: String = UserDefaults.standard.string(forKey: UserDefaults.mmhmmKey.userDefaultsClientUpdateID) {
			return existingClientUpdateID
		} else {
			let newClientUpdateID: String = UUID().uuidString
			UserDefaults.standard.set(newClientUpdateID, forKey: UserDefaults.mmhmmKey.userDefaultsClientUpdateID)
			return newClientUpdateID
		}
	}
}

extension UserDefaults.mmhmmKey {
	fileprivate static let userDefaultsClientUpdateID: String = "ClientUpdateID"
}

extension Configuration {
	/// A URL to help debugging Sparkle feeds locally.
	///
	/// ### HTTP
	///
	/// Start a local web server in Terminal by running
	/// `% python3 -m http.server --directory /path/to/directory/containing/sparkle-test.xml`
	///
	/// Ensure the `Info.plist` contains the following HTTP transport security exemptions.
	///
	/// ```
	/// <key>NSAppTransportSecurity</key>
	/// <dict>
	/// <key>NSAllowsArbitraryLoads</key>
	/// <true/>
	/// </dict>
	/// ```
	///
	/// When using insecure HTTP, Sparkle enforces use of its cryptographic signing by
	/// requiring EdDSA signatures in the appcast XML file and the public key being published
	/// as `SUPublicEDKey` in the `Info.plist`.
	///
	/// ### HTTPS
	///
	/// The above `Info.plist` requirements do not apply when running a TLS-secured web server.
	///
	/// Run the **mmhmm (Sparkle debug)** scheme to auto-start a HTTPS server hosting the
	/// contents of the repo's `mac/Sparkle Server` subdirectory.
	static var sparkleLocalDebugURL: URL? {
		URL(string: "https://localhost:4443/sparkle-test.xml")
	}

	/// A URL pointing directly to a Sparkle XML feed's file host, i.e. the feed address behind
	/// the redirection of the mmhmm service API.
	static var sparkleDebugURL: URL? {
		switch Release.effectiveUpdate {
		case .engineering: URL(string: "https://mmhmm.blob.core.windows.net/sparkle/engineering/sparkle-appcast.xml")
		case .test: URL(string: "https://mmhmm.blob.core.windows.net/sparkle/test/sparkle-appcast.xml")
		case .alpha: URL(string: "https://mmhmm.blob.core.windows.net/sparkle/alpha/sparkle-appcast.xml")
		// Actual beta feed might be a copy hosted at AWS S3: https://updates.mmhmm.app/mac/hybrid/beta/sparkle.xml
		case .beta: URL(string: "https://mmhmm.blob.core.windows.net/sparkle/beta/sparkle-appcast.xml")
		// Actual production feed is a copy hosted at AWS S3: https://updates.mmhmm.app/mac/hybrid/production/sparkle.xml
		case .production: URL(string: "https://mmhmm.blob.core.windows.net/sparkle/production/sparkle-appcast.xml")
		}
	}
}
