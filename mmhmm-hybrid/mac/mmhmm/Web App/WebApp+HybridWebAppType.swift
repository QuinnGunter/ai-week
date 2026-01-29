//
//  WebApp+HybridWebAppType.swift
//  mmhmm
//
//  Created by Beni Federer on 07.08.25.
//

import Foundation

extension WebApp.WebAppType {
	var hybridWebAppType: WebAppType {
		switch self {
		case .external: .external
		case .miniRemote: .mini_remote
		case .mmhmm: .mmhmm
		case .broadcast: .broadcast
		case .prompt: .prompt
		case .hybridAPITester: .hybrid_api_tester
		case .segmentationPanel: .segmentation_panel
		case .toolbox: .toolbox
		case .offline: .offline_wall
		case .stacks: .stacks
		case .camera: .camera
		case .creator: .creator
		case .screenRecorder: .screen_recorder
		case .localHost: .local_host
		case .settings: .settings
		}
	}

	/// The web app to launch with, passed as a command line flag.
	static var hybridStartupRequest: Self? {
		if let hybridWebAppType: WebAppType = CxxBridge.getStartupRequestWebApp().value {
			hybridWebAppType.webAppType
		} else {
			nil
		}
	}

	/// While Camera is still being served through the same URL as Creator,
	/// we adorn the URL with this query parameter to distinguish between the two.
	static let cameraIndicatorQueryParameter: String = "camera=true"

	func mmhmmResolved(url: URL) -> WebApp.WebAppType {
		if self != .mmhmm {
			self
		} else if url.query(percentEncoded: false)?.contains(Self.cameraIndicatorQueryParameter) ?? false {
			.camera
		} else {
			.creator
		}
	}

	/// If the web app type is `.localHost`, attempts to resolve it to a specific
	/// web app type based on the URL overrides defined in the configuration.
	func localHostResolved(url: URL) -> WebApp.WebAppType {
		guard self == .localHost else { return self }

		let localHostOverridesWithPort: [WebApp.WebAppType: URL] = Configuration
			.localHostOverrides
			.filter { $1.port == url.port }

		guard localHostOverridesWithPort.count == 1, let localHostOverrideWebAppType: WebApp.WebAppType = localHostOverridesWithPort.first?.key else {
			Logger.logMessage("Expected exactly one URL override for localhost at port (\(url.port?.description ?? "nil")) when resolving to web app, but found \(localHostOverridesWithPort.count).", level: .error)
			return self
		}

		return localHostOverrideWebAppType
	}
}

extension Configuration {
	fileprivate static var localHostOverrides: [WebApp.WebAppType: URL] {
		[
			.camera: urlOverrideCamera,
			.creator: urlOverrideCreator,
			.screenRecorder: urlOverrideScreenRecorder,
			.stacks: urlOverrideStacks,
			.toolbox: urlOverrideToolbox,
		]
			.reduce(into: [WebApp.WebAppType: URL]()) { (partialResult: inout [WebApp.WebAppType: URL], element: [WebApp.WebAppType: URL?].Element) in
				guard
					let value: URL = element.value,
					let host: String = value.host(percentEncoded: false),
					host.contains("localhost")
				else {
					return
				}

				partialResult[element.key] = value
			}
	}
}

extension WebAppType {
	var webAppType: WebApp.WebAppType? {
		switch self {
		case .external: .external
		case .mini_remote: .miniRemote
		case .mmhmm: .mmhmm
		case .broadcast: .broadcast
		case .prompt: .prompt
		case .hybrid_api_tester: .hybridAPITester
		case .segmentation_panel: .segmentationPanel
		case .toolbox: .toolbox
		case .offline_wall: .offline
		case .stacks: .stacks
		case .camera: .camera
		case .creator: .creator
		case .screen_recorder: .screenRecorder
		case .local_host: .localHost
		case .settings: .settings
		@unknown default:
			{
				assertionFailure("Unknown web app type \(self)")
				Logger.logMessage("Unknown web app type \(self)", level: .error)
				return nil
			}()
		}
	}
}
