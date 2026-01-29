//
//  Bundle+MoveToURL.swift
//  AppBundleMover
//
//  Created by Beni Federer on 04.06.24.
//

import AppKit

import Common

extension Bundle {
	/// `true` if bundle is located in `/Applications`, `false` otherwise.
	var locatedInApplicationsFolder: Bool {
		get throws {
			var relationship: FileManager.URLRelationship = .other
			try FileManager.default.getRelationship(&relationship,
													of: .applicationDirectory,
													in: .localDomainMask,
													toItemAt: bundleURL)
			return relationship == .contains
		}
	}

	/// Retrieves the copy of the bundle in the Applications folder, if it exists at that location.
	///
	/// - Returns: The bundle or `nil`, if this app's bundle does not exist in the Applications folder.
	var appBundleInApplicationsFolder: Bundle? {
		get throws {
			guard
				let applicationsFolder: URL = FileManager
					.default
					.urls(for: .applicationDirectory, in: .localDomainMask)
					.first
			else {
				throw MoveError.failedRetrievingApplicationsFolderURL
			}

			let bundleInApplicationsFolderURL: URL = applicationsFolder.appendingPathComponent(bundleURL.lastPathComponent, conformingTo: .directory)
			return Bundle(url: bundleInApplicationsFolderURL)
		}
	}

	/// Moves a bundle to a folder with the given URL.
	///
	/// If the source location is not writable, e.g. because it is on a mounted
	/// read-only disk image, the move operation falls back to a copy operation.
	///
	/// To ensure the bundle is moved from its original location on disk and
	/// runs non-translocated upon relaunch, the bundle's non-translocated URL
	/// is acquired and the bundle is removed from quarantine before moving it.
	///
	/// - Warning: An existing target folder gets automatically replaced without
	///            alerting or informing the user. Callers must ensure that overwriting
	///            was sanctioned by the user beforehand.
	///
	/// - Important: This method will only succeed if the URL is writable
	///              within the current process environment and for the
	///              effective user.
	///
	/// - Parameter url: The file system location to move to.
	/// - Returns: A URL consisting of `url` appended by the moved bundle name.
	/// - Throws: A `Bundle.MoveError` detailing the failure.
	func moveToFolder(withFileURL url: URL) throws -> URL {
		let moveFromURL: URL = try nonTranslocatedBundleURL
		try FileManager.default.unquarantineFile(withURL: moveFromURL)

		let moveToURL: URL = url.appendingPathComponent(moveFromURL.lastPathComponent, conformingTo: .directory)
		do {
			try FileManager.default.removeItem(at: moveToURL)
		} catch let error as NSError where error.domain == NSCocoaErrorDomain {
			// Throw the error unless it is a file not found error.
			guard
				let underlyingError: NSError = error.underlyingErrors.first as? NSError,
				underlyingError.domain == NSPOSIXErrorDomain,
				underlyingError.code == POSIXError.ENOENT.rawValue
			else {
				throw error
			}
		}

		if FileManager.default.isWritableFile(atPath: moveFromURL.path(percentEncoded: false)) {
			try FileManager.default.moveItem(at: moveFromURL, to: moveToURL)
		} else {
			try FileManager.default.copyItem(at: moveFromURL, to: moveToURL)
		}

		return moveToURL
	}

	/// Moves a bundle to a folder with the given URL, asking for admin credentials.
	///
	/// To ensure the bundle is moved from its original location on disk and
	/// runs non-translocated upon relaunch, the bundle's non-translocated URL
	/// is acquired and the bundle is removed from quarantine before moving it.
	///
	/// This method runs an AppleScript that executes a shell command. AppleScript
	/// is currently the only non-deprecated solution allowing ad-hoc prompting
	/// for admin privileges.
	///
	/// - Warning: An existing target folder gets automatically replaced without
	///            alerting or informing the user. Callers must ensure that overwriting
	///            was sanctioned by the user beforehand.
	///
	/// - Important: The admin credentials dialog required to successfully return from
	///              this method is only displayed if called from a non-sandboxed
	///              app environment. Sandboxed apps don't allow unchecked privilege
	///              escalation as required by the AppleScript being run, and
	///              automatically fail admin authentication.
	///
	/// - Parameter url: The file system location to move to.
	/// - Returns: A URL consisting of `url` appended by the moved bundle name.
	/// - Throws: A `Bundle.MoveError` detailing the failure.
	///           If the user canceled admin authentication, `.userCanceled` is thrown.
	///           If the existing target folder could not be deleted, `.directoryNotEmpty` is thrown.
	func moveToFolderAskingForPermission(withFileURL url: URL) throws -> URL {
		let moveFromURL: URL = try nonTranslocatedBundleURL
		try FileManager.default.unquarantineFile(withURL: moveFromURL)

		let (shellScript, moveToURL): (String, URL) = try Self.makeShellScriptMovingBundle(withURL: moveFromURL, toFolderWithURL: url)
		let appName: String = NSRunningApplication.current.localizedName ?? "This app"
		let alertMessage: String = String(localized: "\(appName) wants to be moved to the Applications folder.")
		let osaScript: String = "do shell script \"\(shellScript)\" with prompt \"\(alertMessage)\" with administrator privileges"

		guard let scriptObject = NSAppleScript(source: osaScript) else {
			throw MoveError.failedCreatingAppleScript
		}

		var errorDictionary: NSDictionary?
		let output: NSAppleEventDescriptor = scriptObject.executeAndReturnError(&errorDictionary)

		guard output.isInitialized else {
			guard let errorDictionary else {
				throw MoveError.failedRunningAppleScriptWithoutError
			}

			let errorNumber: Int = if let errorNumber = errorDictionary[NSAppleScript.errorNumber] as? NSNumber {
				errorNumber.intValue
			} else {
				MoveError.ErrorNumber.unknown
			}

			guard errorNumber != MoveError.ErrorNumber.userCanceled else {
				throw MoveError.userCanceled
			}

			let errorMessage: String = errorDictionary[NSAppleScript.errorMessage] as? String ?? ""

			guard errorMessage.contains("Directory not empty") == false else {
				throw MoveError.directoryNotEmpty
			}

			let errorBriefMessage: String = errorDictionary[NSAppleScript.errorBriefMessage] as? String ?? ""

			throw MoveError.failedRunningAppleScript(errorNumber: errorNumber, errorMessage: errorMessage, errorBriefMessage: errorBriefMessage)
		}

		return moveToURL
	}

