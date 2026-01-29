//
//  NSApplication+RelaunchMoved.swift
//  AppBundleMover
//
//  Created by Beni Federer on 04.06.24.
//

import AppKit

import Common

extension NSApplication {
	/// Moves this app's bundle to the user-writable Applications folder.
	///
	/// This method prompts the user for file permissions if necessary, but
	/// automatically replaces pre-existing bundles at the same location.
	func relaunchAfterMovingToApplicationsFolder() throws {
		guard
			let applicationsFolder: URL = FileManager
				.default
				.urls(for: .applicationDirectory, in: .localDomainMask)
				.first
		else {
			throw MoveError.failedRetrievingApplicationsFolderURL
		}

		try NSApp.relaunchMovedToFolder(withFileURL: applicationsFolder)
	}

	/// Moves this app's bundle to the folder specified by the given URL
	/// and relaunches it from the bundle's new location.
	///
	/// This method prompts the user for file permissions if necessary, but
	/// automatically replaces pre-existing bundles at the same location.
	///
	/// - Parameter url: The file system location of the folder to move to.
	func relaunchMovedToFolder(withFileURL url: URL) throws {
		let moveToURL: URL = if FileManager.default.isWritableFile(atPath: url.path(percentEncoded: false)) {
			// The user running this app has admin privileges.
			try Bundle.main.moveToFolder(withFileURL: url)
		} else {
			// The user running this app needs to authenticate as an admin.
			try Bundle.main.moveToFolderAskingForPermission(withFileURL: url)
		}
		try terminateAndLaunchApp(atURL: moveToURL)
	}

	/// Terminates this app and launches the app at the given URL.
	///
	/// Call this method to relaunch this app at a different file system location,
	/// ensuring the relaunch only occurs after the app has closed.
	///
	/// - Parameter url: The file system location of the bundle containing the app to launch.
	func terminateAndLaunchApp(atURL url: URL) throws {
		let pid: pid_t = ProcessInfo.processInfo.processIdentifier
		let script: String = "(while /bin/kill -0 \(pid) >&/dev/null; do /bin/sleep 0.1; done; /usr/bin/open '\(url.path(percentEncoded: false))') &"
		let shellBinaryURL: URL = URL(fileURLWithPath: "/bin/sh")
		try Process.run(shellBinaryURL, arguments: ["-c", script])

		NSApp.terminate(self)
	}

	/// Relaunches this app from its current location.
	func relaunch() throws {
		try terminateAndLaunchApp(atURL: Bundle.main.bundleURL)
	}
}

extension NSApplication {
	enum MoveError: Int {
		case failedRetrievingApplicationsFolderURL
	}
}

extension NSApplication.MoveError: BaseError {
	static let domain: String = String(describing: Self.self)

	var errorMessage: String {
		switch self {
		case .failedRetrievingApplicationsFolderURL: String(localized: "Failed retrieving Applications folder URL.")
		}
	}
}

// MARK: - 10.13+ API Compatibility

extension NSApplication {
	@available(macOS, introduced: 10.10, deprecated: 14.0)
	func activate() {
		activate(ignoringOtherApps: true)
	}
}
