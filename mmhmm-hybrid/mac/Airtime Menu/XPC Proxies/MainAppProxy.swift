//
//  MainAppProxy.swift
//  mmhmm
//
//  Created by Beni Federer on 22.05.25.
//

import Foundation

import Common

protocol MainAppProxyDelegate: AnyObject {
	func connectionWasInterrupted(_ proxy: MainAppProxy)
	func connectionWasInvalidated(_ proxy: MainAppProxy)
	func connection(_ proxy: MainAppProxy, didReceiveError error: Error)
	func proxyAcceptedConnection(_ proxy: MainAppProxy)
	func proxy(_ proxy: MainAppProxy, refusedConnectionWithError error: Error)
}

final class MainAppProxy {
	init(serviceName: String, remoteControl: RemoteControllingXPCProtocol) {
		let export = MachServiceXPCService
			.Configuration
			.Export(
				protocol: RemoteControllingXPCProtocol.self,
				object: remoteControl
			)

		let configuration = MachServiceXPCService
			.Configuration(
				serviceName: serviceName,
				protocol: RemoteControlledXPCProtocol.self,
				export: export
			)

		service = MachServiceXPCService(configuration: configuration)
	}

	/// The XPC service listening for a Mach service name.
	private let service: MachServiceXPCService

	/// The delegate to notify about service interactions.
	weak var delegate: MainAppProxyDelegate?

	/// The Airtime main app XPC proxy.
	var proxy: RemoteControlledXPCProtocol {
		get throws {
			if let remoteControlledProxy = try service.proxy as? RemoteControlledXPCProtocol {
				remoteControlledProxy
			} else {
				throw MachServiceXPCService.Error.proxyDoesNotConformToExpectedProtocol
			}
		}
	}

	func activate() {
		service.delegate = self
		service.activate()
	}

	func deactivate() {
		service.deactivate()
		service.delegate = nil
	}
}

extension MainAppProxy: MachServiceXPCServiceDelegate {
	func connectionWasInterrupted(_ service: MachServiceXPCService) {
		delegate?.connectionWasInterrupted(self)
	}

	func connectionWasInvalidated(_ service: MachServiceXPCService) {
		delegate?.connectionWasInvalidated(self)
	}

	func connection(_ service: MachServiceXPCService, didReceiveError error: any Error) {
		delegate?.connection(self, didReceiveError: error)
	}

	func serviceAcceptedConnection(_ service: MachServiceXPCService) {
		delegate?.proxyAcceptedConnection(self)
	}

	func service(_ service: MachServiceXPCService, refusedConnectionWithError error: MachServiceXPCService.Error) {
		delegate?.proxy(self, refusedConnectionWithError: error)
	}
}
