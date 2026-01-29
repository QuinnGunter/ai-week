//
//  LogFilePackerTests.swift
//  mmhmm-Tests
//
//  Created by Beni Federer on 27.03.24.
//

import Testing
import XCTest

import Common

import Zip

final class LogFilePackerTests: XCTestCase {
	fileprivate static let temporaryFileName: String = "LogsArchive.zip"
	private static let temporaryLogFileNameA: String = "ValuableInformationA.log"
	private static let temporaryLogFileNameB: String = "ValuableInformationB.log"
	private var archiveDirectoryURL: URL!
	private var archiveURL: URL!
	private var testLogFilesInput: LogFilePacker.Inputs.TestLogFiles!

	override func setUpWithError() throws {
		archiveDirectoryURL = try FileManager.default.createGloballyUniqueSubdirectoryInTemporaryDirectory()
		archiveURL = archiveDirectoryURL.appendingPathComponent(Self.temporaryFileName, isDirectory: false)
		let testLogFiles: [URL] = try Self.writeTestFiles(toDirectoryWithURL: archiveDirectoryURL)
		testLogFilesInput = LogFilePacker.Inputs.TestLogFiles(inputURLs: testLogFiles)
	}

	override func tearDownWithError() throws {
		try? FileManager.default.removeItem(at: archiveDirectoryURL)
	}

	func testCreateArchiveProducesArchiveFile() async throws {
		try await LogFilePacker.testCreateArchive(atURL: archiveURL, inputs: [testLogFilesInput])
		var archiveURLIsDirectory: ObjCBool = false
		XCTAssertTrue(FileManager.default.fileExists(atPath: archiveURL.path, isDirectory: &archiveURLIsDirectory))
		XCTAssertFalse(archiveURLIsDirectory.boolValue)
	}

	func testCreateArchiveOutputUnzipsWithoutError() async throws {
		try await LogFilePacker.testCreateArchive(atURL: archiveURL, inputs: [testLogFilesInput])
		XCTAssertNoThrow(try Zip.unzipFile(archiveURL, destination: archiveDirectoryURL, overwrite: true, password: nil))
	}
}

extension LogFilePackerTests {
	fileprivate static func writeTestFiles(toDirectoryWithURL url: URL) throws -> [URL] {
		let logFileAURL: URL = url.appendingPathComponent(Self.temporaryLogFileNameA, isDirectory: false)
		let logFileBURL: URL = url.appendingPathComponent(Self.temporaryLogFileNameB, isDirectory: false)
		try Data("Log File A content".utf8).write(to: logFileAURL)
		try Data("Log File B content".utf8).write(to: logFileBURL)
		let testLogFiles: [URL] = [
			logFileAURL,
			logFileBURL,
		]

		return testLogFiles
	}
}

@Suite("LogFilePackerSwiftTests", .serialized)
final class LogFilePackerSwiftTests {
	private let archiveDirectoryURL: URL
	private let archiveURL: URL
	private var testLogFilesInput: LogFilePacker.Inputs.TestLogFiles!

	init() throws {
		archiveDirectoryURL = try FileManager.default.createGloballyUniqueSubdirectoryInTemporaryDirectory()
		archiveURL = archiveDirectoryURL.appendingPathComponent(LogFilePackerTests.temporaryFileName, isDirectory: false)
		let testLogFiles: [URL] = try LogFilePackerTests.writeTestFiles(toDirectoryWithURL: archiveDirectoryURL)
		testLogFilesInput = LogFilePacker.Inputs.TestLogFiles(inputURLs: testLogFiles)
	}

	@Test("Test archive creation with existent files")
	func createArchive() async throws {
		try await LogFilePacker.testCreateArchive(atURL: archiveURL, inputs: [testLogFilesInput])
	}

	@Test("Test archive creation with throwing input")
	func createArchiveWithThrowingInput() async throws {
		let inputs: [LogFilePackerInput] = [LogFilePacker.Inputs.ThrowingInput(), testLogFilesInput]
		try await LogFilePacker.testCreateArchive(atURL: archiveURL, inputs: inputs)
	}

	@Test("Test archive creation with partially inexistent files")
	func createArchiveWithPartiallyInexistentFiles() async throws {
		let inputs: [LogFilePackerInput] = [LogFilePacker.Inputs.InexistentLogFiles(), testLogFilesInput]
		await #expect("Zip must throw an error.", performing: {
			try await LogFilePacker.testCreateArchive(atURL: self.archiveURL, inputs: inputs)
		}, throws: { _ in
			true
		})
	}
}

extension LogFilePacker.Inputs {
	struct TestLogFiles: LogFilePackerInput {
		let inputURLs: [URL]

		func generateInput() throws -> [URL] {
			inputURLs
		}
	}

	struct InexistentLogFiles: LogFilePackerInput {
		func generateInput() throws -> [URL] {
			[URL(fileURLWithPath: "/foo/bar/baz.log")]
		}
	}

	struct ThrowingInput: LogFilePackerInput {
		func generateInput() throws -> [URL] {
			throw CocoaError(.fileNoSuchFile)
		}
	}

	static let defaults: [LogFilePackerInput] = []
}
