//
//  HybridURLBuilderTests.swift
//  mmhmmTests
//
//  Created by Beni Federer on 27.08.25.
//

import Testing

@Suite("Hybrid URL Builder Tests", .serialized)
class HybridURLBuilderTests {
	@Test("Build Hybrid URL", arguments: [
		(WebApp.WebAppType.camera, "mmhmm-hybrid:///camera"),
		(WebApp.WebAppType.creator, "mmhmm-hybrid:///creator"),
		(WebApp.WebAppType.screenRecorder, "mmhmm-hybrid:///recorder"),
		(WebApp.WebAppType.stacks, "mmhmm-hybrid:///stacks"),
		(WebApp.WebAppType.broadcast, nil),
		(WebApp.WebAppType.external, nil),
		(WebApp.WebAppType.hybridAPITester, nil),
		(WebApp.WebAppType.miniRemote, nil),
		(WebApp.WebAppType.mmhmm, nil),
		(WebApp.WebAppType.offline, nil),
		(WebApp.WebAppType.prompt, nil),
		(WebApp.WebAppType.segmentationPanel, nil),
		(WebApp.WebAppType.toolbox, nil),
		(WebApp.WebAppType.settings, nil),
	])
	func buildHybridURL(webAppType: WebApp.WebAppType, expectedURL: String?) async throws {
		#expect(HybridURLBuilder.buildURL(launching: webAppType)?.absoluteString == expectedURL)
	}

	@Test("Last used hybrid URL")
	func lastUsedHybridURL() async throws {
		#expect(HybridURLBuilder.lastUsedURL.absoluteString == "mmhmm-hybrid:///lastused")
	}

	@Test("Scheme only hybrid URL")
	func schemeOnlyHybridURL() async throws {
		#expect(HybridURLBuilder.schemeOnlyURL.absoluteString == "mmhmm-hybrid:///")
	}
}
