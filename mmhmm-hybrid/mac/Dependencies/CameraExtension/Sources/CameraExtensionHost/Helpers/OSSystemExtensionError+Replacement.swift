//
//  OSSystemExtensionError+Replacement.swift
//	CameraExtensionHost
//
//  Created by Beni Federer on 25.03.24.
//

import SystemExtensions

extension OSSystemExtensionError {
	/// Fixes up `OSSystemExtensionError`s that have no further info except an error code.
	///
	/// Depending on how they are thrown, `OSSystemExtensionError`s can come without
	/// a `userInfo` dictionary providing the `localizedDescription` for user alerts.
	var withRepairedUserInfo: OSSystemExtensionError {
		guard userInfo.isEmpty else {
			// The error has all the required info, no need to replace it.
			return self
		}

		// This is supposed to be a temporary fix so don't bother with localization.
		// Localized descriptions are as a close as possible to the original descriptions.
		switch code {
		case .missingEntitlement:
			return OSSystemExtensionError(code, userInfo: [
				NSLocalizedDescriptionKey: "System Extension is missing an entitlement.",
				NSLocalizedRecoverySuggestionErrorKey: "The application download may be corrupt. Try downloading it again.",
			])
		case .unsupportedParentBundleLocation:
			return OSSystemExtensionError(code, userInfo: [
				NSLocalizedDescriptionKey: "App containing System Extension to be activated must be in /Applications folder.",
				NSLocalizedRecoverySuggestionErrorKey: "Move the app bundle containing the System Extension to your /Applications folder and try again.",
			])
		case .extensionNotFound:
			return OSSystemExtensionError(code, userInfo: [
				NSLocalizedDescriptionKey: "Extension not found in App bundle.",
			])
		case .extensionMissingIdentifier:
			return OSSystemExtensionError(code, userInfo: [
				NSLocalizedDescriptionKey: "Extension is missing an identifier.",
			])
		case .duplicateExtensionIdentifer:
			return OSSystemExtensionError(code, userInfo: [
				NSLocalizedDescriptionKey: "Duplicate extension identifier.",
			])
		case .unknownExtensionCategory:
			return OSSystemExtensionError(code, userInfo: [
				NSLocalizedDescriptionKey: "Unknown extension category.",
			])
		case .codeSignatureInvalid:
			return OSSystemExtensionError(code, userInfo: [
				NSLocalizedDescriptionKey: "Invalid code signature or missing entitlements",
				NSLocalizedRecoverySuggestionErrorKey: "The application download may be corrupt. Try downloading it again.",
			])
		case .validationFailed:
			return OSSystemExtensionError(code, userInfo: [
				NSLocalizedDescriptionKey: "Extension validation failed.",
				NSLocalizedRecoverySuggestionErrorKey: "The application download may be corrupt. Try downloading it again.",
			])
		case .forbiddenBySystemPolicy:
			return OSSystemExtensionError(code, userInfo: [
				NSLocalizedDescriptionKey: "Installing System Extensions is not permitted by your security policy.",
				NSLocalizedRecoverySuggestionErrorKey: "Contact your system administrator.",
			])
		case .requestCanceled:
			return OSSystemExtensionError(code, userInfo: [
				NSLocalizedDescriptionKey: "Extension cancelled by host.",
			])
		case .requestSuperseded:
			return OSSystemExtensionError(code, userInfo: [
				NSLocalizedDescriptionKey: "System Extension request failed because the system already has a pending request for the same identifier.",
			])
		case .authorizationRequired:
			return OSSystemExtensionError(code, userInfo: [
				NSLocalizedDescriptionKey: "the system was unable to obtain the proper authorization.",
			])
		default:
			return OSSystemExtensionError(code, userInfo: [
				NSLocalizedDescriptionKey: "Unknown error occurred.",
			])
		}
	}
}
