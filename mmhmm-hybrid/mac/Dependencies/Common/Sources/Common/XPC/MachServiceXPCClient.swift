//
//  MachServiceXPCClient.swift
//  Common
//
//  Created by Beni Federer on 19.05.25.
//

import Foundation

public protocol MachServiceXPCClientDelegate: AnyObject, Sendable {
	/// Client connection should be retried upon receiving this call.
	func clientWasInterrupted(_ client: MachServiceXPCClient) async

	/// Client should be recreated upon receiving this call.
	func clientWasInvalidated(_ client: MachServiceXPCClient) async

	/// Client connection may need to be reactivated upon receiving this call.
	func client(_ client: MachServiceXPCClient, didReceiveError error: Error) async
}

/// Client side of an XPC connection to a Mach service.
final public actor MachServiceXPCClient {
	/// The client state.
	private var state: State = .disconnected

	/// The XPC connection.
	private var connection: NSXPCConnection? {
		switch state {
		case let .connected(connection: connection), let .suspended(connection: connection): connection
		default: nil
		}
	}

	/// The service proxy, i.e. the remote XPC object.
	///
	/// If `delegate` is set and messages to `proxy.value`
	/// have a reply handler, then either the delegate
	/// or the reply handler are called exactly once.
	///
	/// Cast this to the dynamic `Protocol` type stored
	/// in `export.protocol`.
	///
	/// - Throws: An error if the XPC connection is suspended
	///           or not established.
	public var proxy: UncheckedProxy {
		get throws {
			guard case let .connected(connection: connection) = state else {
				throw Error.invalidState(String(describing: state))
			}

			let proxy: Any = connection.remoteObjectProxyWithErrorHandler(errorHandler)
			return UncheckedProxy(value: proxy)
		}
	}

	/// Whether the XPC connection is active.
	public var isActive: Bool { if case .connected = state { true } else { false } }

	/// The delegate called with connection state changes.
	private weak var delegate: MachServiceXPCClientDelegate?

	public init(configuration: Configuration) {
		let connection = NSXPCConnection(machServiceName: configuration.serviceName, options: [])
		connection.remoteObjectInterface = NSXPCInterface(with: configuration.protocol.self)

		if let export = configuration.export {
			connection.exportedInterface = NSXPCInterface(with: export.protocol.self)
			connection.exportedObject = export.object
		}

		state = .suspended(connection: connection)
	}

	/// Activates the XPC connection.
	public func activate() throws {
		guard case let .suspended(connection: connection) = state else {
			throw Error.invalidState(String(describing: state))
		}

		connection.interruptionHandler = connectionWasInterrupted
		connection.invalidationHandler = connectionWasInvalidated
		connection.activate()

		state = .connected(connection: connection)
	}

	/// Deactivates the XPC connection.
	public func deactivate() throws {
		guard case let .connected(connection: connection) = state else {
			throw Error.invalidState(String(describing: state))
		}

		connection.suspend()

		state = .suspended(connection: connection)
	}

	/// Permanently closes the XPC connection.
	///
	/// The connection can't be reused after calling this function.
	public func close() {
		switch state {
		case let .connected(connection):
			connection.invalidate()
		case let .suspended(connection):
			connection.activate()
			connection.invalidate()
		case .disconnected:
			break
		}

		state = .disconnected
	}

	/// Updates the actor's delegate.
	///
	/// - Parameter delegate: The delegate to set.
	public func updateDelegate(_ delegate: MachServiceXPCClientDelegate?) {
		self.delegate = delegate
	}
}

extension MachServiceXPCClient {
	/// The error handling block that the proxy object should call when an error occurs
	/// while waiting for a reply.
	///
	/// If the message sent to the proxy has a reply handler, then either the error handler
	/// or the reply handler is called exactly once.
	private func errorHandler(_ error: Swift.Error) {
		Task { await delegate?.client(self, didReceiveError: error) }
	}

	/// An interruption handler that is called if the remote process exits or crashes.
	///
	/// It may be possible to re-establish the connection by simply sending another message.
	/// The handler is invoked on the same queue as reply messages and other handlers, and it
	/// is always executed after any other messages or reply block handlers (except for the
	/// invalidation handler).
	private func connectionWasInterrupted() {
		Task { await delegate?.clientWasInterrupted(self) }
	}

	/// An invalidation handler that is called if the connection can not be formed or
	/// the connection has terminated and may not be re-established.
	///
	/// This handler is invoked on the same queue as reply messages and other handlers,
	/// and is always executed last (after the interruption handler, if required). You
	/// may not send messages over the connection from within an invalidation handler block.
	private func connectionWasInvalidated() {
		state = .disconnected
		Task { await delegate?.clientWasInvalidated(self) }
	}
}

extension MachServiceXPCClient {
	/// The state of the internally managed connection.
	private enum State: Equatable {
		/// The connection is alive.
		case connected(connection: NSXPCConnection)
		/// The connection is suspended.
		case suspended(connection: NSXPCConnection)
		/// The connection has not been established yet or has become unusable.
		case disconnected
	}
}

extension MachServiceXPCClient {
	/// A concurrency-unsafe wrapper to allow accessing the proxy
	/// object from outside the `MachServiceXPCClient`.
	public struct UncheckedProxy: @unchecked Sendable {
		/// The XPC proxy object representing the Mach service.
		///
		/// Safe to use while the XPC connection is alive.
		public let value: Any
	}

	/// The client configuration.
	public struct Configuration {
		/// The Mach service name to connect to.
		let serviceName: String

		/// The service proxy, or XPC remote protocol,
		/// the client interacts with, i.e. the "other" side.
		let `protocol`: Protocol

		/// The exported proxy configuration,
		/// if the service is expected to talk back,
		/// i.e. "this" side.
		let export: Export?

		public init(serviceName: String, protocol: Protocol, export: Export?) {
			self.serviceName = serviceName
			self.protocol = `protocol`
			self.export = export
		}
	}
}

extension MachServiceXPCClient.Configuration {
	/// The proxy to export.
	public struct Export {
		/// The protocol the service interacts with.
		let `protocol`: Protocol

		/// The object implementing `protocol`.
		let object: Any

		public init(protocol: Protocol, object: Any) {
			self.protocol = `protocol`
			self.object = object
		}
	}
}

extension MachServiceXPCClient.Configuration: @unchecked Sendable {}
extension MachServiceXPCClient.Configuration.Export: @unchecked Sendable {}

extension MachServiceXPCClient {
	public enum Error {
		case invalidState(String)
		case proxyUnavailable
	}
}

extension MachServiceXPCClient.Error: BaseErrorWithAssociatedValues {
	public static let domain: String = String(describing: Self.self)

	public var errorMessage: String {
		switch self {
		case let .invalidState(stateDescription): "Invalid state: \(stateDescription)"
		case .proxyUnavailable: "Proxy is unavailable."
		}
	}

	public static let allCases: [MachServiceXPCClient.Error] = [
		.invalidState(""),
		.proxyUnavailable,
	]
}
