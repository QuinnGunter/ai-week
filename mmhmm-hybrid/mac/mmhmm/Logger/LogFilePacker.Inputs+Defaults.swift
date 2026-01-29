//
//  LogFilePacker.Inputs+Defaults.swift
//  mmhmm
//
//  Created by Beni Federer on 20.01.25.
//

import Common

extension LogFilePacker.Inputs {
	static var defaults: [LogFilePackerInput] {
		[
			StreamDeckLogFiles(),
			HybridAppLogFiles(),
			MenuBarAppLogFiles(),
			SystemReportFile(),
		]
	}

	struct StreamDeckLogFiles: LogFilePackerInput {
		func generateInput() async throws -> [URL] {
			let fileManager: FileManager = .default
			guard let libraryDirectoryURL: URL = fileManager.urls(for: .libraryDirectory, in: .userDomainMask).first else {
				throw LogFilePacker.Error.failedGettingUserAppSupportDirectoryURL
			}

			let streamDeckLogsDirectoryURL: URL = libraryDirectoryURL
				.appendingPathComponent("Logs/ElgatoStreamDeck", isDirectory: true)
			let streamDeckLogURLs: [URL] = try fileManager
				.contentsOfDirectory(at: streamDeckLogsDirectoryURL,
									 includingPropertiesForKeys: nil,
									 options: .skipsHiddenFiles)
				.filter { (url: URL) in
					url
						.pathComponents
						.contains(where: { (pathComponent: String) in
							// swiftformat:disable indent
							pathComponent.hasPrefix("app.mmhmm") ||
							pathComponent.hasPrefix("app.airtime") ||
							pathComponent.hasPrefix("com.airtime") ||
							pathComponent.hasPrefix("StreamDeck")
							// swiftformat:enable indent
						})
				}

			return streamDeckLogURLs
		}
	}

	struct HybridAppLogFiles: LogFilePackerInput {
		func generateInput() async throws -> [URL] {
			let logFileURLs: [URL] = [
				URL.nativeAppLogFilePath,
				URL.webAppLogFilePath,
			]

			let rotatedFileURLs: [URL] = try await Logger.fileWriter.rotatedFiles

			return logFileURLs + rotatedFileURLs
		}
	}

	struct MenuBarAppLogFiles: LogFilePackerInput {
		func generateInput() async throws -> [URL] {
			if FileManager.default.fileExists(atPath: URL.menuBarAppLogFilePath.path(percentEncoded: false)) {
				[URL.menuBarAppLogFilePath]
			} else {
				[]
			}
		}
	}

	struct SystemReportFile: LogFilePackerInput {
		func generateInput() async throws -> [URL] {
			let temporaryDirectory: URL = try FileManager
				.default
				.createGloballyUniqueSubdirectoryInTemporaryDirectory()
			let systemReport = try await SystemReporter
				.generateReport()
			let systemReportFileURL: URL = temporaryDirectory
				.appendingPathComponent("SystemReport.txt",
										isDirectory: false)

			guard let data = systemReport.data(using: .utf8) else {
				throw Error.failedToCreateDataRepresentation
			}

			try data
				.write(to: systemReportFileURL)

			return [systemReportFileURL]
		}
	}
}

extension LogFilePacker.Inputs.SystemReportFile {
	enum Error: Int {
		case failedToCreateDataRepresentation
	}
}

extension LogFilePacker.Inputs.SystemReportFile.Error: BaseError {
	static let domain: String = String(describing: Self.self)

	var errorMessage: String {
		switch self {
		case .failedToCreateDataRepresentation: "Failed to create data representation."
		}
	}
}
