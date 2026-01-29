//
//  URLQueryItem+Extensions.swift
//  mmhmm
//
//  Created by Matthew Tonkin on 30/5/2024.
//

import Foundation

extension Array where Element == URLQueryItem {
	func firstItem(withName name: String) -> URLQueryItem? {
		return first { (queryItem: URLQueryItem) -> Bool in
			return queryItem.name.lowercased() == name.lowercased()
		}
	}

	func value(forItemWithName name: String) -> String? {
		return firstItem(withName: name)?.value
	}
}
