//
//  WebApp.Error.swift
//  mmhmm
//
//  Created by Beni Federer on 11.09.25.
//

import Foundation

import Common

extension WebApp {
	enum Error {
		case roomParsingFailed
		case mediaParsingFailed
		case webAppNotReady
		case failedGettingActiveAudioDevice(Swift.Error)
		case failedGettingActiveVideoDevice(Swift.Error)
		case failedGettingLoggedInUserEmail(Swift.Error)
		case failedGettingLoggedInUserID(Swift.Error)
		case invalidTransition(from: State, to: State)
	}
}

extension WebApp.Error: BaseErrorWithAssociatedValues {
	static let allCases: [Self] = [
		.roomParsingFailed,
		.mediaParsingFailed,
		.webAppNotReady,
		.failedGettingActiveAudioDevice(GenericError.bogus),
		.failedGettingActiveVideoDevice(GenericError.bogus),
		.failedGettingLoggedInUserEmail(GenericError.bogus),
		.failedGettingLoggedInUserID(GenericError.bogus),
		.invalidTransition(from: .idle, to: .idle),
	]

	static let domain: String = String(describing: Self.self)

	var errorMessage: String {
		switch self {
		case .roomParsingFailed:
			"Failed parsing room."
		case .mediaParsingFailed:
			"Failed parsing media."
		case .webAppNotReady:
			"Web app is not ready."
		case let .failedGettingActiveAudioDevice(error):
			"Failed getting active audio device: \(error.localizedDescription)"
		case let .failedGettingActiveVideoDevice(error):
			"Failed getting active video device: \(error.localizedDescription)"
		case let .failedGettingLoggedInUserEmail(error):
			"Failed getting logged in user email: \(error.localizedDescription)"
		case let .failedGettingLoggedInUserID(error):
			"Failed getting logged in user ID: \(error.localizedDescription)"
		case let .invalidTransition(from, to):
			"Invalid transition from \(from) to \(to)."
		}
	}
}
