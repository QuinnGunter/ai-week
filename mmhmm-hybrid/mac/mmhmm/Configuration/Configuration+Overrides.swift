//
//  Configuration+Overrides.swift
//  mmhmm
//
//  Created by Beni Federer on 11.04.25.
//

import AppKit

#if DEBUG
extension Configuration {
	static var hasOverrides: Bool {
		Release.override != nil || Release.updateOverride != nil || Service.override != nil || urlOverrides != nil
	}

	static var overridesSummary: String {
		var overrideStrings = [String]()

		if let override = Release.override {
			overrideStrings.append("Release override: \(override)")
		}
		if let updateOverride = Release.updateOverride {
			overrideStrings.append("Update override: \(updateOverride)")
		}
		if let serviceOverride = Service.override {
			overrideStrings.append("Service override: \(serviceOverride)")
		}
		if let urlOverrides = urlOverrides {
			overrideStrings.append("URL overrides: \(urlOverrides)")
		}

		return overrideStrings.joined(separator: "\n")
	}
}
#else
extension Configuration {
	static var hasOverrides: Bool {
		Service.override != nil || urlOverrides != nil
	}

	static var overridesSummary: String {
		var overrideStrings = [String]()

		if let serviceOverride = Service.override {
			overrideStrings.append("Service override: \(serviceOverride)")
		}
		if let urlOverride = urlOverrides {
			overrideStrings.append("URL override: \(urlOverride)")
		}

		return overrideStrings.joined(separator: "\n")
	}
}
#endif

extension Configuration {
	/// The local Malk web app URL override, if any.
	static var urlOverride: URL? {
		urlOverrides?[UserDefaults.mmhmmKey.urlOverride]
	}

	/// The local Camera web app URL override, if any.
	static var urlOverrideCamera: URL? {
		urlOverrides?[UserDefaults.mmhmmKey.urlOverrideCamera]
	}

	/// The local Creator web app URL override, if any.
	static var urlOverrideCreator: URL? {
		urlOverrides?[UserDefaults.mmhmmKey.urlOverrideCreator]
	}

	/// The local Screen Recorder web app URL override, if any.
	static var urlOverrideScreenRecorder: URL? {
		urlOverrides?[UserDefaults.mmhmmKey.urlOverrideScreenRecorder]
	}

	/// The local Stacks web app URL override, if any.
	static var urlOverrideStacks: URL? {
		urlOverrides?[UserDefaults.mmhmmKey.urlOverrideStacks]
	}

	/// The local Toolbox web app URL override, if any.
	static var urlOverrideToolbox: URL? {
		urlOverrides?[UserDefaults.mmhmmKey.urlOverrideToolbox]
	}

	/// A dictionary of all local URL overrides, if any.
	static var urlOverrides: [String: URL]? {
		get {
			let overrides: [String: URL] = UserDefaults
				.mmhmmKey
				.urlOverrides
				.reduce(into: [:]) { result, key in
					guard let overrideURL: String = UserDefaults.standard.string(forKey: key) else { return }
					result[key] = URL(string: overrideURL)
				}
			return overrides.isEmpty ? nil : overrides
		}
		set {
			UserDefaults
				.mmhmmKey
				.urlOverrides
				.forEach {
					UserDefaults.standard.removeObject(forKey: $0)
				}

			guard let newValue else { return }

			newValue
				.forEach {
					UserDefaults
						.standard
						.set($1.absoluteString, forKey: $0)
				}
		}
	}
}

extension UserDefaults.mmhmmKey {
	fileprivate static let urlOverrides: [String] = [
		urlOverride,
		urlOverrideCamera,
		urlOverrideCreator,
		urlOverrideScreenRecorder,
		urlOverrideStacks,
		urlOverrideToolbox,
	]

	fileprivate static let urlOverride: String = "URLOverride"
	fileprivate static let urlOverrideCamera: String = "URLOverrideCamera"
	fileprivate static let urlOverrideCreator: String = "URLOverrideCreator"
	fileprivate static let urlOverrideScreenRecorder: String = "URLOverrideScreenRecorder"
	fileprivate static let urlOverrideStacks: String = "URLOverrideStacks"
	fileprivate static let urlOverrideToolbox: String = "URLOverrideToolbox"
}
