//
//  FileStatistics.swift
//  Common
//
//  Created by Beni Federer on 19.12.24.
//

import Foundation
import System

class FileStatistics {
	private(set) var path: [CChar]

	init(url: URL) throws {
		guard
			url.isFileURL,
			let path: [CChar] = url
				.path(percentEncoded: false)
				.cString(using: .utf8)
		else {
			throw Error.notAFileURL
		}
		self.path = path
	}

	var info: stat {
		get throws {
			var statStruct = stat()
			guard stat(&path, &statStruct) == noErr else {
				let errNo = Errno(rawValue: errno)
				throw Error.failedWithErrNo(errNo)
			}
			return statStruct
		}
	}
}

extension FileStatistics {
	enum Error: Swift.Error {
		case notAFileURL
		case failedWithErrNo(Errno)
	}
}

extension stat {
	var sizeInBytes: Int {
		Int(st_size)
	}

	/// File size in kibibyte, which is 1,024 bytes.
	var sizeInKibibyte: Double {
		guard sizeInBytes > 0 else { return 0 }
		return Double(sizeInBytes) / 1024
	}

	/// File size in mebibyte, which is 1,024 kibibyte.
	var sizeInMebibyte: Double {
		guard sizeInBytes > 0 else { return 0 }
		return sizeInKibibyte / 1024
	}
}
