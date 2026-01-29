//
//  Configuration+WebAppURLs.swift
//  mmhmm
//
//  Created by Beni Federer on 15.07.24.
//

import AppKit

import Common

extension Configuration {
	/// The Malk web app URL as fetched from the service
	/// or a local override, if any.
	static var webAppURL: URL {
		get async throws {
			if let urlOverride: URL = Configuration.urlOverride {
				urlOverride
			} else {
				try await Service.API.shared.defaultWebAppURL
			}
		}
	}

	static var toolboxURL: URL {
		get async throws {
			if let urlOverrideToolbox: URL = Configuration.urlOverrideToolbox {
				return urlOverrideToolbox
			} else {
				do {
					return try await Service.API.shared.url(for: .toolbox)
				} catch {
					Logger.logError(error, messagePrefix: "Failed to fetch toolbox URL, falling back to local toolbox.", level: .error, targets: .uncheckedAll)
					return URL(string: "http://mmhmm-client/toolbox/index.html")!
				}
			}
		}
	}

	static var cameraURL: URL {
		get async throws {
			if let urlOverrideCamera: URL = Configuration.urlOverrideCamera {
				urlOverrideCamera
			} else {
				try await Service.API.shared.url(for: .camera)
			}
		}
	}

	static var creatorURL: URL {
		get async throws {
			if let urlOverrideCreator: URL = Configuration.urlOverrideCreator {
				urlOverrideCreator
			} else {
				try await Service.API.shared.url(for: .creator)
			}
		}
	}

	static var screenRecorderURL: URL {
		get async throws {
			if let urlOverrideScreenRecorder: URL = Configuration.urlOverrideScreenRecorder {
				urlOverrideScreenRecorder
			} else {
				try await Service.API.shared.url(for: .screenRecorder)
			}
		}
	}

	static var stacksURL: URL {
		get async throws {
			if let urlOverrideStacks: URL = Configuration.urlOverrideStacks {
				urlOverrideStacks
			} else {
				try await Service.API.shared.url(for: .stacks)
			}
		}
	}

	static func url(for webAppType: WebApp.WebAppType) async throws -> URL {
		switch webAppType {
		case .toolbox:
			try await Configuration.toolboxURL
		case .camera:
			try await Configuration.cameraURL
		case .creator:
			try await Configuration.creatorURL
		case .screenRecorder:
			try await Configuration.screenRecorderURL
		case .stacks:
			try await Configuration.stacksURL
		default:
			try await Service.API.shared.url(for: webAppType)
		}
	}
}
