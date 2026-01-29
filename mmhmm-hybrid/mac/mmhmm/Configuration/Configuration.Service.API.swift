//
//  Configuration.Service.API.swift
//  mmhmm
//
//  Created by Beni Federer on 06.08.25.
//

import Foundation

import Common

extension Configuration.Service {
	final actor API {
		static let shared = API()

		private init() {}

		private static let endpoint: String = "/public/webapp/links"
		private static let webClientURLsKey: String = "webClientUrls"
		private static let urlsKey: String = "urls"
		private static let defaultKey: String = "default"

		private var privateLinks: Links?
	}
}

extension Configuration.Service.API {
	/// Clears the cached web app URLs, forcing the next
	/// access to fetch the URLs from the server.
	func clearURLCache() {
		privateLinks = nil
	}

	/// The URL for the specified web app, if it is known.
	///
	/// - Parameter webApp: The web app for which to fetch the URL.
	/// - Returns: The URL for the web app.
	/// - Throws: An error if the web app is not supported, if the URL
	/// 		  could not be fetched from the service, or if the URL
	/// 		  could not be decoded from the service response.
	func url(for webApp: WebApp.WebAppType) async throws -> URL {
		guard let url: URL = switch webApp {
		case .camera: try await defaultProductURLs.camera
		case .creator: try await defaultProductURLs.creator
		case .screenRecorder: try await defaultProductURLs.screenRecorder
		case .stacks: try await defaultProductURLs.stacks
		case .toolbox: try await defaultProductURLs.toolbox
		default: throw Error.urlForWebAppIsNotSupported(webApp: webApp)
		} else {
			throw Error.failedToFetchURLForWebApp(webApp: webApp)
		}

		return url
	}

	/// The legacy Malk web app URL.
	var defaultWebAppURL: URL {
		get async throws {
			let serviceConfiguration: Configuration.Service = Configuration.Service.default

			let json: [String: Any] = try await json(fromEndPoint: Self.endpoint, serviceConfiguration: serviceConfiguration)

			guard let webClientURLs = json[Self.webClientURLsKey] as? [String: String] else {
				throw Error.valueIsInvalidForKey(key: Self.webClientURLsKey)
			}

			let releaseConfiguration: Configuration.Release = .default
			let sanitizedReleaseConfiguration: Configuration.Release = if releaseConfiguration == .engineering {
				.test
			} else {
				releaseConfiguration
			}

			let appURLString: String? = if let releaseConfigURLString = webClientURLs[sanitizedReleaseConfiguration.stringValue] {
				releaseConfigURLString
			} else {
				nil
			}

			guard let appURLString = appURLString ?? webClientURLs[Self.defaultKey] else {
				throw Error.valueIsInvalidForKey(key: Self.webClientURLsKey)
			}

			let suffixedAppURLString = if appURLString.hasSuffix("/development") {
				// if we are on development track we need manually to add index.html
				// to url otherwise any params added to link by '?' will not work
				// it's not the case with production url
				appURLString.appending("/index.html")
			} else {
				appURLString
			}

			guard let url = URL(string: suffixedAppURLString) else {
				throw Error.resolvedURLStringIsMalformed(urlString: suffixedAppURLString)
			}

			let urlWithSystemInfo: URL = url.appendingQueryParameters(SystemReporter.SystemInfo().dictionaryRepresentation)
			return urlWithSystemInfo
		}
	}
}

extension Configuration.Service.API {
	/// The object returned by `https://*api.mmhmm.app/public/webapp/links`.
	///
	/// Structure as defined by `mmhmm-service/pkg/talk/talk_http.go`.
	struct Links: Codable {
		let webClientURLs: WebClientURLs
		let urls: URLs

		/// Represents the legacy Malk URLs.
		struct WebClientURLs: Codable {
			let `default`: URL?
			let production: URL?
			let beta: URL?
			let alpha: URL?
			let test: URL?
		}

		/// Represents the various web app URLs.
		struct URLs: Codable {
			// swiftlint:disable:next nesting
			struct ProductURLs: Codable {
				let camera: URL?
				let creator: URL?
				let stacks: URL?
				let screenRecorder: URL?
				let toolbox: URL?
			}

			let `default`: String
			let test: ProductURLs
			let alpha: ProductURLs
			let beta: ProductURLs
			let production: ProductURLs
		}

		enum CodingKeys: String, CodingKey {
			case webClientURLs = "webClientUrls"
			case urls
		}
	}
}

extension Configuration.Service.API {
	private static var defaultBaseURL: URL {
		Configuration.Service.default.apiBaseURL
	}

	private var defaultProductURLs: Links.URLs.ProductURLs {
		get async throws {
			let links: Links = try await self.links

			switch Configuration.Release.default {
			case .engineering, .test:
				return links.urls.test
			case .alpha:
				return links.urls.alpha
			case .beta:
				return links.urls.beta
			case .production:
				return links.urls.production
			}
		}
	}

