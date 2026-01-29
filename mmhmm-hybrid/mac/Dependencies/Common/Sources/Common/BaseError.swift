//
//  BaseError.swift
//  Common
//
//  Created by Beni Federer on 13.12.23.
//

import Foundation

/// `BaseError` provides default implementations to make an enum behave like a good `Error`.
///
/// Besides providing conformance to the Swift `Error` protocol, it automatically generates
/// sensible casts to `NSError`, printable descriptions, and localization with as little manual
/// setup as necessary.
///
/// - Requirements:
///   - Raw type must be `RawRepresentable`. Ideally, use `Int` starting at `1` to get consistent error codes.
///   - Definition of a `domain` which is used as the error domain when errors need to be cast to `NSError`.
///   - Definition of `errorMessage` for each error case. This can be localized strings.
///
/// - Example:
/// ```swift
/// enum TheError: Int, BaseError {
/// 	case someError = 1
/// 	case anotherError
///
/// 	static let domain: String = "the.error.domain"
/// 	var errorMessage: String {
/// 		switch self {
///             case .someError: String(localized: "Some error occurred.", comment: "First TheError case")
///             case .anotherError: String(localized: "Another error occurred", comment: "Second TheError case")
/// 		}
/// 	}
/// }
/// ```
public protocol BaseError: RawRepresentable, Swift.Error, CustomNSError, CustomStringConvertible, LocalizedError {
	static var domain: String { get }
	var errorMessage: String { get }
}

/// `BaseError` default implementations
extension BaseError {
	// CustomStringConvertible
	public var description: String { "Error Domain=\(Self.errorDomain) Code=\(errorCode) \"\(errorMessage)\" UserInfo=\(errorUserInfo)" }

	// CustomNSError
	public var errorUserInfo: [String: Any] { [NSDebugDescriptionErrorKey: errorMessage] }
	// Extra level of indirection is required to disallow falling back on `errorDomain`'s undesirable default implementation
	public static var errorDomain: String { domain }

	// LocalizedError - implement `failureReason`, `recoverySuggestion`, `helpAnchor` as needed.
	public var errorDescription: String? { errorMessage }
}

/// `BaseErrorWithAssociatedValues` makes `BaseError` available for any enum with associated values.
///
/// - Requirements:
///   - Conformance to `CaseIterable`.
///   - Definition of a `domain` which is used as the error domain when errors need to be cast to `NSError`.
///   - Definition of `errorMessage` for each error case. This can be localized strings.
///
/// - Notes: The `allCases` indices are used as `Int` error codes.
///          Error cases not present in `allCases` fall back on the default error value `-1`.
///          Associated values specified as part of the `allCases` definition are required,
///          because Swift does not allow omitting them, but are completely irrelevant otherwise.
///          An associated value of type `Swift.Error` can use the `GenericError.bogus` helper.
///
/// - Example:
/// ```swift
/// enum TheOtherError: BaseErrorWithAssociatedValues {
/// 	case someError(message: String)
/// 	case anotherError(value: Int, maybeMessage: String?)
///
/// 	static let allCases: [TheOtherError] = [.someError(message: ""), .anotherError(value: .zero, maybeMessage: nil)]
/// 	static let domain: String = "the.otherError.domain"
/// 	var errorMessage: String {
/// 		switch self {
/// 			case let .someError(message): String(localized: "Some error occurred: \(message).", comment: "First TheOtherError case")
/// 			case let .anotherError(value, maybeMessage): String(localized: "Another error occurred: \(value) \(maybeMessage ?? "")", comment: "Second TheOtherError case")
/// 		}
/// 	}
/// }
/// ```
public protocol BaseErrorWithAssociatedValues: BaseError, CaseIterable {}

/// `BaseErrorWithAssociatedValues` default implementations
extension BaseErrorWithAssociatedValues {
	public init?(rawValue: Int) {
		// swiftlint:disable force_cast
		guard Self.allCases.indices.contains(rawValue as! Self.AllCases.Index) else { return nil }
		self = Self.allCases[rawValue as! Self.AllCases.Index]
		// swiftlint:enable force_cast
	}

	public var rawValue: Int {
		Self.allCases.firstIndex {
			guard
				let selfLabel = Mirror(reflecting: self).children.first?.label,
				let iteratorLabel = Mirror(reflecting: $0).children.first?.label,
				selfLabel == iteratorLabel
			else {
				return false
			}
			return true
		} as? Int ?? -1
	}
}

/// A generic error enum, which comes in handy when defining
/// `allCases` of `BaseErrorWithAssociatedValues` conformees.
///
/// This error is not intended for production use, but satisfies
/// a Swift requirement as outlined in the above documentation.
public enum GenericError: Swift.Error {
	case bogus
}
