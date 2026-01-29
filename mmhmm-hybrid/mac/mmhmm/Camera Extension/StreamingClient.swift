//
//  StreamingClient.swift
//  mmhmm
//
//  Created by Beni Federer on 12.06.24.
//

import AppKit

struct StreamingClient {
	let application: NSRunningApplication?
	let connectionDate: Date
	let pid: pid_t
	let sessionID: UUID
	let details: Details

	init(application: NSRunningApplication?, connectionDate: Date = .now, pid: pid_t, sessionID: UUID = UUID()) {
		self.application = application
		self.connectionDate = connectionDate
		self.pid = pid
		self.sessionID = sessionID
		details = Details(withApplication: application, pid: pid)
	}
}

extension StreamingClient {
	struct Details: Encodable {
		/// The app ID of the client, if available.
		///
		/// - Important: Variable name is used as key when encoded as JSON.
		let appID: String

		/// The app or process name of the client, if available.
		///
		/// - Important: Variable name is used as key when encoded as JSON.
		let appName: String

		fileprivate init(withApplication application: NSRunningApplication?, pid: pid_t) {
			if let application {
				// In rare cases bundleIdentifier can be nil.
				// Considering we are using bundleIdentifier as dictionary key,
				// we should convert nil into any non nil value.
				// We don't need to worry about making converted nil value
				// as unique because dictionary is single item collection.
				appID = application.bundleIdentifier ?? ""
				appName = application.localizedName ?? ""
			} else {
				let processName = (try? pid.processName) ?? ""
				appID = ""
				appName = processName
			}
		}
	}
}

extension StreamingClient: Equatable {}
extension StreamingClient.Details: Equatable {}
