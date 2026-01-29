//
//  CrashLoopPrevention.swift
//  mmhmm
//
//  Created by Beni Federer on 31.07.24.
//

import Foundation

import Common

enum CrashLoopPrevention {
	/// Executes the passed in closure with crash loop prevention.
	///
	/// Crash loop prevention stores an instance of ``CheckIn`` in
	/// the user defaults for the passed in `identifier` and removes
	/// it before returning or before re-throwing an error from the
	/// executed `closure`.
	///
	/// If `closure` crashes during its execution, the check-in is
	/// not removed from the user defaults and found by the next
	/// call with the same `identifier` to this function, which then
	/// throws a ``CrashLoopPrevention.Error.openCheckInFound`` instead
	/// of executing `closure`. The thrown error can be used by the
	/// caller to log its associated ``CheckIn`` value and make a decision
	/// on how to proceed.
	///
	/// - Parameters:
	///   - identifier: Identifies the closure to run.
	///   - closure: The closure to run with crash loop prevention.
	/// - Returns: The return value of `closure`.
	static func execute<T>(withIdentifier identifier: String, closure: () throws -> T) throws -> T {
		let result: T
		try CrashLoopPrevention.checkIn(identifier: identifier)

		do {
			result = try closure()
		} catch {
			try CrashLoopPrevention.checkOut(identifier: identifier)
			throw error
		}

		try CrashLoopPrevention.checkOut(identifier: identifier)
		return result
	}

	/// Checks into the crash loop prevention system for the specified identifier.
	///
	/// Prefer ``execute(withIdentifier:closure:)`` over manual check in and check out.
	///
	/// - Parameter identifier: The identifier to check into crash loop prevention.
	/// - Throws: An error if a previous caller never checked out of the system.
	///           This indicates the occurrence of a previous crash. Any further
	///           invocation of the called dynamic function should be stopped
	///           until cleared by an investigation. The error contains details
	///           about the potentially crashed app version, the OS version, and
	///           the last check-in date.
	static func checkIn(identifier: String) throws {
		var checkIns: [String: [String: Any]] = UserDefaults.standard.crashLoopPreventionCheckIns ?? [:]

		if let checkInDictionary: [String: Any] = checkIns[identifier] {
			let checkIn = CheckIn(fromDictionary: checkInDictionary)
			throw Error.openCheckInFound(checkIn)
		}

		let appVersion: String = Bundle.main.object(forInfoDictionaryKey: kCFBundleVersionKey as String) as? String ?? "unknown"
		let osVersion: String = ProcessInfo.processInfo.operatingSystemVersionString
		let checkIn = CheckIn(date: .now, appVersion: appVersion, osVersion: osVersion)
		checkIns[identifier] = checkIn.dictionary

		UserDefaults.standard.set(checkIns, forKey: UserDefaults.CheckIn.key)
	}

	/// Checks out of the crash loop prevention system for the specified identifier.
	///
	/// Prefer ``execute(withIdentifier:closure:)`` over manual check in and check out.
	///
	/// - Parameter identifier: The identifier to check out of crash loop prevention.
	/// - Throws: An error if no check-in was found for `identifier`. This indicates a
	///           programmer error.
	static func checkOut(identifier: String) throws {
		guard
			var checkIns: [String: [String: Any]] = UserDefaults.standard.crashLoopPreventionCheckIns,
			checkIns.keys.contains(identifier)
		else {
			throw Error.openCheckInNotFoundForIdentifier(identifier)
		}

		checkIns[identifier] = nil
		UserDefaults.standard.set(checkIns, forKey: UserDefaults.CheckIn.key)
	}
}

extension CrashLoopPrevention {
	/// Contains the details of a crash loop prevention check-in.
	struct CheckIn {
		let date: Date
		let appVersion: String
		let osVersion: String

		private static let dateKey: String = "Date"
		private static let appVersionKey: String = "App Version"
		private static let osVersionKey: String = "OS Version"

		init(date: Date, appVersion: String, osVersion: String) {
			self.date = date
			self.appVersion = appVersion
			self.osVersion = osVersion
		}

		init(fromDictionary dictionary: [String: Any]) {
			date = dictionary[Self.dateKey] as? Date ?? .distantPast
			appVersion = dictionary[Self.appVersionKey] as? String ?? "unknown"
			osVersion = dictionary[Self.osVersionKey] as? String ?? "unknown"
		}

		var dictionary: [String: Any] {
			[
				Self.dateKey: date,
				Self.appVersionKey: appVersion,
				Self.osVersionKey: osVersion,
			]
		}
	}

	enum Error {
		case openCheckInFound(CheckIn)
		case openCheckInNotFoundForIdentifier(String)
	}
}

extension CrashLoopPrevention.Error: BaseErrorWithAssociatedValues {
	static let domain: String = String(describing: Self.self)

	var errorMessage: String {
		switch self {
		case let .openCheckInFound(checkIn):
			String(localized: "Open check-in found: \(String(describing: checkIn))")
		case let .openCheckInNotFoundForIdentifier(identifier):
			String(localized: "No open check-in found for identifier \(identifier).")
		}
	}

	static let allCases: [CrashLoopPrevention.Error] = [
		.openCheckInFound(CrashLoopPrevention.CheckIn(fromDictionary: [:])),
		.openCheckInNotFoundForIdentifier(""),
	]
}

extension UserDefaults {
	enum CheckIn {}

	var crashLoopPreventionCheckIns: [String: [String: Any]]? {
		object(forKey: UserDefaults.CheckIn.key) as? [String: [String: Any]]
	}
}

extension UserDefaults.CheckIn {
	static let key: String = "Check-In"
}
