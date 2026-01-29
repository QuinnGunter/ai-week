//
//  MDQuery+Swifty.swift
//  mmhmm
//
//  Created by Beni Federer on 31.07.24.
//

import Foundation

import Common

extension MDQuery {
	enum Swifty {}
}

/// Provides swiftified wrappers for MDQuery's procedural C API.
extension MDQuery.Swifty {
	/// Performs a synchronous query within the specified scope.
	///
	/// - Parameters:
	///   - query: The query to perform.
	///   - scope: The scope with which to perform the query.
	/// - Returns: The URLs matching the query.
	/// - Throws: A `MDQuery.Swifty.Error` describing the failure.
	static func urlsForItems(inQuery query: String, withScope scope: Scope) throws -> [URL] {
		guard query.isEmpty == false else {
			throw Error.queryIsEmpty
		}

		let queryString = query as CFString

		guard let query: MDQuery = MDQueryCreate(kCFAllocatorDefault, queryString, nil, nil) else {
			throw Error.failedCreatingQuery
		}

		MDQuerySetSearchScope(query, [scope.rawValue as CFString] as CFArray, 0)

		guard MDQueryExecute(query, CFOptionFlags(kMDQuerySynchronous.rawValue)) else {
			throw Error.failedExecutingQuery
		}

		let count: Int = MDQueryGetResultCount(query)
		let itemURLs: [URL] = (0..<count)
			.compactMap { index in
				let itemRawPointer: UnsafeRawPointer = MDQueryGetResultAtIndex(query, index)

				// Note that here, the `UnsafeRawPointer` is an `MDItemRef`. It is not a pointer to an `MDItemRef`.
				// Hence, the memory must be mapped directly to the corresponding bridged `CFType`.
				// It can't be bound with `bindMemory` or `withMemoryRebound`, which assume a pointer to a reference.
				let item: MDItem = unsafeBitCast(itemRawPointer, to: MDItem.self)

				guard let itemPath: String = MDItemCopyAttribute(item, kMDItemPath) as? String else { return nil }

				return URL(fileURLWithPath: itemPath)
			}

		return itemURLs
	}
}

extension MDQuery.Swifty {
	enum Scope: RawRepresentable {
		case custom(CFString)
		/// Search should be restricted to the volume and directory that contains the current user's home directory.
		case home
		/// Search should be restricted to all locally mounted volumes, plus the user's home directory (which may be on a remote volume).
		case computer
		/// Search should include all user mounted remote volumes.
		case network
		/// Search should be restricted to indexed, locally mounted volumes and indexed user mounted remote volumes, plus the user's home directory.
		case allIndexed
		/// Search should be restricted to indexed, locally mounted volumes, plus the user's home directory (which may be on a remote volume).
		case computerIndexed
		/// Search should include indexed user mounted remote volumes.
		case networkIndexed

		var rawValue: CFString {
			switch self {
			case let .custom(scope): scope as CFString
			case .home: kMDQueryScopeHome
			case .computer: kMDQueryScopeComputer
			case .network: kMDQueryScopeNetwork
			case .allIndexed: kMDQueryScopeAllIndexed
			case .computerIndexed: kMDQueryScopeComputerIndexed
			case .networkIndexed: kMDQueryScopeNetworkIndexed
			}
		}

		init?(rawValue: CFString) {
			switch rawValue {
			case kMDQueryScopeHome: self = .home
			case kMDQueryScopeComputer: self = .computer
			case kMDQueryScopeNetwork: self = .network
			case kMDQueryScopeAllIndexed: self = .allIndexed
			case kMDQueryScopeComputerIndexed: self = .computerIndexed
			case kMDQueryScopeNetworkIndexed: self = .networkIndexed
			default: self = .custom(rawValue)
			}
		}
	}
}

extension MDQuery.Swifty {
	enum Error: Int {
		case queryIsEmpty
		case failedCreatingQuery
		case failedExecutingQuery
	}
}

extension MDQuery.Swifty.Error: BaseError {
	static let domain: String = String(describing: Self.self)

	var errorMessage: String {
		switch self {
		case .queryIsEmpty:
			String(localized: "Query is empty.")
		case .failedCreatingQuery:
			String(localized: "Failed creating query.")
		case .failedExecutingQuery:
			String(localized: "Failed executing query.")
		}
	}
}
