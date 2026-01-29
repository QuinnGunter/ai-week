//
//  Configuration.ReleaseTests+SparkleURL.swift
//  mmhmmTests
//
//  Created by Beni Federer on 23.10.24.
//

import RegexBuilder
import Testing

@Suite("Sparkle URL Dependent on User Defaults", .serialized)
class SparkleURLTests {
	private let tempStorage: String?
	static let key: String = UserDefaults.mmhmmKey.updateReleaseConfiguration

	init() {
		// Store the initially active release override
		tempStorage = UserDefaults.standard.string(forKey: Self.key)
		// Remove the override, if any
		UserDefaults.standard.removeObject(forKey: Self.key)
	}

	deinit {
		// Ensure the initially active release override is restored
		UserDefaults.standard.set(tempStorage, forKey: Self.key)
	}

	@Test("Sparkle Update URL", arguments: Configuration.Release.allCases)
	func sparkleUpdateURL(_ release: Configuration.Release) async throws {
		Configuration.Release.updateOverride = release
		guard let sparkleUpdateURL: URL = Configuration.sparkleUpdateURL else {
			Issue.record("Sparkle update URL is nil for release: \(release)")
			return
		}
		let sparkleUpdateURLString: String = sparkleUpdateURL.absoluteString
		#expect(sparkleUpdateURLString.wholeMatch(of: Self.sparkleUpdateURLRegexPattern) != nil)
	}
}

extension SparkleURLTests {
	private static var sparkleUpdateURLRegexPattern: Regex<Substring> {
		Regex {
			"https://api.mmhmm.app/public/updates?releaseTrack="
			ChoiceOf {
				"engineering"
				"test"
				"alpha"
				"beta"
				"production"
			}
			"&appID="
			OneOrMore(.anyNonNewline)
			"&versionNumber="
			OneOrMore(.anyNonNewline)
			"&buildNumber="
			OneOrMore(.digit)
			"&clientUpdateID="
			OneOrMore(.anyNonNewline)
			"&osVersion="
			OneOrMore(.digit)
			One(".")
			OneOrMore(.digit)
			One(".")
			OneOrMore(.digit)
			"&os=mac"
			"&architecture="
			ChoiceOf {
				"arm64"
				"x86_64"
			}
		}
	}
}
