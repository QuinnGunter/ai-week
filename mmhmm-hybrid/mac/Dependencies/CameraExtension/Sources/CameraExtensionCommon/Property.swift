//
//  Property.swift
//  CameraExtensionCommon
//
//  Created by Matthew Tonkin on 27/10/2022.
//

import CoreMediaIO
import Foundation

public enum Property: String {
	case streamingClients = "scpi"
	case log = "logg"
}

extension Property {
	public static let logMessagesSeparator: String = ">//<"
	public static let streamingClientsSeparator: String = ","

	public var name: String { rawValue }

	public var property: CMIOExtensionProperty {
		return CMIOExtensionProperty(rawValue: "4cc_\(name)_glob_0000")
	}

	public var selectorName: CMIOObjectPropertySelector {
		guard
			name.count == MemoryLayout<CMIOObjectPropertySelector>.size,
			let data: Data = name.data(using: .utf8, allowLossyConversion: false)
		else {
			return 0
		}

		return data.withUnsafeBytes {
			$0.load(as: CMIOObjectPropertySelector.self).byteSwapped
		}
	}
}
