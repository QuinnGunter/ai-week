//
//  AirtimeMenuProxy.swift
//  mmhmm
//
//  Created by Beni Federer on 13.05.25.
//

import Foundation

import Common

protocol AirtimeMenuProxyDelegate: AnyObject {
	/// The proxy's XPC client encountered a connection issue,
	/// which is likely to have stopped the client.
	///
	/// - Parameter proxy: The proxy.
	func proxyConnectionStopped(_ proxy: AirtimeMenuProxy)
}

/// A proxy allowing interaction with the Airtime menu bar app.
///
/// Communication is handled internally by an XPC connection
/// to the menu bar app's Mach service.
final actor AirtimeMenuProxy {
	init(remoteReceiver: RemoteControlledXPCProtocol, delegate: AirtimeMenuProxyDelegate) {
		let export = MachServiceXPCClient
			.Configuration
			.Export(
				protocol: RemoteControlledXPCProtocol.self,
				object: remoteReceiver
			)

		configuration = MachServiceXPCClient
			.Configuration(
				serviceName: Self.airtimeMenuBundleIdentifier,
				protocol: RemoteControllingXPCProtocol.self,
				export: export
			)

		self.delegate = delegate
	}

	static let airtimeMenuBundleIdentifier: String = "M3KUT44L48.app.mmhmm.hybrid.menu"

	private weak var delegate: AirtimeMenuProxyDelegate?

	private let configuration: MachServiceXPCClient.Configuration

	private var machServiceClient: MachServiceXPCClient?

	private var logCommonStartupErrors: Bool = false

	private var startUpContinuation: CheckedContinuation<Void, Swift.Error>?

	var version: String {
		get async throws {
			try await Task { try await uncheckedProxy.version }.value
		}
	}

	func start() async throws {
		guard machServiceClient == nil else {
			throw Error.proxyIsAlreadyRunning
		}

		let machServiceClient = MachServiceXPCClient(configuration: configuration)
		await machServiceClient.updateDelegate(self)
		self.machServiceClient = machServiceClient

		do {
			try await machServiceClient.activate()
			let proxy = try await proxy

			// Test the client connection by sending a ping.
			// Either the reply handler will fire indicating
			// success or a delegate method will throw.

			try await withCheckedThrowingContinuation { continuation in
				self.startUpContinuation = continuation
				proxy.ping { continuation.resume() }
			}

			startUpContinuation = nil
			logCommonStartupErrors = true
		} catch {
			// Ensure the client connection is cleaned up.
			await machServiceClient.close()
			self.machServiceClient = nil
			throw error
		}
	}

	func stop() async throws {
		guard let machServiceClient else {
			throw Error.proxyIsNotRunning
		}

		await machServiceClient.close()
		logCommonStartupErrors = false
	}
}

extension AirtimeMenuProxy: MachServiceXPCClientDelegate {
	func clientWasInterrupted(_ client: MachServiceXPCClient) async {
		Logger.logMessage("Client was interrupted.", level: .info)
		handleDelegateError(Error.clientWasInterrupted)
	}

	func clientWasInvalidated(_ client: MachServiceXPCClient) async {
		if logCommonStartupErrors {
			Logger.logMessage("Client was invalidated.", level: .info)
		}
		handleDelegateError(Error.clientWasInvalidated)
	}

	func client(_ client: MachServiceXPCClient, didReceiveError error: Swift.Error) async {
		if !(logCommonStartupErrors == false && error.isNSXPCConnectionInvalidError) {
			Logger.logError(error, messagePrefix: "Client encountered an error")
		}
		handleDelegateError(error)
	}
}

extension Error {
	fileprivate var isNSXPCConnectionInvalidError: Bool {
		(self as NSError).domain == NSCocoaErrorDomain && (self as NSError).code == NSXPCConnectionInvalid
	}
}

extension AirtimeMenuProxy {
	private var proxy: RemoteControllingXPCProtocol {
		get async throws {
			guard let machServiceClient else {
				throw Error.proxyIsNotRunning
			}
			guard let proxy = try await machServiceClient.proxy.value as? RemoteControllingXPCProtocol else {
				throw Error.proxyDoesNotConformToExpectedProtocol
			}
			return proxy
		}
	}

	private func handleDelegateError(_ error: Swift.Error) {
		if let startUpContinuation {
			self.startUpContinuation = nil
			startUpContinuation.resume(throwing: error)
		} else {
			delegate?.proxyConnectionStopped(self)
		}
	}
}

extension AirtimeMenuProxy {
	enum Error: Int {
		case proxyIsNotRunning
		case proxyIsAlreadyRunning
		case proxyDoesNotConformToExpectedProtocol
		case clientWasInterrupted
		case clientWasInvalidated
	}
}

extension AirtimeMenuProxy.Error: BaseError {
	static let domain: String = String(describing: Self.self)

	var errorMessage: String {
		switch self {
		case .proxyDoesNotConformToExpectedProtocol: "The proxy does not conform to the expected protocol."
		case .clientWasInterrupted: "The client was interrupted."
		case .clientWasInvalidated: "The client was invalidated."
		case .proxyIsNotRunning: "Proxy is not running."
		case .proxyIsAlreadyRunning: "Proxy is already running."
		}
	}
}

extension AirtimeMenuProxy {
	nonisolated func openSettings() {
		Task { await isolatedOpenSettings() }
	}

	private func isolatedOpenSettings() async {
		do {
			try await proxy.openSettings()
		} catch {
			Logger.logError(error, messagePrefix: "Failed to open Airtime menu settings")
		}
	}

	nonisolated func update(with state: RemoteControlState) {
		Task { await isolatedUpdate(with: state) }
	}

	private func isolatedUpdate(with state: RemoteControlState) async {
		do {
			try await proxy.update(with: state.xpcTransportValue)
		} catch {
			Logger.logError(error, messagePrefix: "Failed to update remote control state")
		}
	}
}

extension AirtimeMenuProxy {
	private var uncheckedProxy: UncheckedProxy {
		get async throws {
			try await UncheckedProxy(value: proxy)
		}
	}

	private struct UncheckedProxy: @unchecked Sendable {
		/// The XPC proxy object representing the Mach service.
		///
		/// Safe to use while the XPC connection is alive.
		let value: RemoteControllingXPCProtocol

		var version: String {
			get async throws {
				await value.version()
			}
		}
	}
}
