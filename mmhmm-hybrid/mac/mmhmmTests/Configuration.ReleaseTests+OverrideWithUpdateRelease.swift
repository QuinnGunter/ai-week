//
//  Configuration.ReleaseTests+OverrideWithUpdateRelease.swift
//  mmhmmTests
//
//  Created by Beni Federer on 10.02.24.
//

import Testing

@Suite("Release Override with Update Override Dependent on User Defaults", .serialized)
class OverrideWithUpdateReleaseTests {
	private let overrideTempStorage: Configuration.Release?
	private let updateOverrideTempStorage: Configuration.Release?

	init() {
		// Store the initially active overrides
		overrideTempStorage = Configuration.Release.override
		updateOverrideTempStorage = Configuration.Release.updateOverride
		// Remove overrides, if any
		Configuration.Release.override = nil
		Configuration.Release.updateOverride = nil
	}

	deinit {
		// Ensure the initially active overrides are restored
		Configuration.Release.override = overrideTempStorage
		Configuration.Release.updateOverride = updateOverrideTempStorage
	}

	@Test("Effective update is distribution release configuration fallback if not overridden")
	func effectiveUpdateIsDistributionReleaseFallback() async throws {
		#expect(Configuration.Release.override == nil)
		#expect(Configuration.Release.updateOverride == nil)
		#expect(Configuration.Release.effectiveUpdate == .production)
	}

	@Test("Update override is overridden by release override", arguments: Configuration.Release.allCases)
	func updateOverrideIsOverridden(byOverride override: Configuration.Release) async throws {
		Configuration.Release.override = override
		Configuration.Release.updateOverride = Set(Configuration.Release.allCases).subtracting([override]).first
		#expect(Configuration.Release.updateOverride != nil)
		#expect(Configuration.Release.effectiveUpdate == override)
	}

	@Test("Effective update is overridden by release override", arguments: Configuration.Release.allCases)
	func effectiveUpdateIsOverridden(byOverride override: Configuration.Release) async throws {
		Configuration.Release.override = override
		#expect(Configuration.Release.updateOverride == nil)
		#expect(Configuration.Release.effectiveUpdate == override)
	}

	@Test("Effective update is overridden by update override if not overridden by release override", arguments: Configuration.Release.allCases)
	func effectiveUpdateIsOverridden(byUpdateOverride override: Configuration.Release) async throws {
		Configuration.Release.updateOverride = override
		#expect(Configuration.Release.override == nil)
		#expect(Configuration.Release.effectiveUpdate == override)
	}
}
