//
//  LogFilePacker.swift
//  mmhmm
//
//  Created by Beni Federer on 27.03.24.
//

import AppKit

import Zip

// MARK: - LogFilePacker

class LogFilePacker: NSObject {
	/// Prompts the user to select a directory to save an archive
	/// of relevant log files and a system report text file.
	///
	/// Opens the selected directory in Finder after successfully
	/// saving the log files.
	@MainActor static func promptUserToExportLogFiles() async {
		Logger.logMessage("Exporting log file archive.", level: .info)

		let panel = NSOpenPanel()
		panel.canChooseFiles = false
		panel.canChooseDirectories = true
		panel.canCreateDirectories = true
		panel.isAccessoryViewDisclosed = false
		let response: NSApplication.ModalResponse = await panel.begin()

		guard response == .OK, let url: URL = panel.url else {
			Logger.logMessage("Canceled log file archive creation.", level: .info)
			return
		}

		Task.detached(priority: .userInitiated) {
			do {
				_ = try await createLogFilesArchive(atURL: url)
				Logger.logMessage("Saved log file archive to \(url), opening in Finder.", level: .info)

				let openedInFinder: Bool = NSWorkspace.shared.open(url)
				if openedInFinder == false {
					Logger.logMessage("Failed opening log file archive location in Finder.", level: .error)
				}
			} catch {
				Logger.logError(error, messagePrefix: "Failed saving log files archive", level: .fault)
			}
		}
	}

	/// Copies an archive of relevant log files and a system report text file to the pasteboard.
	static func copyLogFilesArchiveToPasteboard() {
		Logger.logMessage("Copying log files.", level: .info)

		Task.detached(priority: .userInitiated) {
			NSPasteboard.general.clearContents()
			do {
				let temporaryDirectory: URL = FileManager.default.temporaryDirectory
				let logFilesArchive: URL = try await createLogFilesArchive(atURL: temporaryDirectory)
				Logger.logMessage("Created log file archive.", level: .info)
				let writeObjects: [NSURL] = [logFilesArchive as NSURL]
				NSPasteboard.general.writeObjects(writeObjects)
				Logger.logMessage("Copied log file archive to pasteboard.", level: .info)
			} catch {
				Logger.logError(error, messagePrefix: "Failed copying log files archive", level: .error)
			}
		}
	}

	/// Copies a system report as text to the pasteboard.
	static func copySystemReportToPasteboard() {
		Logger.logMessage("Copying system report.", level: .info)

		Task.detached(priority: .userInitiated) {
			NSPasteboard.general.clearContents()
			do {
				let systemReport: String = try await SystemReporter.generateReport()
				NSPasteboard.general.setString(systemReport, forType: .string)
				Logger.logMessage("Copied system report to pasteboard.", level: .info)
			} catch {
				Logger.logError(error, messagePrefix: "Failed copying system report", level: .error)
			}
		}
	}
}

extension LogFilePacker {
	/// Creates an archive of log files, including a system report.
	///
	/// - Parameter url: The URL to the directory where log files are collected into.
	/// - Returns: The URLs to the collected log files.
	private static func createLogFilesArchive(atURL url: URL) async throws -> URL {
		let timeIntervalSince1970: TimeInterval = Date().timeIntervalSince1970
		let archiveFileURL: URL = url.appendingPathComponent("AirtimeLogs.\(timeIntervalSince1970).zip", isDirectory: false)
		try await createArchive(atURL: archiveFileURL, inputs: LogFilePacker.Inputs.defaults)

		return archiveFileURL
	}

	/// Creates a zip archive from the given inputs.
	///
	/// - Parameters:
	///   - url: The URL of the zip archive to create.
	///   - inputs: The inputs to archive.
	private static func createArchive(atURL url: URL, inputs: [LogFilePackerInput]) async throws {
		let files: [URL] = try await withThrowingTaskGroup(of: [URL].self) { group in
			inputs.forEach { input in
				group.addTask {
					do {
						return try await input.generateInput()
					} catch {
						Logger.logError(error, messagePrefix: "Failed to generate input for \(input)", level: .error, targets: .uncheckedAll)
						return []
					}
				}
			}
			return try await group.reduce(into: [URL]()) { partialResult, urls in
				partialResult += urls
			}
		}

		guard files.isEmpty == false else {
			throw Error.noInputToArchive
		}

		Logger.logMessage("Archiving log files.", level: .info)

		try Zip.zipFiles(paths: files, zipFilePath: url, password: nil, progress: nil)
	}

	#if TEST
	static func testCreateArchive(atURL url: URL, inputs: [LogFilePackerInput]) async throws {
		try await createArchive(atURL: url, inputs: inputs)
	}
	#endif
}

extension LogFilePacker {
	enum Error: Swift.Error {
		case failedGettingUserAppSupportDirectoryURL
		case noInputToArchive
	}
}

// MARK: - LogFilePackerInput

protocol LogFilePackerInput: Sendable {
	func generateInput() async throws -> [URL]
}

extension LogFilePacker {
	enum Inputs {}
}
