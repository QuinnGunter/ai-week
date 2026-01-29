//
//  AppDelegate+URLHandlers.swift
//  mmhmm
//
//  Created by Beni Federer on 23.07.25.
//

import AppKit

// MARK: - File Drop Handling

extension AppDelegate {
	/// Maximum size for files dropped on the app icon.
	///
	/// The current implementation causes a crash if the total size of
	/// dropped files exceeds roughly 40 MB.
	private static let fileDropMaxSizeInBytes: UInt64 = 40 * 1024 * 1024

	/// Handle files dropped on the app icon, either while running
	/// or causing the app to launch.
	///
	/// "If your delegate implements this method, AppKit does not
	/// call the `application:openFile:` or `application:openFiles:` methods."
	func application(_ application: NSApplication, open urls: [URL]) {
		Logger.logMessage("\(#function) called with URLs: \(urls)", level: .debug)

		let totalSizeInBytes: UInt64 = urls.reduce(0) { sum, url in
			guard let size = try? url.resourceValues(forKeys: [.fileSizeKey]).fileSize else { return sum }
			return sum + UInt64(size)
		}

		guard totalSizeInBytes <= Self.fileDropMaxSizeInBytes else {
			Logger.logMessage("Total file size \(totalSizeInBytes) bytes exceeds maximum of \(Self.fileDropMaxSizeInBytes) bytes", level: .info)

			DispatchQueue.main.async {
				let alert = NSAlert()
				alert.messageText = "Files Too Large"
				alert.informativeText = "The total size of dropped files exceeds 40 MB. Please drag the files directly into the app window or try again with smaller files."
				alert.alertStyle = .warning
				alert.addButton(withTitle: "OK")
				alert.runModal()
			}

			application.reply(toOpenOrPrint: .failure)
			return
		}

		Logger.logMessage("Dropping \(urls.count) files with total size \(totalSizeInBytes)", level: .info)

		Task {
			do {
				try browser.drop(urls: urls)
			} catch {
				Logger.logError(error, messagePrefix: "Failed to drop URLs: \(urls)")
			}
		}

		application.reply(toOpenOrPrint: .success)
	}
}
