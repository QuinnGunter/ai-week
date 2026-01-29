//
//  Configuration.ReleaseTests+UpdateRelease.swift
//  mmhmmTests
//
//  Created by Beni Federer on 23.10.24.
//

import Testing

@Suite("Update Release Configuration Dependent on User Defaults", .serialized)
class UpdateReleaseTests {
	private let tempStorage: String?
	static let key: String = UserDefaults.mmhmmKey.updateReleaseConfiguration
	static let secondaryKey: String = UserDefaults.mmhmmKey.releaseConfiguration

	init() {
		// Store the initially active release override
		tempStorage = UserDefaults.standard.string(forKey: Self.key)
		// Remove the override, if any
		UserDefaults.standard.removeObject(forKey: Self.key)
		UserDefaults.standard.removeObject(forKey: Self.secondaryKey)
	}

	deinit {
		// Ensure the initially active release override is restored
		UserDefaults.standard.set(tempStorage, forKey: Self.key)
		UserDefaults.standard.set(tempStorage, forKey: Self.secondaryKey)
	}

	@Test("Default effective update release is production")
	func effectiveUpdateRelease() async throws {
		#expect(Configuration.Release.effectiveUpdate == .production)
	}

	@Test("Effective update release with override", arguments: Configuration.Release.allCases)
	func effectiveUpdateRelease(withOverride override: Configuration.Release) async throws {
		Configuration.Release.updateOverride = override
		#expect(Configuration.Release.effectiveUpdate == override)
	}

	@Test("Remove effective update release override when not current", arguments: Configuration.Release.allCases.dropLast())
	func removeEffectiveUpdateReleaseWhenNotCurrent(_ notCurrentRelease: Configuration.Release) async throws {
		Configuration.Release.updateOverride = notCurrentRelease
		Configuration.Release.removeUpdateOverrideIfCurrent()
		#expect(Configuration.Release.effectiveUpdate == notCurrentRelease)
		#expect(UserDefaults.standard.string(forKey: Self.key) == notCurrentRelease.stringValue)
	}

	@Test("Remove effective update release override when current")
	func removeEffectiveUpdateReleaseWhenCurrent() async throws {
		Configuration.Release.updateOverride = .production
		Configuration.Release.removeUpdateOverrideIfCurrent()
		#expect(Configuration.Release.effectiveUpdate == .production)
		#expect(UserDefaults.standard.string(forKey: Self.key) == nil)
	}
}
