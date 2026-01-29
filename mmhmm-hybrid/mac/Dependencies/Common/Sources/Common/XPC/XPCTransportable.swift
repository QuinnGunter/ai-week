//
//  XPCTransportable.swift
//  Common
//
//  Created by Beni Federer on 22.05.25.
//

import Foundation

public protocol XPCTransportable {
	associatedtype XPCTransportType: NSSecureCoding

	init(xpcTransportValue: XPCTransportType) throws
	var xpcTransportValue: XPCTransportType { get throws }
}
