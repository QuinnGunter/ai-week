//
//  StreamProtocols.swift
//  CameraExtension
//
//  Created by Beni Federer on 17.11.23.
//

import CoreMediaIO
import Foundation

protocol StreamSourceDelegate: AnyObject {
	func startStreamingSource()
	func stopStreamingSource()
	var streamLogger: StreamLogger { get }
}

protocol StreamSinkDelegate: AnyObject {
	func startStreamingSink(client: CMIOExtensionClient)
	func stopStreamingSink()
}
