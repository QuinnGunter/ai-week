//
//  XPCBaseProtocol.swift
//  Common
//
//  Created by Beni Federer on 19.05.25.
//

import Foundation

@objc public protocol XPCBaseProtocol {
	func ping(with reply: @escaping () -> Void)
}
