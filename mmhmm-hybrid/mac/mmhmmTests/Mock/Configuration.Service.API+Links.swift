//
//  Configuration.Service.API+Links.swift
//  mmhmmTests
//
//  Created by Beni Federer on 07.08.25.
//

import Foundation

// The regular build targets are built as part of test runs and
// depend on some of the `Configuration.Service.API`. Since they
// can't be easily excluded from inheriting the `TEST` definition,
// they include this mock file instead.
#if TEST
extension Configuration.Service.API {
	@MainActor
	static var urlDefaultOverride: String = "production"

	@MainActor
	static var mockLinks: Links {
		let testProductURLs = Links.URLs.ProductURLs(
			camera: URL(string: "https://mock.camera.url/test")!,
			creator: URL(string: "https://mock.creator.url/test")!,
			stacks: URL(string: "https://mock.stacks.url/test")!,
			screenRecorder: URL(string: "https://mock.screenrecorder.url/test")!,
			toolbox: URL(string: "https://mock.toolbox.url/test")!
		)

		let alphaProductURLs = Links.URLs.ProductURLs(
			camera: URL(string: "https://mock.camera.url/alpha")!,
			creator: URL(string: "https://mock.creator.url/alpha")!,
			stacks: URL(string: "https://mock.stacks.url/alpha")!,
			screenRecorder: URL(string: "https://mock.screenrecorder.url/alpha")!,
			toolbox: URL(string: "https://mock.toolbox.url/alpha")!
		)

		let betaProductURLs = Links.URLs.ProductURLs(
			camera: URL(string: "https://mock.camera.url/beta")!,
			creator: URL(string: "https://mock.creator.url/beta")!,
			stacks: URL(string: "https://mock.stacks.url/beta")!,
			screenRecorder: URL(string: "https://mock.screenrecorder.url/beta")!,
			toolbox: URL(string: "https://mock.toolbox.url/beta")!
		)

		let productionProductURLs = Links.URLs.ProductURLs(
			camera: URL(string: "https://mock.camera.url/production")!,
			creator: URL(string: "https://mock.creator.url/production")!,
			stacks: URL(string: "https://mock.stacks.url/production")!,
			screenRecorder: URL(string: "https://mock.screenrecorder.url/production")!,
			toolbox: URL(string: "https://mock.toolbox.url/production")!
		)

		let urls = Links.URLs(
			default: urlDefaultOverride,
			test: testProductURLs,
			alpha: alphaProductURLs,
			beta: betaProductURLs,
			production: productionProductURLs
		)

		let webClientURLs = Links.WebClientURLs(
			default: URL(string: "https://mock.webclient.url")!,
			production: URL(string: "https://mock.webclient.production")!,
			beta: URL(string: "https://mock.webclient.beta")!,
			alpha: URL(string: "https://mock.webclient.alpha")!,
			test: URL(string: "https://mock.webclient.test")!
		)

		return Links(webClientURLs: webClientURLs, urls: urls)
	}

	func json(fromEndPoint endPoint: String, serviceConfiguration: Configuration.Service) async throws -> Data {
		let mockLinks: Links = await MainActor.run { Self.mockLinks }
		return try JSONEncoder().encode(mockLinks)
	}
}
#endif
