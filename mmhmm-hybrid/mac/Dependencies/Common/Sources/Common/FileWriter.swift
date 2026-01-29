//
//  FileWriter.swift
//  Common
//
//  Created by Beni Federer on 02.09.24.
//

import Foundation
import RegexBuilder

/// A simple file writer.
///
/// * Opens a file handle on instantiation and closes it on deinitialization.
/// * Writes log messages, strings, and raw data.
/// * Supports file rotation.
public actor FileWriter {
	private static let separator: String = "-------------------------------"

	/// A formatter producing RFC3339-like UTC date strings like `2024-09-02 16:08:47:173`.
	private lazy var dateFormatter: DateFormatter = {
		let formatter = DateFormatter()
		formatter.locale = Locale(identifier: "en_US_POSIX")
		formatter.dateFormat = "yyyy-MM-dd HH:mm:ss:SSS"
		formatter.timeZone = TimeZone(secondsFromGMT: 0)
		return formatter
	}()

	/// The URL of the file being written to.
	private let url: URL

	/// The handle to the file being written to.
	private var fileHandle: FileHandle

	/// The statistics of the file being written to.
	private let fileStatistics: FileStatistics

	/// The configuration specifying how and when files are rotated.
	private let rotationConfiguration: RotationConfiguration

	/// Creates a writer for the file at the specified URL.
	///
	/// A default file rotation is specified, but customizable.
	/// Rotated file names receive an infix substring representing
	/// date and time of the rotation like
	/// `<fileName>.2024-12-19-13-31-26-428.<fileExtension>`.
	///
	/// - Parameters:
	///   - url: The file URL to write to.
	///   - rotationConfiguration: The configuration describing how
	///                            files get rotated.
	public init(url: URL, rotationConfiguration: RotationConfiguration = .default) throws {
		do {
			// Attempt to write to a file, creating it in the process.
			try Data().write(to: url, options: .withoutOverwriting)
		} catch let error as NSError where error.code == 516 {
			// The file exists, do nothing.
		}

		fileHandle = try FileHandle(forWritingTo: url)

		try fileHandle.seekToEnd()

		fileStatistics = try FileStatistics(url: url)
		self.url = url
		self.rotationConfiguration = rotationConfiguration
	}

	/// Closes the file handle.
	deinit {
		do {
			try fileHandle.close()
		} catch {
			assertionFailure("Failed closing file: \(error)")
		}
	}

	/// Writes the log message ``separator`` to the file.
	public func writeLogMessageSeparator() throws {
		try write(logMessage: Self.separator)
	}

	/// Writes a message in log format to the file.
	///
	/// The written log message is composed of the
	/// following elements, in the given order:
	///
	/// * a timestamp representing the time of writing
	/// * a space character
	/// * the passed in string
	/// * a newline character
	///
	/// - Parameter logMessage: The message to write as a log line.
	public func write(logMessage: String) throws {
		let dateString = dateFormatter.string(from: .now)
		let logLine: String = dateString + " " + logMessage + "\n"
		try write(string: logLine)
	}

	/// Writes a string to the file.
	///
	/// - Parameter string: The string to write.
	public func write(string: String) throws {
		let lineData = Data(string.utf8)
		try write(data: lineData)
	}

	/// Writes data to the file.
	///
	/// - Parameter data: The date to write.
	public func write(data: Data) throws {
		try fileHandle.write(contentsOf: data)

		guard try fileSizeIndicatesRotation else { return }
		try rotateFile()
	}
}

extension FileWriter {
	/// All files within the same directory as the file pointed to by `url`,
	/// sorted by creation date from oldest to newest.
	public var rotatedFiles: [URL] {
		get throws {
			let fileName: String = url
				.deletingPathExtension()
				.lastPathComponent
			let fileExtension: String = url
				.pathExtension

			// Matches strings like "<fileName>.2024-12-19-13-31-26-428.<fileExtension>"
			let regex = Regex {
				fileName
				One(".")
				/\d{4}-\d{2}-\d{2}-\d{2}-\d{2}-\d{2}-\d{3}/
				One(".")
				fileExtension
			}

			return try FileManager
				.default
				.contentsOfDirectory(at: url.deletingLastPathComponent(),
									 includingPropertiesForKeys: [.creationDateKey],
									 options: .skipsHiddenFiles)
				.filter { $0.lastPathComponent.wholeMatch(of: regex) != nil }
				.sorted(by: { try $0.creationDate ?? .now < $1.creationDate ?? .now })
		}
	}

	private var fileSizeIndicatesRotation: Bool {
		get throws {
			let sizeInMebibyte: Double = try fileStatistics.info.sizeInMebibyte
			// swiftformat:disable indent
			return rotationConfiguration.maximumFileSizeInMebibyte > Double.ulpOfOne &&
			sizeInMebibyte >= rotationConfiguration.maximumFileSizeInMebibyte
			// swiftformat:enable indent
		}
	}

	private func rotateFile() throws {
		func recreateWriteFile() throws {
			try fileHandle.close()
			// Remove and re-create to get a file with a new creation timestamp.
			try FileManager
				.default
				.removeItem(at: url)
			try Data()
				.write(to: url)
			fileHandle = try FileHandle(forWritingTo: url)
		}

		guard rotationConfiguration.maximumFileCount > 0 else {
			// No rotation, just clear the file contents.
			try recreateWriteFile()
			return
		}

		let rotationDateSubstring: String = dateFormatter
			.string(from: .now)
			.replacingOccurrences(of: " ", with: "-")
			.replacingOccurrences(of: ":", with: "-")
		let rotatedFileURL: URL = url
			.deletingPathExtension()
			.appendingPathExtension(rotationDateSubstring)
			.appendingPathExtension(url.pathExtension)

		try FileManager
			.default
			.copyItem(at: url,
					  to: rotatedFileURL)
		try recreateWriteFile()

		let rotatedFiles: [URL] = try rotatedFiles

		guard
			rotatedFiles.count > rotationConfiguration.maximumFileCount,
			let oldestFile: URL = rotatedFiles.first
		else {
			return
		}

		try FileManager.default.removeItem(at: oldestFile)
	}
}

extension FileWriter {
	public struct RotationConfiguration {
		/// The maximum number of files to rotate out.
		///
		/// If the number of rotated files exceeds
		/// this count, the oldest file is removed.
		///
		/// A count of less than 1 indicates that no
		/// file rotation occurs and the write file
		/// will be cleared every time its file size
		/// exceeds `maximumFileSizeInMebibyte`.
		public let maximumFileCount: Int

		/// The maximum size per rotated file in
		/// mebibytes.
		///
		/// If the size of the write file exceeds this
		/// size, it is rotated out and a new write
		/// file is created.
		///
		/// A size of zero or less indicates that
		/// the file size is unbounded and can grow
		/// without limit, meaning the initial write
		/// file will never be rotated out.
		public let maximumFileSizeInMebibyte: Double

		/// The default rotation configuration, which
		/// supports a maximum of 5 rotated files
		/// at a maximum file size of 1 mebibyte each.
		public static var `default`: RotationConfiguration {
			.init(maximumFileCount: 5, maximumFileSizeInMebibyte: 1)
		}
	}
}
