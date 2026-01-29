//
//  FileManager+Quarantine.swift
//  mmhmm
//
//  Created by Beni Federer on 05.08.24.
//

import Foundation

extension FileManager {
	private static let quarantineXAttrName: String = "com.apple.quarantine"

	func unquarantineFile(withURL url: URL) throws {
		guard try url.hasXAttr(withName: Self.quarantineXAttrName) else { return }
		try url.removeXAttr(withName: Self.quarantineXAttrName)
	}
}
