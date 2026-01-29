//
//  Configuration.ReleaseTests.swift
//  mmhmmTests
//
//  Created by Beni Federer on 23.10.24.
//

import Testing

@Suite("Release Configuration Dependent on User Defaults", .serialized)
class ReleaseDependingOnUserDefaultsTests {
	private let tempStorage: String?
	static let key: String = UserDefaults.mmhmmKey.releaseConfiguration

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

	@Test("Default release is production")
	func defaultRelease() async throws {
		#expect(Configuration.Release.default == .production)
	}

	@Test("Default release is override", arguments: Configuration.Release.allCases)
	func defaultReleaseOverride(_ override: Configuration.Release) async throws {
		UserDefaults.standard.set(override.stringValue, forKey: Self.key)
		#expect(Configuration.Release.default == override)
	}

	@Test("Default release string value")
	func defaultReleaseStringValue() async throws {
		#expect(Configuration.Release.default.stringValue == "production")
	}

	@Test("Default release string value with override", arguments: Configuration.Release.allCases)
	func defaultReleaseStringValue(withOverride override: Configuration.Release) async throws {
		UserDefaults.standard.set(override.stringValue, forKey: Self.key)
		switch override {
		case .engineering:
			#expect(Configuration.Release.default.stringValue == "engineering")
		case .test:
			#expect(Configuration.Release.default.stringValue == "test")
		case .alpha:
			#expect(Configuration.Release.default.stringValue == "alpha")
		case .beta:
			#expect(Configuration.Release.default.stringValue == "beta")
		case .production:
			#expect(Configuration.Release.default.stringValue == "production")
		}
	}

	@Test("Allow debug tools for default release")
	func allowDebugToolsForDefaultRelease() async throws {
		#expect(Configuration.Release.default.allowsDebugTools == false)
	}

	@Test("Allow debug tools with override", arguments: Configuration.Release.allCases)
	func allowDebugTools(withOverride override: Configuration.Release) async throws {
		UserDefaults.standard.set(override.stringValue, forKey: Self.key)
		switch override {
		case .alpha, .beta, .production:
			#expect(Configuration.Release.default.allowsDebugTools == false)
		case .engineering, .test:
			#expect(Configuration.Release.default.allowsDebugTools == true)
		}
	}
}

@Suite("Release Configuration")
struct ReleaseTests {
	@Test("Release string value", arguments: Configuration.Release.allCases)
	func releaseStringValue(_ release: Configuration.Release) async throws {
		switch release {
		case .engineering:
			#expect(release.stringValue == "engineering")
		case .test:
			#expect(release.stringValue == "test")
		case .alpha:
			#expect(release.stringValue == "alpha")
		case .beta:
			#expect(release.stringValue == "beta")
		case .production:
			#expect(release.stringValue == "production")
		}
	}

	@Test("Allow debug tools", arguments: Configuration.Release.allCases)
	func allowDebugTools(release: Configuration.Release) async throws {
		switch release {
		case .alpha, .beta, .production:
			#expect(release.allowsDebugTools == false)
		case .engineering, .test:
			#expect(release.allowsDebugTools == true)
		}
	}
}

extension Configuration.Release: CaseIterable {
	public static let allCases: [Configuration.Release] = [
		.engineering,
		.test,
		.alpha,
		.beta,
		.production,
	]
}
