//
//  DynamicFunctionLoader.swift
//  mmhmm
//
//  Created by Beni Federer on 01.08.24.
//

import Foundation

/// A protocol for types that can dynamically load a function.
///
/// - Example:
/// ```
/// enum SecTranslocateIsTranslocatedURL: DynamicFunctionLoader {
///     typealias T = Function
///     typealias Function = @convention(c) (CFURL, UnsafeMutablePointer<Bool>, UnsafeMutablePointer<CFError?>) -> Bool
///     static let functionName: String = "SecTranslocateIsTranslocatedURL"
/// }
/// ```
protocol DynamicFunctionLoader<T> {
	/// Restricts the conformee to load a function only as a specific type `T`.
	///
	/// This restriction is imposed to ensure the compiler can check that only
	/// the intended Swift function can be loaded via `load<T>(withHandle:) -> T`.
	associatedtype T

	/// The name of the function in the dylib to bind to when loading.
	static var functionName: String { get }

	/// Loads the function with name `functionName` and binds it to a Swift
	/// closure of type `T`.
	///
	/// - Parameter handle: The handle of the dylib to load from.
	/// - Returns: A callable Swift closure of type `T` bound to the loaded function.
	/// - Throws: A `DynamicLoading.Error` describing the failure.
	static func load<T>(withHandle handle: UnsafeMutableRawPointer) throws -> T
}

extension DynamicFunctionLoader {
	static func load<T>(withHandle handle: UnsafeMutableRawPointer) throws -> T {
		try DynamicLoading.loadFunction(withName: functionName, asFunction: T.self, inDylibWithHandle: handle)
	}
}
