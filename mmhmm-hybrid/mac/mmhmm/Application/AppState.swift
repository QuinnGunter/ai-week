//
//  AppState.swift
//  mmhmm
//
//  Created by Beni Federer on 15.04.25.
//

import Foundation

import Common

@MainActor
final class AppState: ObservableObject {
	@Persisted(
		toStorage: .standard,
		key: UserDefaults.mmhmmKey.AppState.webAppType,
		defaultValue: .closure {
			if let infoPlistWebApp: WebApp.WebAppType = .infoPlistDefault {
				[infoPlistWebApp]
			} else {
				[.toolbox]
			}
		}
	)
	var webApps: [WebApp.WebAppType]

	func addWebApp(_ webApp: WebApp.WebAppType) {
		guard webApps.contains(webApp) == false else { return }
		webApps += [webApp]
		Logger.logMessage("Added web app: \(webApp.userFriendlyName). Current web apps: \(webApps.userFriendlyNames)", level: .info)
	}

	func removeWebApp(_ webApp: WebApp.WebAppType) {
		guard webApps.contains(webApp) else { return }
		webApps.removeAll { $0 == webApp }
		Logger.logMessage("Removed web app: \(webApp.userFriendlyName). Current web apps: \(webApps.userFriendlyNames)", level: .info)
	}
}

extension UserDefaults.mmhmmKey {
	enum AppState {
		fileprivate static let webAppType: String = "WebAppType"
	}
}

extension WebApp.WebAppType {
	fileprivate static let infoPlistKey: String = "InitialWebApp"

	/// The web app type specified in the `Info.plist`, if any.
	static var infoPlistDefault: WebApp.WebAppType? {
		if let infoPlistValue = Bundle.main.infoDictionary?[WebApp.WebAppType.infoPlistKey] as? String {
			WebApp.WebAppType(rawValue: infoPlistValue)
		} else {
			nil
		}
	}

	/// The default web app, which can serve as a virtual camera producer,
	/// based on the `Info.plist` or falling back to `.camera`.
	static var virtualCameraProducerDefault: WebApp.WebAppType {
		if let infoPlistDefault, infoPlistDefault == .camera || infoPlistDefault == .creator {
			infoPlistDefault
		} else {
			.camera
		}
	}
}

extension Array where Element == WebApp.WebAppType {
	var userFriendlyNames: String {
		map { $0.userFriendlyName }.joined(separator: ", ")
	}

	var containsVirtualCameraProducers: Bool {
		contains(.camera) || contains(.creator)
	}
}
