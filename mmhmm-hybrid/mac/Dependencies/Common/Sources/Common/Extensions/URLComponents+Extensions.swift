//
//  URLComponents+Extensions.swift
//  Common
//
//  Created by Beni Federer on 20.12.24.
//

import Foundation

extension URLComponents {
	/// Replaces values for the passed query keys with "REDACTED".
	///
	/// - Parameter keys: The keys for which to redact associated values.
	///                   If empty, every query value is redacted.
	/// - Returns: The redacted query items or `nil`, if query is empty.
	public func redactedQueryItems(for keys: Set<String> = []) -> [URLQueryItem]? {
		queryItems?
			.map { (item: URLQueryItem) in
				if keys.isEmpty || keys.contains(item.name) {
					URLQueryItem(name: item.name, value: "REDACTED")
				} else {
					item
				}
			}
	}

	/// Appends a fragment to the existing URL fragment, using `&` as a separator.
	///
	/// - Parameters:
	///   - newFragment: The fragment string to append.
	///   - applyingPercentEncoding: If `true`, applies percent encoding to the new fragment
	///                              using URL fragment allowed characters. Defaults to `false`.
	///
	/// - Note: The ampersand separator is not percent-encoded. If your fragment values may contain
	///         ampersands, consider using a different separator or encoding scheme.
	public mutating func appendFragment(_ newFragment: String, applyingPercentEncoding: Bool = false) {
		guard newFragment.isEmpty == false else { return }

		let fragmentToAppend = if applyingPercentEncoding {
			newFragment.addingPercentEncoding(withAllowedCharacters: .urlFragmentAllowed) ?? newFragment
		} else {
			newFragment
		}

		fragment = if let existingFragment = fragment, existingFragment.isEmpty == false {
			existingFragment + "&" + fragmentToAppend
		} else {
			fragmentToAppend
		}
	}
}
