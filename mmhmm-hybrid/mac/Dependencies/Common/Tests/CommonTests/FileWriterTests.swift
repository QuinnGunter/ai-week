//
//  FileWriterTests.swift
//  Common
//
//  Created by Beni Federer on 20.12.24.
//

@testable import Common

import Foundation
import Testing

@Suite("FileWriter Tests")
final class FileWriterTests {
	let temporaryDirectory: URL = FileManager
		.default
		.temporaryDirectory
		.appending(path: UUID().uuidString,
				   directoryHint: .isDirectory)

	let writeFile: URL

	init() async throws {
		try FileManager
			.default
			.createDirectory(at: temporaryDirectory,
							 withIntermediateDirectories: true)
		writeFile = temporaryDirectory
			.appendingPathComponent("\(UUID().uuidString).txt")
	}

	deinit {
		try? FileManager
			.default
			.removeItem(at: temporaryDirectory)
	}

	@Test("Rotation when file size limit is reached")
	func rotationFileSize() async throws {
		let maximumFileCount: Int = 1
		let expectedFileCountAfterRotation: Int = maximumFileCount + 1

		let configuration = FileWriter.RotationConfiguration(maximumFileCount: maximumFileCount, maximumFileSizeInMebibyte: 1)
		let writer = try FileWriter(url: writeFile, rotationConfiguration: configuration)
		let data = Data(count: 1024 * 1024 + 1)
		try await writer.write(data: data)

		let fileCountAfterRotation: Int = try totalFiles.count
		#expect(fileCountAfterRotation == expectedFileCountAfterRotation, "Writing data exceeding maximum file size rotates files.")
	}

	@Test("Rotation when file count limit is reached")
	func rotationFileCount() async throws {
		let maximumFileCount: Int = 5
		let expectedFileCountAfterRotation: Int = maximumFileCount + 1
		let configuration = FileWriter.RotationConfiguration(maximumFileCount: maximumFileCount, maximumFileSizeInMebibyte: 1)
		let writer = try FileWriter(url: writeFile, rotationConfiguration: configuration)
		let data = Data(count: 1024 * 1024 + 1)

		let rotationInducingFileWriteCount: Int = maximumFileCount * 2
		for _ in 0..<rotationInducingFileWriteCount {
			try await writer.write(data: data)
			try await Task.sleep(for: .milliseconds(1))
		}

		let fileCountAfterRotation: Int = try totalFiles.count
		#expect(fileCountAfterRotation == expectedFileCountAfterRotation, "Writing data exceeding maximum file count limits total file count to maximum file count plus write file.")
	}
}

extension FileWriterTests {
	private var totalFiles: [URL] {
		get throws {
			try FileManager
				.default
				.contentsOfDirectory(at: temporaryDirectory, includingPropertiesForKeys: nil)
				.filter { $0.absoluteString.contains(writeFile.deletingPathExtension().lastPathComponent) }
		}
	}
}
