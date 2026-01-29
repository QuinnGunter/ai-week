//
//  Encodable+JSONString.swift
//  mmhmm
//
//  Created by Beni Federer on 12.06.24.
//

import Foundation

import Common

extension Encodable {
	var jsonString: String {
		get throws {
			let jsonData = try JSONEncoder().encode(self)
			guard let jsonString = String(data: jsonData, encoding: .utf8) else {
				throw EncodableExtension.JSONStringError.encodableToJSON
			}
			return jsonString
		}
	}
}

enum EncodableExtension {
	enum JSONStringError: Int {
		case encodableToJSON
	}
}

extension EncodableExtension.JSONStringError: BaseError {
	static let domain: String = String(describing: Self.self)

	var errorMessage: String {
		switch self {
		case .encodableToJSON: return "Could not convert data to string for JSON encoding."
		}
	}
}
