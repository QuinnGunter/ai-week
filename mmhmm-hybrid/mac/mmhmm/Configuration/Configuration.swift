//
//  Configuration.swift
//  mmhmm
//
//  Created by Beni Federer on 22.10.24.
//

import Foundation

enum Configuration {}

extension Configuration {
	enum Release: String {
		case engineering
		case test
		case alpha
		case beta
		case production
	}

	enum Service: String {
		case development
		case stage
		case production
	}
}

extension Configuration.Release {
	/// The track to fall back to if no release can be determined.
	private static let fallback: Self = .production

	var stringValue: String { rawValue }

	/// Whether the release configuration allows debug tools,
	/// e.g. the **Test** menu.
	var allowsDebugTools: Bool {
		self <= .test
	}

	/// The default, i.e. active release configuration.
	///
	/// The default release configuration is determined by taking
	/// `override` into account.
	///
	/// If no release configuration can be determined, this property
	/// falls back to `.production`.
	static var `default`: Self {
		override ?? bundleDefault
	}

	/// The release configuration to request updates for.
	///
	/// The effective update release configuration is determined by
	/// taking any set overrides into account where `override`
	/// overrides `updateOverride` overrides `bundleDefault`.
	///
	/// If no release configuration can be determined, this property
	/// falls back to `.production`.
	///
	/// #### Reasoning
	///
	/// The idea is that an app bundle distributed with a production
	/// release configuration, i.e. `bundleDefault == .production`,
	/// might switch to the beta track by setting an update override,
	/// i.e. `updateOverride == .beta`, but then might set a release
	/// override to switch to test, i.e. `override == .test`.
	/// In this scenario, updates are expected to come from the test
	/// track, rather than the beta track. However, when switching
	/// back to the distribution release configuration by removing
	/// the release override, updates would again be expected to serve
	/// the newest beta release.
	///
	/// In other words, temporarily switching to a different release
	/// configuration and back does not cancel the formerly requested
	/// participation in receiving beta updates.
	static var effectiveUpdate: Self {
		override ?? updateOverride ?? bundleDefault
	}

	/// Removes the update override if it matches the distribution
	/// release configuration.
	///
	/// #### Reasoning
	///
	/// Once an app bundle for the update override release configuration
	/// has been downloaded and installed, it will be an app bundle distributed
	/// for the targeted update release configuration. On the other hand,
	/// if the update override release configuration is set to the current
	/// distribution release configuration to cancel receiving updates for
	/// a different release configuration, both release configurations are
	/// the same.
	///
	/// In both cases, the update override has successfully taken effect and
	/// can be removed.
	static func removeUpdateOverrideIfCurrent() {
		guard bundleDefault == effectiveUpdate, updateOverride != nil else { return }
		Logger.logMessage("Removing update override \(updateOverride?.rawValue ?? "") because it matches the current distribution release configuration.", level: .info)
		updateOverride = nil
	}

	/// The release configuration as defined by this app bundle's `Info.plist`.
	///
	/// If no release configuration can be determined, this property
	/// falls back to `.production`.
	static var bundleDefault: Self {
		#if DEBUG && !TEST
		.engineering
		#else
		guard let release: Self = Bundle
			.main
			.infoDictionary?[UserDefaults.mmhmmKey.releaseConfiguration]
			.flatMap({ $0 as? String })
			.flatMap({ Self(rawValue: $0.lowercased()) })
		else {
			Logger.logMessage("No release configuration found. Falling back to \(fallback.rawValue).", level: .error)
			return fallback
		}
		return release
		#endif
	}

	/// Overrides the release configuration.
	///
	/// The override is usually set manually on the command line, e.g.
	/// `% defaults write app.mmhmm.hybrid ReleaseConfiguration -string alpha`.
	static var override: Self? {
		get {
			UserDefaults
				.standard
				.string(forKey: UserDefaults.mmhmmKey.releaseConfiguration)
				.flatMap { Self(rawValue: $0.lowercased()) }
		}
		set {
			UserDefaults
				.standard
				.set(newValue?.rawValue,
					 forKey: UserDefaults.mmhmmKey.releaseConfiguration)
		}
	}

	/// Overrides the release configuration when requesting updates.
	///
	/// The override is usually set in code when users switch to the
	/// beta update track from the app menu.
	static var updateOverride: Self? {
		get {
			UserDefaults
				.standard
				.string(forKey: UserDefaults.mmhmmKey.updateReleaseConfiguration)
				.flatMap { Self(rawValue: $0.lowercased()) }
		}
		set {
			UserDefaults
				.standard
				.set(newValue?.rawValue,
					 forKey: UserDefaults.mmhmmKey.updateReleaseConfiguration)
		}
	}
}

extension Configuration.Service {
	var stringValue: String { rawValue }

	/// The default, i.e. active service configuration.
	///
	/// The default release configuration is determined by taking
	/// `override` into account.
	static var `default`: Self {
		override ?? bundleDefault
	}

	/// Overrides the service configuration.
	///
	/// The override is usually set manually on the command line, e.g.
	/// `% defaults write app.mmhmm.hybrid ServiceConfiguration -string stage`.
	static var override: Self? {
		get {
			UserDefaults
				.standard
				.string(forKey: UserDefaults.mmhmmKey.serviceConfiguration)
				.flatMap { Self(rawValue: $0.lowercased()) }
		}
		set {
			UserDefaults
				.standard
				.set(newValue?.rawValue,
					 forKey: UserDefaults.mmhmmKey.serviceConfiguration)
		}
	}

	private static var bundleDefault: Self {
		#if DEBUG && !TEST
		.development
		#else
		.production
		#endif
	}
}

extension UserDefaults.mmhmmKey {
	static let releaseConfiguration = "ReleaseConfiguration"
	static let updateReleaseConfiguration = "UpdateReleaseConfiguration"
	static let serviceConfiguration = "ServiceConfiguration"
}
