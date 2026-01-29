//
//  WebApp.WebAppType+XPCTransportable.swift
//  mmhmm
//
//  Created by Beni Federer on 22.05.25.
//

import Foundation

import Common

extension WebApp.WebAppType: XPCTransportable {
	typealias XPCTransportType = NSString

	init(xpcTransportValue: NSString) throws {
		guard let decodedValue = Self(rawValue: xpcTransportValue as String) else {
			throw DecodingError.dataCorrupted(
				DecodingError.Context(
					codingPath: [],
					debugDescription: "Invalid WebAppType value"
				)
			)
		}
		self = decodedValue
	}

	var xpcTransportValue: NSString {
		get throws {
			rawValue as NSString
		}
	}
}
