//
//  UncheckedSendableBox.swift
//  Common
//
//  Created by Beni Federer on 11.07.25.
//

/// A type boxing an otherwise not sendable value.
///
/// Use with caution.
public struct UncheckedSendableBox<T>: @unchecked Sendable {
	public let value: T

	public init(value: T) {
		self.value = value
	}
}
