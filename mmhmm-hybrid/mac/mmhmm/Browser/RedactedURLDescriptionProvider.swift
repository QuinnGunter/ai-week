//
//  RedactedURLDescriptionProvider.swift
//  mmhmm
//
//  Created by Beni Federer on 17.09.25.
//

import Foundation

protocol RedactedURLDescriptionProvider {
	var url: URL? { get }
	var urlDescription: String { get }
}

extension RedactedURLDescriptionProvider {
	var urlDescription: String {
		url?.redactingQueryValues()?.absoluteString ?? "unavailable URL"
	}
}
