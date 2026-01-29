//
//  URL+Extensions.swift
//  Common
//
//  Created by Beni Federer on 20.12.24.
//

import Foundation
import UniformTypeIdentifiers

extension URL {
	public var creationDate: Date? {
		get throws {
			try resourceValues(forKeys: [.creationDateKey]).creationDate
		}
	}

	/// Replaces values for the passed query keys with "REDACTED".
	///
	/// - Parameter keys: The keys for which to redact associated values.
	///                   If empty, every query value is redacted.
	/// - Returns: The redacted URL or `nil`, if no redacted URL could be constructed.
	public func redactingQueryValues(for keys: Set<String> = []) -> URL? {
		guard
			var components = URLComponents(url: self, resolvingAgainstBaseURL: false),
			let items: [URLQueryItem] = components.queryItems,
			items.isEmpty == false
		else {
			// No or empty query
			return self
		}

		components.queryItems = components.redactedQueryItems(for: keys)

		return components.url
	}

	public var base64FileContent: String {
		get throws {
			if let fileUTType = UTType(filenameExtension: pathExtension),
			   UTType.textUTTypes.contains(fileUTType) {
				return try String(contentsOf: self, encoding: .utf8)
			}

			let base64String: String = try Data(contentsOf: self).base64EncodedString()

			guard Data(base64Encoded: base64String) != nil else {
				throw EncodingError.invalidValue(
					base64String,
					EncodingError.Context(
						codingPath: [],
						debugDescription: "Invalid base64 encoding"
					)
				)
			}

			return base64String
		}
	}

	public var utType: UTType? {
		UTType(filenameExtension: pathExtension)
	}

	public var mimeType: String? {
		utType?.preferredMIMEType
	}
}
