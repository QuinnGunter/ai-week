//
//  Configuration.Service.APITests.swift
//  mmhmmTests
//
//  Created by Beni Federer on 07.08.25.
//

import Foundation

import Testing

@Suite("Service API", .serialized)
class ServiceAPITests {
	private let configurationReleaseOverrideTempStorage: Configuration.Release?
	private let linksUrlDefaultOverrideTempStorage: String

	init() async {
		// Store the initially active release override
		configurationReleaseOverrideTempStorage = Configuration.Release.override
		// Remove the override, if any
		Configuration.Release.override = nil

		// Store the initially active links URL default override
		linksUrlDefaultOverrideTempStorage = await Configuration.Service.API.urlDefaultOverride
		// Ensure the service API URL cache is cleared from stale URLs of earlier test runs.
		await Configuration.Service.API.shared.clearURLCache()
	}

	deinit {
		// Ensure the initially active overrides are restored
		Configuration.Release.override = configurationReleaseOverrideTempStorage
		setURLDefaultOverride(linksUrlDefaultOverrideTempStorage)
	}

	private func setURLDefaultOverride(_ urlString: String) {
		Task { @MainActor in
			Configuration.Service.API.urlDefaultOverride = urlString
		}
	}

	@Test("Default web app URL", arguments: [
		(Configuration.Release.production, await Configuration.Service.API.mockLinks.webClientURLs.production),
		(Configuration.Release.beta, await Configuration.Service.API.mockLinks.webClientURLs.beta),
		(Configuration.Release.alpha, await Configuration.Service.API.mockLinks.webClientURLs.alpha),
		(Configuration.Release.test, await Configuration.Service.API.mockLinks.webClientURLs.test),
	])
	func defaultWebAppURL(releaseOverride: Configuration.Release, webClientURL: URL?) async throws {
		Configuration.Release.override = releaseOverride
		#expect(try await Configuration.Service.API.shared.defaultWebAppURL.absoluteString.contains(webClientURL?.absoluteString ?? ""))
	}

	@Test("Default URLs", arguments: [
		(Configuration.Release.production, await Configuration.Service.API.mockLinks.urls.production),
		(Configuration.Release.beta, await Configuration.Service.API.mockLinks.urls.beta),
		(Configuration.Release.alpha, await Configuration.Service.API.mockLinks.urls.alpha),
		(Configuration.Release.test, await Configuration.Service.API.mockLinks.urls.test),
	])
	func defaultURLs(environment: Configuration.Release, productURLs: Configuration.Service.API.Links.URLs.ProductURLs) async throws {
		// Web app URLs are selected based on the release configuration, not the service's `URLs.default` value.
		Configuration.Release.override = environment
		// Set an intentionally invalid `URLs.default` override to ensure it's not used.
		await MainActor.run { Configuration.Service.API.urlDefaultOverride = "foo" }
		#expect(try await Configuration.Service.API.shared.url(for: .camera).absoluteString.contains(productURLs.camera?.absoluteString ?? ""))
		#expect(try await Configuration.Service.API.shared.url(for: .creator).absoluteString.contains(productURLs.creator?.absoluteString ?? ""))
		#expect(try await Configuration.Service.API.shared.url(for: .screenRecorder).absoluteString.contains(productURLs.screenRecorder?.absoluteString ?? ""))
		#expect(try await Configuration.Service.API.shared.url(for: .stacks).absoluteString.contains(productURLs.stacks?.absoluteString ?? ""))
		#expect(try await Configuration.Service.API.shared.url(for: .toolbox).absoluteString.contains(productURLs.toolbox?.absoluteString ?? ""))
	}
}
