//
//  ConfigurationTests+URLOverrideWithUpdateRelease.swift
//  mmhmmTests
//
//  Created by Beni Federer on 10.02.24.
//

import Testing

@Suite("URL Override Dependent on User Defaults", .serialized)
class URLOverrideTests {
	private let overrideTempStorage: [String: URL]?
	private let testOverrides = [
		"URLOverride": URL(string: "https://test.override.url")!,
		"URLOverrideCamera": URL(string: "https://test.override.camera")!,
		"URLOverrideCreator": URL(string: "https://test.override.creator")!,
		"URLOverrideScreenRecorder": URL(string: "https://test.override.screenrecorder")!,
		"URLOverrideStacks": URL(string: "https://test.override.stacks")!,
		"URLOverrideToolbox": URL(string: "https://test.override.toolbox")!,
	]

	init() {
		// Store the initially active overrides
		overrideTempStorage = Configuration.urlOverrides
	}

	deinit {
		// Ensure the initially active overrides are restored
		Configuration.urlOverrides = overrideTempStorage
	}

	@Test("URL overrides are nil by default")
	func urlOverridesAreNilByDefault() async throws {
		#expect(Configuration.urlOverride == nil)
		#expect(Configuration.urlOverrideCamera == nil)
		#expect(Configuration.urlOverrideCreator == nil)
		#expect(Configuration.urlOverrideScreenRecorder == nil)
		#expect(Configuration.urlOverrideStacks == nil)
		#expect(Configuration.urlOverrideToolbox == nil)
	}

	@Test("URL override read-write-cycle", arguments: Configuration.Release.allCases)
	func updateOverrideIsOverridden(byOverride override: Configuration.Release) async throws {
		Configuration.urlOverrides = testOverrides

		#expect(Configuration.urlOverride == testOverrides["URLOverride"])
		#expect(Configuration.urlOverrideCamera == testOverrides["URLOverrideCamera"])
		#expect(Configuration.urlOverrideCreator == testOverrides["URLOverrideCreator"])
		#expect(Configuration.urlOverrideScreenRecorder == testOverrides["URLOverrideScreenRecorder"])
		#expect(Configuration.urlOverrideStacks == testOverrides["URLOverrideStacks"])
		#expect(Configuration.urlOverrideToolbox == testOverrides["URLOverrideToolbox"])

		#expect(try await Configuration.cameraURL == testOverrides["URLOverrideCamera"])
		#expect(try await Configuration.creatorURL == testOverrides["URLOverrideCreator"])
		#expect(try await Configuration.screenRecorderURL == testOverrides["URLOverrideScreenRecorder"])
		#expect(try await Configuration.stacksURL == testOverrides["URLOverrideStacks"])
		#expect(try await Configuration.toolboxURL == testOverrides["URLOverrideToolbox"])
	}
}
