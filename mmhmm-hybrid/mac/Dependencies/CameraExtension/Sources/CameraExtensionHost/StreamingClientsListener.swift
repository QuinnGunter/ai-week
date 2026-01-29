//
//  StreamingClientsListener.swift
//  CameraExtensionHost
//
//  Created by Beni Federer on 08.12.23.
//

import AppKit
import Combine
import CoreMediaIO

import CameraExtensionCommon

/// Listens for changes to a stream's `streamingClients` property.
public struct StreamingClientsListener {
	public typealias ChangeHandler = ([pid_t]) -> Void

	private let listener: PropertyListener
	private let cancellable: AnyCancellable

	/// Creates a listener for changes to a stream's `streamingClients` property.
	///
	/// - Note: If a streaming client PID can't be resolved to an application, an empty application instance is created instead.
	///
	/// - Parameters:
	///   - streamID: The identifier of the stream to listen to.
	///   - streamingClientsHandler: The change handler returning the current streaming client PIDs.
	public init(streamID: CMIOStreamID, queue: DispatchQueue? = nil, streamingClientsHandler: @escaping ChangeHandler) throws {
		let queue = queue ?? DispatchQueue(label: String(describing: Self.self))

		listener = try PropertyListener(objectID: streamID, selector: Property.streamingClients.selectorName)
		cancellable = listener
			.$propertyValue
			.receive(on: queue)
			.sink { propertyValue in
				let streamingClients: [pid_t] = propertyValue
					.components(separatedBy: Property.streamingClientsSeparator)
					.compactMap { pid_t($0) }
				streamingClientsHandler(streamingClients)
			}
	}
}

extension StreamingClientsListener: Equatable {}
