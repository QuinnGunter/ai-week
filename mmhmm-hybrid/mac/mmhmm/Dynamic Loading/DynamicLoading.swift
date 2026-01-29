//
//  DynamicLoading.swift
//  mmhmm
//
//  Created by Beni Federer on 30.07.24.
//

import AppKit

/// A namespace for helpers that support function loading from dylibs.
///
/// ### Helpful Documentation
///
/// * [Using Imported C Functions in Swift](https://developer.apple.com/documentation/swift/using-imported-c-functions-in-swift)
/// * [dlopen](x-man-page://dlopen)
/// * [dlsym](x-man-page://dlsym)
enum DynamicLoading {
	/// A typealias for a closure that is called with a handle to a loaded dylib.
	typealias LoadedDylibHandler<T> = (UnsafeMutableRawPointer) throws -> T

	/// Loads the dylib at the specified path and calls the provided closure with the dylib handle.
	///
	/// Call this function to load private dylibs at locations like `/System/Library/Frameworks`.
	///
	/// - Note: This function automatically closes the dylib handle after executing the closure.
	///
	/// - Parameters:
	///   - path: The path to load the dylib from.
	///   - handler: A closure providing the handle to the loaded dylib.
	/// - Throws: An error describing the failure, retrieved through ``dlerror()``, if available.
	static func withHandleOfDylib<T>(withPath path: String, handler: LoadedDylibHandler<T>) throws -> T {
		guard let handle: UnsafeMutableRawPointer = dlopen(path, RTLD_LAZY) else {
			throw Error.dlopenError(lastDlError ?? "Unknown dlopen error")
		}
		defer { dlclose(handle) }
		return try handler(handle)
	}

	/// Loads a function pointer from a dylib as a callable Swift closure.
	///
	/// - Parameters:
	///   - name: The name of function to load.
	///   - function: The Swift function type to load the function as.
	///   - handle: The handle to the dylib to load the function from.
	/// - Returns: The Swift function as a callable closure.
	/// - Throws: An error describing the failure, retrieved through ``dlerror()``, if available.
	static func loadFunction<T>(withName name: String, asFunction function: T.Type, inDylibWithHandle handle: UnsafeMutableRawPointer) throws -> T {
		guard let functionPointer: UnsafeMutableRawPointer = dlsym(handle, name) else {
			throw Error.dlsymError(lastDlError ?? "Unknown dlsym error")
		}

		return unsafeBitCast(functionPointer, to: T.self)
	}

	/// The error provided by ``dlerror()``, or `nil` if none is available.
	private static var lastDlError: String? {
		guard let dlError: UnsafeMutablePointer<CChar> = dlerror() else { return nil }
		return String(cString: dlError)
	}

	/// Errors that can occur when interacting with dynamic loading C API.
	enum Error: Swift.Error {
		case dlopenError(String)
		case dlsymError(String)
	}
}
