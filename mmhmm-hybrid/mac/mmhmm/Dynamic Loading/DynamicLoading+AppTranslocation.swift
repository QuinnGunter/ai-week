//
//  DynamicLoading+AppTranslocation.swift
//  mmhmm
//
//  Created by Beni Federer on 31.07.24.
//

import AppKit

import Common

extension DynamicLoading {
	enum AppTranslocation {}
}

/// An extension wrapping private app translocation API in the Security framework.
///
/// ### Helpful Documentation
///
/// * [Introduction in macOS Sierra](https://developer.apple.com/library/archive/releasenotes/MacOSX/WhatsNewInOSX/Articles/OSXv10.html#//apple_ref/doc/uid/TP40017145-SW4)
/// * [App Translocation Notes by Apple DTS](https://forums.developer.apple.com/forums/thread/724969)
/// * [Detect App Translocation Without the 10.12 SDK by Jeff Johnson](https://lapcatsoftware.com/articles/detect-app-translocation.html)
extension DynamicLoading.AppTranslocation {
	/// Determines if the passed in URL has been translocated by the system.
	///
	/// Protected by ``CrashLoopPrevention``.
	///
	/// - Parameter url: The URL to check for translocation.
	/// - Returns: `true` if translocated, `false` otherwise.
	/// - Throws: A ``DynamicLoading.Error`` or a ``DynamicLoading.Translocation.Error`` describing the failure,
	///           or in case of a previous crash a ``CrashLoopPrevention.Error``.
	static func isTranslocatedURL(_ url: URL) throws -> Bool {
		try CrashLoopPrevention.execute(withIdentifier: CrashLoopPreventionIdentifier.isTranslocatedURL) {
			guard secTranslocateIsAvailable else { throw Error.appKitVersionIsTooLow }
			return try DynamicLoading.withHandleOfDylib(withPath: securityFrameworkURL.path) { handle in
				var isTranslocated: Bool = false
				let secTranslocateIsTranslocatedURLFunction: SecTranslocateIsTranslocatedURL.Function = try SecTranslocateIsTranslocatedURL.load(withHandle: handle)
				var error: CFError?
				guard secTranslocateIsTranslocatedURLFunction(url as CFURL, &isTranslocated, &error), error == nil else {
					guard let error else {
						throw Error.determiningURLTranslocationFailedWithUnknownError
					}
					throw Error.determiningURLTranslocationFailedWithError(error)
				}
				return isTranslocated
			}
		}
	}

	/// Finds the original URL of an app bundle URL, if it was translocated
	/// by the system, or returns the passed in URL.
	///
	/// - Note: This method duplicates code from ``isTranslocatedURL()`` to avoid
	///         opening and closing the required dylib handle more than once.
	///
	/// - Parameter url: The URL to find the original URL for.
	/// - Returns: The non-translocated, original URL or `url`.
	/// - Throws: A ``DynamicLoading.Error`` or a ``DynamicLoading.Translocation.Error`` describing the failure,
	///           or in case of a previous crash a ``CrashLoopPrevention.Error``.
	static func nonTranslocatedURL(ofURL url: URL) throws -> URL {
		try CrashLoopPrevention.execute(withIdentifier: CrashLoopPreventionIdentifier.nonTranslocatedURL) {
			guard secTranslocateIsAvailable else { throw Error.appKitVersionIsTooLow }
			return try DynamicLoading.withHandleOfDylib(withPath: securityFrameworkURL.path) { handle in
				let secTranslocateIsTranslocatedURLFunction: SecTranslocateIsTranslocatedURL.Function = try SecTranslocateIsTranslocatedURL.load(withHandle: handle)

				var isTranslocated: Bool = false
				var error: CFError?
				guard secTranslocateIsTranslocatedURLFunction(url as CFURL, &isTranslocated, &error), error == nil else {
					guard let error else {
						throw Error.determiningURLTranslocationFailedWithUnknownError
					}
					throw Error.determiningURLTranslocationFailedWithError(error)
				}

				guard try isTranslocatedURL(url) else {
					return url
				}

				let secTranslocateCreateOriginalPathForURLFunction: SecTranslocateCreateOriginalPathForURL.Function = try SecTranslocateCreateOriginalPathForURL.load(withHandle: handle)

				guard let originalPathURL = secTranslocateCreateOriginalPathForURLFunction(url as CFURL, &error), error == nil else {
					guard let error else {
						throw Error.findingOriginalURLFailedWithUnknownError
					}
					throw Error.findingOriginalURLFailedWithError(error)
				}
				return originalPathURL as URL
			}
		}
	}

