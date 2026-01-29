//
//  Constants.swift
//  CameraExtensionCommon
//
//  Created by Beni Federer on 11.12.23.
//

import Foundation

public enum LogConstants {
	public static let unsupportedLogCollectionModeMessage: String = "<Pull collection mode not supported by configuration.>"

	// Note: Providing an empty string makes checking for length easy, but might also be unclear on the receiver side.
	// Preferably, this message could contain an indicator that allows for better debuggability, e.g. "<No log message available.>" or similar.
	public static let noLogMessagesAvailableMessage: String = ""

	/// A log message that can occur in high volumes, depending on the frame rate stability of the producer connection.
	public static let bufferRetriesFailed: String = "No buffer, giving up retries."
}
