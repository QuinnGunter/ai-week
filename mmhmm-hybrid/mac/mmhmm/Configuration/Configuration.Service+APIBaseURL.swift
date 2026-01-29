//
//  Configuration.Service+APIBaseURL.swift
//  mmhmm
//
//  Created by Beni Federer on 27.02.25.
//

import Foundation

extension Configuration.Service {
	/// The URL pointing to the service API site.
	var apiBaseURL: URL {
		URL(string: apiBaseURLString)!
	}

	private var apiBaseURLString: String {
		switch self {
		case .development: "https://dev-api.mmhmm.app"
		case .stage: "https://stage-api.mmhmm.app"
		case .production: "https://api.mmhmm.app"
		@unknown default: "https://api.mmhmm.app"
		}
	}
}