	/// Determines if the SecTranslocate API is available in the system's Security framework.
	///
	/// - Note: A check against `NSAppKitVersion.current >= NSAppKitVersion.macOS10_12` crashes
	///         an Xcode 15.4 build on macOS 13.4 with a dyld linking error because of an unresolved
	///         `NSAppKitVersion` symbol. (#1334) This code now checks the macOS version instead.
	private static var secTranslocateIsAvailable: Bool {
		if #available(macOS 10.12, *) {
			return true
		} else {
			return false
		}
	}
}

extension DynamicLoading.AppTranslocation {
	/// Errors that can occur when dynamically loading translocation functions.
	enum Error {
		case appKitVersionIsTooLow
		case determiningURLTranslocationFailedWithError(Swift.Error)
		case determiningURLTranslocationFailedWithUnknownError
		case findingOriginalURLFailedWithError(Swift.Error)
		case findingOriginalURLFailedWithUnknownError
	}
}

extension DynamicLoading.AppTranslocation.Error: BaseErrorWithAssociatedValues {
	static let domain: String = String(describing: Self.self)

	var errorMessage: String {
		switch self {
		case .appKitVersionIsTooLow:
			String(localized: "App Kit version is too low: \(NSAppKitVersion.current.rawValue)")
		case let .determiningURLTranslocationFailedWithError(error):
			String(localized: "Determining URL translocation failed with error: \(error.localizedDescription)")
		case .determiningURLTranslocationFailedWithUnknownError:
			String(localized: "Determining URL translocation failed with an unknown error.")
		case let .findingOriginalURLFailedWithError(error):
			String(localized: "Finding original URL failed with error: \(error.localizedDescription)")
		case .findingOriginalURLFailedWithUnknownError:
			String(localized: "Finding original URL failed with an unknown error.")
		}
	}

	static let allCases: [DynamicLoading.AppTranslocation.Error] = [
		.appKitVersionIsTooLow,
		.determiningURLTranslocationFailedWithError(GenericError.bogus),
		.determiningURLTranslocationFailedWithUnknownError,
		.findingOriginalURLFailedWithError(GenericError.bogus),
		.findingOriginalURLFailedWithUnknownError,
	]
}

extension DynamicLoading.AppTranslocation {
	/// Identifiers to be used for crash loop prevention.
	///
	/// Since these identifiers get written out to user defaults
	/// and identify usage of private API, they are intentionally opaque.
	private enum CrashLoopPreventionIdentifier {
		static let isTranslocatedURL = "7D4D2A43-AE79-4DEF-B17C-E2C60D1034C1"
		static let nonTranslocatedURL = "C48353F9-5EFF-4150-A35E-C7C8AF7F84B5"
	}

	/// The standard file path on macOS systems to the `Security` framework.
	private static var securityFrameworkURL: URL {
		get throws {
			try FileManager.SystemFramework.urlForFramework(withName: "Security")
		}
	}

	private enum SecTranslocateIsTranslocatedURL: DynamicFunctionLoader {
		typealias T = Function

		/// The ``SecTranslocateIsTranslocatedURL`` function pointer as a Swift closure with C calling convention, ported from
		/// `Boolean (*SecTranslocateIsTranslocatedURL)(CFURLRef path, bool *isTranslocated, CFErrorRef * __nullable error);`.
		typealias Function = @convention(c) (CFURL, UnsafeMutablePointer<Bool>, UnsafeMutablePointer<CFError?>) -> Bool

		/// The name of the ``SecTranslocateIsTranslocatedURL`` function.
		static let functionName: String = "SecTranslocateIsTranslocatedURL"
	}

	private enum SecTranslocateCreateOriginalPathForURL: DynamicFunctionLoader {
		typealias T = Function

		/// The ``SecTranslocateCreateOriginalPathForURL`` function pointer as a Swift closure with C calling convention, ported from
		/// `CFURLRef __nullable (*SecTranslocateCreateOriginalPathForURL)(CFURLRef translocatedPath, CFErrorRef * __nullable error);`.
		typealias Function = @convention(c) (CFURL, UnsafeMutablePointer<CFError?>) -> CFURL?

		/// The name of the ``SecTranslocateCreateOriginalPathForURL`` function.
		static let functionName: String = "SecTranslocateCreateOriginalPathForURL"
	}
}
