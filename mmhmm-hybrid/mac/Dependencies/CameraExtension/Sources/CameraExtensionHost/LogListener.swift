//
//  LogListener.swift
//  CameraExtensionHost
//
//  Created by Beni Federer on 08.12.23.
//

import Combine
import CoreMediaIO

import CameraExtensionCommon

/// Listens for log messages on a stream.
public struct LogListener {
	public typealias MessageHandler = (String) -> Void

	private let queue = DispatchQueue(label: String(describing: Self.self))
	private let listener: PropertyListener
	private let cancellable: AnyCancellable

	/// Creates a listener for log messages delivered on a specified stream.
	///
	/// Refer to ``CameraExtensionCommon.LogCollectionMode.push`` for the required configuration.
	///
	/// - Parameters:
	///   - streamID: The identifier of the stream to listen to.
	///   - streamingClientsHandler: The change handler returning a batch of log messages.
	public init(streamID: CMIOStreamID, messageHandler: @escaping MessageHandler) throws {
		listener = try PropertyListener(objectID: streamID, selector: Property.log.selectorName)
		cancellable = listener
			.$propertyValue
			.dropFirst() // Initial value is an empty string
			.receive(on: queue)
			.sink { propertyValue in
				propertyValue
					.components(separatedBy: Property.logMessagesSeparator)
					.forEach { messageHandler($0) }
			}
	}
}

extension LogListener: Equatable {}
