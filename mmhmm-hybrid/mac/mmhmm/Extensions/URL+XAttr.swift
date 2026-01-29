//
//  URL+XAttr.swift
//  mmhmm
//
//  Created by Beni Federer on 05.08.24.
//

import Foundation
import System

import Common

extension URL {
	func hasXAttr(withName name: String) throws -> Bool {
		guard isFileURL else { throw XAttr.Error.noFileURL(self) }
		guard var path: [CChar] = path.cString(using: .utf8) else { throw XAttr.Error.failedCreatingPath }
		guard var nameValue: [CChar] = name.cString(using: .utf8) else { throw XAttr.Error.failedCreatingName }

		let xAttrSize: ssize_t = getxattr(&path, &nameValue, nil, 0, 0, XATTR_NOFOLLOW)
		let errno = Errno(rawValue: errno)

		if xAttrSize >= 0 {
			return true
		} else if errno == .attributeNotFound {
			return false
		} else {
			throw XAttr.Error.failedWithErrno(code: errno.rawValue, message: errno.description)
		}
	}

	func removeXAttr(withName name: String) throws {
		guard isFileURL else { throw XAttr.Error.noFileURL(self) }
		guard var path: [CChar] = path.cString(using: .utf8) else { throw XAttr.Error.failedCreatingPath }
		guard var nameValue: [CChar] = name.cString(using: .utf8) else { throw XAttr.Error.failedCreatingName }

		guard removexattr(&path, &nameValue, XATTR_NOFOLLOW) == noErr else {
			let errno = Errno(rawValue: errno)
			throw XAttr.Error.failedWithErrno(code: errno.rawValue, message: errno.description)
		}
	}
}

extension URL {
	enum XAttr {
		enum Error: Swift.Error {
			case noFileURL(URL)
			case failedCreatingPath
			case failedCreatingName
			case failedWithErrno(code: Int32, message: String)
		}
	}
}

extension URL.XAttr.Error: BaseErrorWithAssociatedValues {
	static let domain: String = String(describing: Self.self)

	var errorMessage: String {
		switch self {
		case let .noFileURL(url):
			String(localized: "Not a file URL: \(url.absoluteString)")
		case .failedCreatingPath:
			String(localized: "Failed to create a path value.")
		case .failedCreatingName:
			String(localized: "Failed to create a name value.")
		case let .failedWithErrno(code, message):
			String(localized: "Failed with: \(message) (\(code))")
		}
	}

	static let allCases: [URL.XAttr.Error] = [
		.noFileURL(URL(fileURLWithPath: "")),
		.failedCreatingPath,
		.failedCreatingName,
		.failedWithErrno(code: 0, message: ""),
	]
}