	/// Creates a shell script to be executed via AppleScript that moves a bundle to the provided folder URL.
	///
	/// If the source location is not writable, e.g. because it is on a mounted read-only disk image,
	/// the move operation falls back to a copy operation.
	///
	/// Paths are formatted to use the appropriate escape sequence for space characters.
	/// * The `#"..."#` raw string representation makes sure Swift ignores the contained special characters.
	/// * A first `\` is required to make AppleScript ignore the following `\` special character.
	/// * A second `\` is the only special character that the shell eventually parses.
	///
	/// - Warning: The shell script unconditionally removes a pre-existing bundle
	///            of the same name at the target location, ignoring any failures
	///            in doing so.
	///
	/// - Parameters:
	///   - fromURL: The URL of the bundle to move.
	///   - toURL: A file URL representing the target directory.
	/// - Returns: The shell script and a URL consisting of `toURL` appended by the moved bundle name.
	private static func makeShellScriptMovingBundle(withURL fromURL: URL, toFolderWithURL toURL: URL) throws -> (String, URL) {
		guard toURL.isFileURL, toURL.hasDirectoryPath else {
			throw MoveError.urlProvidedIsNoDirectoryFileURL
		}

		let sourcePath: String = fromURL
			.path(percentEncoded: false)
			.replacingOccurrences(of: " ", with: #"\\ "#)
		let destinationURL: URL = toURL
			.appendingPathComponent(fromURL.lastPathComponent, conformingTo: .directory)

		// Attempt to provide a failsafe to not let us accidentally
		// delete anything more than a mere app bundle.
		guard destinationURL.lastPathComponent.hasSuffix(".app") else {
			throw MoveError.notDeletingAnAppBundle
		}

		let destinationPath: String = destinationURL
			.path(percentEncoded: false)
			.replacingOccurrences(of: " ", with: #"\\ "#)

		let filePlacementOperation: String = if FileManager.default.isWritableFile(atPath: fromURL.path(percentEncoded: false)) {
			"mv -f \(sourcePath) \(destinationPath)"
		} else {
			"mkdir -p \(destinationPath) && cp -rf \(sourcePath) \(destinationPath)"
		}

		return (
			// WARNING: This deletes whatever is at `moveToPath` unconditionally!
			"""
			rm -rf \(destinationPath) &>/dev/null
			\(filePlacementOperation)
			""",
			destinationURL
		)
	}
}

extension Bundle {
	enum MoveError {
		case directoryNotEmpty
		case failedCreatingAppleScript
		case failedRetrievingApplicationsFolderURL
		case failedRunningAppleScript(errorNumber: Int, errorMessage: String, errorBriefMessage: String)
		case failedRunningAppleScriptWithoutError
		case notDeletingAnAppBundle
		case urlProvidedIsNoDirectoryFileURL
		case userCanceled
	}
}

extension Bundle.MoveError: BaseErrorWithAssociatedValues {
	static let domain: String = String(describing: Bundle.self)

	var errorMessage: String {
		switch self {
		case .directoryNotEmpty:
			String(localized: "Directory is not empty.")
		case .failedCreatingAppleScript:
			String(localized: "Failed creating AppleScript.")
		case .failedRetrievingApplicationsFolderURL:
			String(localized: "Failed retrieving applications folder URL.")
		case let .failedRunningAppleScript(errorNumber: errorNumber, errorMessage: errorMessage, errorBriefMessage: errorBriefMessage):
			String(localized: "Failed running AppleScript. \(errorBriefMessage), \(errorMessage) (\(errorNumber))")
		case .failedRunningAppleScriptWithoutError:
			String(localized: "Failed running AppleScript without error.")
		case .notDeletingAnAppBundle:
			String(localized: "Not deleting an app bundle.")
		case .urlProvidedIsNoDirectoryFileURL:
			String(localized: "URL provided is no directory file URL.")
		case .userCanceled:
			String(localized: "User canceled permissions dialog.")
		}
	}

	static let allCases: [Bundle.MoveError] = [
		.directoryNotEmpty,
		.failedCreatingAppleScript,
		.failedRetrievingApplicationsFolderURL,
		.failedRunningAppleScript(errorNumber: 0, errorMessage: "", errorBriefMessage: ""),
		.failedRunningAppleScriptWithoutError,
		.notDeletingAnAppBundle,
		.urlProvidedIsNoDirectoryFileURL,
		.userCanceled,
	]
}

extension Bundle.MoveError {
	enum ErrorNumber {
		static let unknown: Int = .max
		static let userCanceled: Int = -128
	}
}

extension NSAppleEventDescriptor {
	/// When Swift API like `executeAndReturnError` fails, it does not return a `nil` value,
	/// but an `NSAppleEventDescriptor` wrapping a `nil` pointer. This property replaces the
	/// direct check of the return value against a `nil` value, which is possible in ObjC.
	var isInitialized: Bool { aeDesc != nil }
}
