//
//  MachServiceXPCService.swift
//  Common
//
//  Created by Beni Federer on 13.05.25.
//

import Foundation

public protocol MachServiceXPCServiceDelegate: AnyObject {
	func connectionWasInterrupted(_ service: MachServiceXPCService)
	func connectionWasInvalidated(_ service: MachServiceXPCService)
	func connection(_ service: MachServiceXPCService, didReceiveError error: Error)
	func serviceAcceptedConnection(_ service: MachServiceXPCService)
	func service(_ service: MachServiceXPCService, refusedConnectionWithError error: MachServiceXPCService.Error)
}

/// XPC service for a Mach service name.
///
/// Supports one client connection at a time,
/// refuses multiple connections.
final public class MachServiceXPCService: NSObject {
	public init(configuration: Configuration) {
		listener = NSXPCListener(machServiceName: configuration.serviceName)
		self.configuration = configuration
	}

	/// The XPC listener.
	private let listener: NSXPCListener

	/// The service configuration.
	private let configuration: Configuration

	/// The active connection to an XPC client.
	private var connection: NSXPCConnection?

	/// The delegate to notify about connection updates.
	public weak var delegate: MachServiceXPCServiceDelegate?

	/// The XPC client proxy object.
	public var proxy: Any {
		get throws {
			if let proxy = connection?.remoteObjectProxyWithErrorHandler(errorHandler) {
				proxy
			} else {
				throw Error.proxyIsUnavailable
			}
		}
	}

	/// Activates the listener.
	public func activate() {
		listener.delegate = self
		listener.activate()
	}

	/// Deactivates the listener.
	public func deactivate() {
		listener.suspend()
	}

	deinit {
		listener.resume()
		listener.invalidate()
	}
}

extension MachServiceXPCService: NSXPCListenerDelegate {
	public func listener(_ listener: NSXPCListener, shouldAcceptNewConnection newConnection: NSXPCConnection) -> Bool {
		guard connection == nil else {
			delegate?.service(self, refusedConnectionWithError: .multipleConnections)
			return false
		}

		newConnection.exportedInterface = NSXPCInterface(with: configuration.export.protocol)
		newConnection.exportedObject = configuration.export.object
		newConnection.remoteObjectInterface = NSXPCInterface(with: configuration.protocol)
		newConnection.interruptionHandler = connectionWasInterrupted
		newConnection.invalidationHandler = connectionWasInvalidated
		newConnection.resume()

		connection = newConnection
		delegate?.serviceAcceptedConnection(self)

		return true
	}
}

extension MachServiceXPCService {
	/// The Mach service configuration.
	public struct Configuration {
		/// The Mach service name.
		let serviceName: String

		/// The client proxy, or XPC remote protocol,
		/// the service interacts with, i.e. the "other" side.
		let `protocol`: Protocol

		/// The exported proxy configuration,
		/// i.e. "this" side.
		let export: Export

		public init(serviceName: String, protocol: Protocol, export: Export) {
			self.serviceName = serviceName
			self.protocol = `protocol`
			self.export = export
		}
	}
}

extension MachServiceXPCService.Configuration {
	/// The proxy to export.
	public struct Export {
		/// The protocol clients interact with.
		let `protocol`: Protocol

		/// The object implementing `protocol`.
		let object: Any

		public init(protocol: Protocol, object: Any) {
			self.protocol = `protocol`
			self.object = object
		}
	}
}

extension MachServiceXPCService {
	/// The error handling block that the proxy object should call when an error occurs
	/// while waiting for a reply.
	///
	/// If the message sent to the proxy has a reply handler, then either the error handler
	/// or the reply handler is called exactly once.
	private func errorHandler(_ error: Swift.Error) {
		delegate?.connection(self, didReceiveError: error)
	}

	/// An interruption handler that is called if the remote process exits or crashes.
	///
	/// It may be possible to re-establish the connection by simply sending another message.
	/// The handler is invoked on the same queue as reply messages and other handlers, and it
	/// is always executed after any other messages or reply block handlers (except for the
	/// invalidation handler).
	private func connectionWasInterrupted() {
		delegate?.connectionWasInterrupted(self)
	}

	/// An invalidation handler that is called if the connection can not be formed or
	/// the connection has terminated and may not be re-established.
	///
	/// This handler is invoked on the same queue as reply messages and other handlers,
	/// and is always executed last (after the interruption handler, if required). You
	/// may not send messages over the connection from within an invalidation handler block.

	private func connectionWasInvalidated() {
		delegate?.connectionWasInvalidated(self)
		connection = nil
	}
}

extension MachServiceXPCService {
	public enum Error: Int {
		case connectionWasInterrupted
		case connectionWasInvalidated
		case multipleConnections
		case proxyIsUnavailable
		case proxyDoesNotConformToExpectedProtocol
	}
}

extension MachServiceXPCService.Error: BaseError {
	public static let domain: String = String(describing: Self.self)

	public var errorMessage: String {
		switch self {
		case .connectionWasInterrupted: "The connection was interrupted."
		case .connectionWasInvalidated: "The connection was invalidated."
		case .multipleConnections: "Multiple connections are not supported."
		case .proxyDoesNotConformToExpectedProtocol: "The proxy does not conform to the expected protocol."
		case .proxyIsUnavailable: "The proxy is unavailable."
		}
	}
}
