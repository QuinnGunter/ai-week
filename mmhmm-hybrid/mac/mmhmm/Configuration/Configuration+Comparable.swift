//
//  Configuration+Comparable.swift
//  mmhmm
//
//  Created by Beni Federer on 22.10.24.
//

extension Configuration.Release: Comparable {
	static func < (lhs: Configuration.Release, rhs: Configuration.Release) -> Bool {
		lhs.comparableIndex < rhs.comparableIndex
	}

	private var comparableIndex: UInt8 {
		switch self {
		case .engineering: 0
		case .test: 1
		case .alpha: 2
		case .beta: 3
		case .production: 4
		}
	}
}

extension Configuration.Service: Comparable {
	static func < (lhs: Configuration.Service, rhs: Configuration.Service) -> Bool {
		lhs.comparableIndex < rhs.comparableIndex
	}

	private var comparableIndex: UInt8 {
		switch self {
		case .development: 0
		case .stage: 1
		case .production: 2
		}
	}
}
