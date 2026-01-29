//
//  FileManager+Extensions.swift
//  Common
//
//  Created by Beni Federer on 27.03.24.
//

import Foundation

extension FileManager {
	/// Creates a globally unique subdirectory within the temporary directory.
	///
	/// - Returns: A URL representing the created directory.
	/// - Throws: An error describing the failure creating the directory.
	public func createGloballyUniqueSubdirectoryInTemporaryDirectory() throws -> URL {
		let globallyUniqueTemporaryURL: URL = globallyUniqueSubdirectoryInTemporaryDirectoryURL
		try createDirectory(at: globallyUniqueTemporaryURL, withIntermediateDirectories: true)
		return globallyUniqueTemporaryURL
	}
}

extension FileManager {
	/// A URL representing a subdirectory within the temporary directory.
	///
	/// The subdirectory is named to represent the calling process, prefixed
	/// by a UUID that allows uniquely identifying the URL.
	private var globallyUniqueSubdirectoryInTemporaryDirectoryURL: URL {
		temporaryDirectory
			.appendingPathComponent(
				"\(ProcessInfo().globallyUniqueString)-\(ProcessInfo().processName)",
				isDirectory: true
			)
	}
}
