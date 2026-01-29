//
//  URLComponents+Extensions.swift
//  mmhmm
//
//  Created by Matthew Tonkin on 30/5/2024.
//

import Foundation

import Algorithms

extension URLComponents {
	/// Returns the URL fragment (the string following `#`) in URLQueryItem form
	/// For example `https://example.com/path#foo=bar` returns a query item with name = foo and value = bar
	/// - Returns: An array of URLQueryItems. This will be an empty array if the fragment is not in query format or nil if there is no fragment.
	var fragmentQueryItems: [URLQueryItem]? {
		guard let fragment: String else { return nil }
		let components = NSURLComponents()
		components.query = fragment
		return components.queryItems
	}

	/// Returns the value for a query item key value pair contained in the URL fragment (the string following `#`)
	/// For example providing `fragmentKey: "foo"` to `https://example.com/path#foo=bar` returns `bar`
	/// - Parameter fragmentKey: The name of the key. Case insensitive.
	/// - Returns: The value matching `fragmentKey` from a query string in the fragment. This will be nil if the fragment does not contain a key matching `fragmentKey` or nil if there is no fragment.
	func fragmentValue(forKey fragmentKey: String) -> String? {
		return fragmentQueryItems?.value(forItemWithName: fragmentKey)
	}

	/// Returns the last two components of the URL path
	/// For example `https://example.com/foo/bar` returns `("foo", "bar")`
	/// - Returns: The last two components of the URL path as a pair.  Returns nil if there are less than 2 parts to the path.
	var trailingPathComponentPair: (String, String)? {
		let components: [String] = path.components(separatedBy: "/")
		let count: Int = components.count
		guard count >= 2 else { return nil }
		return (components[safe: count - 2]!, components[safe: count - 1]!)
	}

	/// Returns the last component of the URL path, if the second to last component matches `key`.
	/// For example providing `key: "foo"` to `https://example.com/foo/bar` returns `bar`
	/// - Parameter key: The name of the key. Case insensitive.
	/// - Returns: The last part of the path matching if the second to last part of the path matches `key`. This will be nil if there are less than 2 parts to the path or the second to last part of the path does not match `key` .
	func trailingPathValue(forKey key: String) -> String? {
		guard let lastPathPair: (String, String) = (self as URLComponents).trailingPathComponentPair else { return nil }

		if lastPathPair.0.lowercased() == key.lowercased() {
			return lastPathPair.1
		} else {
			return nil
		}
	}

	/// Searches the URL for a value matching `key` in the fragment, query items or path (in that order).
	/// Examples providing `key: "foo"` to return `bar` for the following URLS:
	/// `https://example.com/path#foo=bar`
	/// `https://example.com/path?foo=bar`
	/// `https://example.com/foo/bar`
	/// - Parameter key: The name of the key. Case insensitive.
	/// - Returns: Any value found that is paired with `key`, otherwise nil if no values are found.
	func anyValue(forKey key: String) -> String? {
		if let fragmentValue: String = fragmentValue(forKey: key) {
			return fragmentValue
		} else if let queryItemValue: String = queryItems?.value(forItemWithName: key) {
			return queryItemValue
		} else if let trailingPathValue: String = trailingPathValue(forKey: key) {
			return trailingPathValue
		} else {
			return nil
		}
	}

	/// Searches the URL for a value matching one of the `keys` in its fragment,
	/// query items or path (in that order), traversing `keys` in its given order.
	///
	/// Examples:
	/// `https://example.com/path#foo=bar` returns `bar` for `["fooID", "foo"`].
	///
	/// - Parameter keys: The keys to search for.
	/// - Returns: The first value matching an element of `keys`,
	///            or `nil` if no values are found for either key.
	func firstNonNilStringValue(matchingKeys keys: [String]) -> String? {
		keys.firstNonNil { anyValue(forKey: $0) }
	}
}

extension URLComponents {
	var authToken: String? { queryItems?.value(forItemWithName: "token") }

	var talkID: String? { firstNonNilStringValue(matchingKeys: ["talkID", "talk"]) }

	var importID: String? { firstNonNilStringValue(matchingKeys: ["importID", "import", "presentation"]) }

	var recordingID: String? {
		/// The lower case `d` in `recordingId` is not accidental.
		/// Whilst we handle the key in a case insensitive manner, lowercase `d` is canonical by the service, so that's how it's written below.
		firstNonNilStringValue(matchingKeys: ["recordingId", "recording"])
	}
}
