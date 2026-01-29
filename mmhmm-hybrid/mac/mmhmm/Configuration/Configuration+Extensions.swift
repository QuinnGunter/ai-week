//
//  Configuration+Extensions.swift
//  mmhmm
//
//  Created by Matthew Tonkin on 7/8/2024.
//

extension Configuration.Release {
	var isInternal: Bool {
		switch self {
		case .engineering, .test, .alpha:
			return true
		case .beta, .production:
			return false
		@unknown default:
			return false
		}
	}
}