	private var links: Links {
		get async throws {
			if let privateLinks {
				return privateLinks
			} else {
				let serviceConfiguration: Configuration.Service = Configuration.Service.default
				let data: Data = try await json(fromEndPoint: Self.endpoint, serviceConfiguration: serviceConfiguration)
				let links: Links = try JSONDecoder().decode(Links.self, from: data)

				Logger.logMessage("Fetched web app links: \(links)", level: .debug)

				privateLinks = links

				return links
			}
		}
	}

	private func json(fromEndPoint endPoint: String, serviceConfiguration: Configuration.Service) async throws -> [String: Any] {
		let data: Data = try await json(fromEndPoint: endPoint, serviceConfiguration: serviceConfiguration)
		guard let json = try JSONSerialization.jsonObject(with: data) as? [String: Any] else {
			throw Error.invalidJSONResponse
		}

		return json
	}

	#if !TEST
	private func json(fromEndPoint endPoint: String, serviceConfiguration: Configuration.Service) async throws -> Data {
		let endpointURL: URL = Self.defaultBaseURL.appendingPathComponent(endPoint)

		let url: URL = if var urlComponents = URLComponents(url: endpointURL, resolvingAgainstBaseURL: false),
						  let marketingVersion: String = Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String {
			try {
				let queryParameters = [URLQueryItem(name: "version", value: marketingVersion)]
				urlComponents.queryItems = queryParameters
				guard let urlWithQuery: URL = urlComponents.url else { throw Error.failedToCreateURLComponents(urlComponents.string ?? "") }
				return urlWithQuery
			}()
		} else {
			endpointURL
		}

		let (data, response): (Data, URLResponse) = try await URLSession.shared.data(from: url)

		guard let response = response as? HTTPURLResponse else {
			throw Error.unexpectedResponse(String(describing: response))
		}

		guard response.statusCode < 400 else {
			var errorMessage: String
			do {
				let json = try JSONSerialization.jsonObject(with: data) as? [String: Any]
				errorMessage = json?["message"] as? String ?? "No additional information available"
			} catch {
				errorMessage = "No additional information available"
			}

			throw Error.serverError(response.statusCode, errorMessage)
		}

		return data
	}
	#endif
}

extension Configuration.Service.API {
	enum Error {
		case unexpectedResponse(String)
		case serverError(Int, String)
		case invalidJSONResponse
		case valueIsInvalidForKey(key: String)
		case valueIsMissingValueForDefaultKeyInValueForKey(key: String)
		case resolvedURLStringIsMalformed(urlString: String)
		case urlForWebAppIsNotSupported(webApp: WebApp.WebAppType)
		case unknownURLsDefaultValue(value: String)
		case failedToFetchURLForWebApp(webApp: WebApp.WebAppType)
		case failedToCreateURLComponents(String)
	}
}

extension Configuration.Service.API.Error: BaseErrorWithAssociatedValues {
	static let domain: String = String(describing: String(describing: Self.self))

	var errorMessage: String {
		switch self {
		case let .valueIsInvalidForKey(key):
			String(localized: "Endpoint returned a value with an invalid object for \(key).")
		case let .valueIsMissingValueForDefaultKeyInValueForKey(key):
			String(localized: "Returned object is missing default value in value for \(key).")
		case let .resolvedURLStringIsMalformed(urlString):
			String(localized: "Resolved URL is malformed: \(urlString)")
		case let .unexpectedResponse(response):
			String(localized: "Server sent unexpected response: \(response)")
		case let .serverError(statusCode, message):
			String(localized: "Server responded with error: \(statusCode), \(message)")
		case .invalidJSONResponse:
			String(localized: "Unable to parse server response.")
		case let .urlForWebAppIsNotSupported(webApp):
			String(localized: "URL for web app \(String(describing: webApp)) is not supported.")
		case let .unknownURLsDefaultValue(value):
			String(localized: "Unknown URLs default value: \(value)")
		case let .failedToFetchURLForWebApp(webApp):
			String(localized: "Failed to fetch URL for web app \(String(describing: webApp)).")
		case let .failedToCreateURLComponents(urlString):
			String(localized: "Failed to create URL components from string: \(urlString)")
		}
	}

	static let allCases: [Self] = [
		.unexpectedResponse(""),
		.serverError(0, ""),
		.invalidJSONResponse,
		.valueIsInvalidForKey(key: ""),
		.valueIsMissingValueForDefaultKeyInValueForKey(key: ""),
		.resolvedURLStringIsMalformed(urlString: ""),
		.urlForWebAppIsNotSupported(webApp: .external),
		.unknownURLsDefaultValue(value: ""),
		.failedToFetchURLForWebApp(webApp: .external),
		.failedToCreateURLComponents(""),
	]
}
