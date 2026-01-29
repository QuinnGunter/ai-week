//
//  ErrNo.swift
//  Common
//
//  Created by Beni Federer on 23.07.25.
//

import Foundation

/// Wraps `errno` code and message into an `Error`.
public struct ErrNo: Error {
	let errno: Int32
	let message: String

	/// Create an `ErrNo` from specific values.
	///
	/// - Parameters:
	///   - errno: The `errno` code.
	///   - message: The `errno` message.
	init(errno: Int32, message: String) {
		self.errno = errno
		self.message = message
	}

	/// Creates an `ErrNo` from the current `errno`.
	init() {
		#if swift(<6.2)
		errno = _errno.errno
		#else
		errno = _DarwinFoundation1.errno
		#endif
		message = String(cString: strerror(errno))
	}
}
