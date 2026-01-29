//
//  OSSystemExtensionProperties+Extensions.swift
//  CameraExtensionHost
//
//  Created by Beni Federer on 29.10.24.
//

import SystemExtensions

extension Array where Element == OSSystemExtensionProperties {
	/// The `OSSystemExtensionProperties` instance deemed most relevant.
	///
	/// Relevance is determined by following the sorting order
	/// 1. enabled (most relevant),
	/// 2. awaiting user approval,
	/// 3. disabled,
	/// 4. uninstalling.
	var mostRelevant: OSSystemExtensionProperties? {
		// swiftformat:disable indent
		first(where: \.isEnabled)
		?? first(where: \.isAwaitingUserApproval)
		?? first(where: \.isDisabled)
		?? first(where: \.isUninstalling)
		// swiftformat:enable indent
	}
}

extension OSSystemExtensionProperties {
	public var versionDescription: String {
		bundleIdentifier + " v" + bundleShortVersion + " (" + bundleVersion + ")"
	}
}

extension OSSystemExtensionProperties {
	/// Represents the states as being seen in `% systemextensionsctl list` output.
	enum ActivationState {
		/// Equivalent to `[activated enabled]`.
		case enabled
		/// Equivalent to `[activated disabled]`.
		case disabled
		/// Equivalent to `[activated waiting for user]`.
		case awaitingUserApproval
		/// Equivalent to `[terminated waiting to uninstall on reboot]`.
		case uninstalling
	}

	var activationState: ActivationState {
		if isEnabled {
			.enabled
		} else if isAwaitingUserApproval {
			.awaitingUserApproval
		} else if isUninstalling {
			.uninstalling
		} else {
			.disabled
		}
	}

	func isOlderThanSystemExtensionBundle(withIdentifier identifier: String) -> Bool {
		guard
			let bundledExtension: Bundle = Bundle.main.systemExtensionBundle(withIdentifier: identifier),
			let bundledExtensionVersion: String = bundledExtension.infoDictionary?["CFBundleVersion"] as? String
		else {
			return true
		}

		return bundledExtensionVersion.versionCompare(bundleVersion) == .orderedDescending
	}
}

extension OSSystemExtensionProperties {
	/// Returns whether an extension has been activated, but disabled in System Settings.
	fileprivate var isDisabled: Bool {
		activationState == .disabled
	}

	private var bundledInfoPlistPath: URL? {
		return Bundle.main.builtInPlugInsURL
	}
}

extension String {
	fileprivate func versionCompare(_ otherVersion: String) -> ComparisonResult {
		return compare(otherVersion, options: .numeric)
	}
}

extension Bundle {
	private var contentsURL: URL {
		return bundleURL.appendingPathComponent("Contents")
	}

	private var libraryURL: URL {
		return contentsURL.appendingPathComponent("Library")
	}

	private var systemExtensionsURL: URL {
		return libraryURL.appendingPathComponent("SystemExtensions")
	}

	private func systemExtensionURL(withIdentifier identifier: String) -> URL {
		return systemExtensionsURL.appendingPathComponent(identifier).appendingPathExtension("systemextension")
	}

	fileprivate func systemExtensionBundle(withIdentifier identifier: String) -> Bundle? {
		return Bundle(url: systemExtensionURL(withIdentifier: identifier))
	}
}
