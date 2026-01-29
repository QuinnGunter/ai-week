//
//  AirtimeMenuBarProxy.swift
//  Airtime Menu
//
//  Created by Beni Federer on 12.05.25.
//

import Foundation

final class AirtimeMenuBarProxy: NSObject, RemoteControllingXPCProtocol {
	weak var delegate: RemoteControlling?

	func openSettings() {
		delegate?.openSettings()
	}

	func version() async -> String {
		await delegate?.version() ?? "Unknown"
	}

	func ping(with reply: @escaping () -> Void) {
		Logger.logMessage("Responding to ping.", level: .info)
		reply()
	}

	func update(with state: RemoteControlState.XPCTransportType) {
		delegate?.update(with: state)
	}
}
