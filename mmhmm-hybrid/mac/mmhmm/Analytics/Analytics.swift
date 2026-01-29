//
//  Analytics.swift
//  mmhmm
//
//  Created by Matthew Tonkin on 29/4/2024.
//

import AppKit

@preconcurrency import Mixpanel

actor Analytics {
	static let shared = Analytics()

	@MainActor
	var appState: AppState?

	private let mixpanel: MixpanelInstance = Mixpanel.initialize(token: Configuration.Service.mixpanelToken)
	private lazy var hardwareID: String = { Hardware.identifier.uuidString }()
	private lazy var hybridVersion: String = { Bundle.main.object(forInfoDictionaryKey: kCFBundleVersionKey as String) as? String ?? "0" }()

	private var baseProperties: [String: String] {
		get async {
			var baseProperties: [String: String] = [:]
			baseProperties["app"] = "mmhmm.macos.hybrid"
			baseProperties["$os"] = "Mac"
			baseProperties["component"] = "hybrid"
			// FIXME: Depends on the web app sending events
			let (releaseTrack, build): (String?, String?) = await MainActor.run { (nil, nil) }
			if let releaseTrack {
				baseProperties["release_track"] = releaseTrack
			}
			if let build {
				baseProperties["build"] = build
			}
			baseProperties["hybrid_version"] = hybridVersion
			baseProperties["hybrid_release_track"] = Configuration.Release.default.stringValue
			baseProperties["hardware_id"] = hardwareID
			await baseProperties[AppState.analyticsKey] = await MainActor.run { appState?.webApps.analyticsName }
			return baseProperties
		}
	}

	nonisolated func identify(userID: String) {
		Task { await isolatedIdentify(userID: userID) }
	}

	nonisolated func logEvent(_ event: String) {
		Task { await isolatedLogEvent(event, properties: nil) }
	}

	nonisolated func logErrorEvent(_ errorEvent: String, error: Error) {
		Task {
			let properties: [String: String] = ["reason": (error as NSError).localizedDescription]
			await isolatedLogEvent(errorEvent, properties: properties)
		}
	}

	/// Flushes analytics data to the server asynchronously
	///
	/// Mixpanel fails us here. The `flush` API has a completion handler,
	/// but it fires asynchronously on the main queue. When the app is
	/// closed, it gets notified about it on the main queue. If it waits
	/// synchronously on the completion handler, the app deadlocks. If
	/// the app gives up the main thread and waits asynchronously, the
	/// app shuts down in the meantime. All we can do is wait for a short
	/// amount of time after calling the `flush` function to allow it to
	/// do its work asynchronously before the app is terminated.
	func prepareForShutdown() {
		mixpanel.flush(performFullFlush: true)
	}
}

extension Analytics {
	func isolatedLogEvent(_ event: String, properties: [String: Any]?) async {
		var mixpanelProperties: [String: MixpanelType] = [:]
		for property: (key: String, value: Any) in properties ?? [:] {
			guard let value = property.value as? MixpanelType else {
				continue
			}

			mixpanelProperties[property.key] = value
		}
		await baseProperties.forEach { (key: String, value: String) in
			mixpanelProperties[key] = value
		}
		mixpanel.track(event: event, properties: mixpanelProperties)
	}

	private func isolatedIdentify(userID: String) async {
		if let lastKnownIdentity: String = UserDefaults.standard.string(forKey: UserDefaults.mmhmmKey.lastKnownUserIdentity), lastKnownIdentity != userID {
			// This construct fixes a concurrency runtime assertion that occurs
			// because the `reset` completion handler dispatches to the main queue,
			// but must be wrangled back onto this actor's concurrency context.
			await withCheckedContinuation { continuation in
				mixpanel.reset {
					continuation.resume()
				}
			}
			mixpanel.identify(distinctId: userID)
		} else {
			mixpanel.identify(distinctId: userID)
		}

		UserDefaults.standard.set(userID, forKey: UserDefaults.mmhmmKey.lastKnownUserIdentity)
	}
}

extension Configuration.Service {
	fileprivate static var mixpanelToken: String {
		switch Self.default {
		case .development:
			return "4433f3555a666a2a9da689f62a541f2d"
		case .stage:
			return "7f8b7eb91a43f6ffb336b7536814de7c"
		case .production:
			return "0c26da7066a11eaf69262e5020ebbccf"
		@unknown default:
			return "0c26da7066a11eaf69262e5020ebbccf"
		}
	}
}

extension UserDefaults.mmhmmKey {
	fileprivate static let lastKnownUserIdentity: String = "LastKnownUserID"
}
