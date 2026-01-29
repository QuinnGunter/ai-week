//
//  FileManager+SystemFrameworks.swift
//  mmhmm
//
//  Created by Beni Federer on 31.07.24.
//

import Foundation

import Common

extension FileManager {
	enum SystemFramework {}
}

extension FileManager.SystemFramework {
	/// The URL for the file system location of the system library.
	static var systemLibraryURL: URL? {
		FileManager.default.urls(for: .libraryDirectory, in: .systemDomainMask).first
	}

	/// Retrieves the URL of a system framework with the specified name.
	///
	/// The file system location of a pre-installed system framework usually
	/// adheres to the pattern `/System/Library/Frameworks/<name>.framework/<name>`.
	///
	/// - Parameter name: The name of the system framework to find the URL for.
	/// - Returns: The URL for the system framework.
	/// - Throws: A `FileManager.SystemFrameworks.Error` describing the failure.
	static func urlForFramework(withName name: String) throws -> URL {
		guard let systemLibraryURL else { throw Error.failedGettingSystemLibraryURL }
		let expectedSecurityFrameworkURL: URL = systemLibraryURL.appending(components: "Frameworks", "\(name).framework", name)
		var relationship: FileManager.URLRelationship = .other
		try FileManager.default.getRelationship(&relationship, ofDirectoryAt: systemLibraryURL, toItemAt: expectedSecurityFrameworkURL)
		guard relationship == .contains else { throw Error.frameworkNotFoundAtExpectedLocation }
		return expectedSecurityFrameworkURL
	}
}

extension FileManager.SystemFramework {
	enum Error: Int {
		case failedGettingSystemLibraryURL
		case frameworkNotFoundAtExpectedLocation
	}
}

extension FileManager.SystemFramework.Error: BaseError {
	static let domain: String = String(describing: Self.self)

	var errorMessage: String {
		switch self {
		case .failedGettingSystemLibraryURL:
			String(localized: "Failed getting system library URL.")
		case .frameworkNotFoundAtExpectedLocation:
			String(localized: "Framework is not at expected location.")
		}
	}
}
