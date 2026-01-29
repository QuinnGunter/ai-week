//
//  Array+Extensions.swift
//  mmhmm
//
//  Created by Matthew Tonkin on 19/10/20.
//  Copyright © 2020 mmhmm, inc. All rights reserved.
//

import Foundation

extension Array {
	public func containsIndex(_ index: Int) -> Bool {
		guard !isEmpty else {
			return false
		}

		return index >= 0 && index < count
	}

	public func firstElement<T>(ofType _: T.Type) -> T? {
		for element in self where element is T {
			return element as? T
		}

		return nil
	}

	public func filtered<T>(byType _: T.Type) -> [T] {
		compactMap { $0 as? T }
	}

	public subscript(safe index: Self.Index) -> Element? {
		guard index < count, index >= 0 else {
			return nil
		}
		return self[index]
	}
}

extension Array where Element: Equatable {
	public func item(after item: Element) -> Element? {
		guard let itemIndex: Int = firstIndex(of: item) else {
			return nil
		}

		let nextIndex: Int = index(after: itemIndex)
		guard containsIndex(nextIndex) else {
			return nil
		}

		return self[nextIndex]
	}

	public func item(before item: Element) -> Element? {
		guard let itemIndex: Int = firstIndex(of: item) else {
			return nil
		}

		let previousIndex: Int = index(before: itemIndex)
		guard containsIndex(previousIndex) else {
			return nil
		}

		return self[previousIndex]
	}
}
