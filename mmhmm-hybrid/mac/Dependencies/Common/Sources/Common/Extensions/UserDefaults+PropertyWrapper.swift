//
//  UserDefaults+PropertyWrapper.swift
//  Common
//
//  Created by Beni Federer on 15.04.25.
//

import Combine
import Foundation

/// Persists a value of `T` in `UserDefaults`.
///
/// Provides a publisher, similar to `@Published`.
@propertyWrapper public struct Persisted<T: Codable> {
	private var defaultValue: T
	private var key: String
	private let storage: UserDefaults

	// swiftlint:disable:next private_subject
	public let projectedValue: CurrentValueSubject<T, Never>

	public var wrappedValue: T {
		get {
			// macOS users have access to user defaults, which means
			// previously stored values might disappear at runtime.
			Self.readUserDefault(forKey: key) ?? defaultValue
		}
		set {
			guard let data = try? JSONEncoder().encode(newValue) else {
				assertionFailure("Failed to encode value for key \(key)")
				return
			}
			UserDefaults.standard.set(data, forKey: key)
			projectedValue.send(newValue)
		}
	}

	/// Creates a property wrapper which automatically persists the wrapped value
	/// to the specified user defaults.
	///
	/// The lookup order for the initially projected value depends on the `defaultValue`.
	/// * `Default.value`: user defaults, default value
	/// * `Default.infoPlist`: user defaults, main bundle Info.plist, default value
	/// * `Default.closure`: user defaults, closure, default value
	///
	/// If the previously persisted value is deleted from user defaults at runtime,
	/// the property wrapper falls back to the default value as determined above.
	///
	/// - Parameters:
	///   - storage: The user defaults to use as storage.
	///   - key: The user defaults key associated with the wrapped value.
	///   - defaultValue: A default value used whenever a user default could not
	///                   be found.
	public init(toStorage storage: UserDefaults, key: String, defaultValue: Default) {
		self.storage = storage
		self.key = key
		self.defaultValue = switch defaultValue {
		case let .infoPlist(key, fallbackValue):
			Bundle.main.infoDictionary?[key] as? T ?? fallbackValue
		case let .value(value):
			value
		case let .closure(closure):
			closure()
		}
		projectedValue = CurrentValueSubject<T, Never>(Self.readUserDefault(forKey: key) ?? self.defaultValue)
	}
}

extension Persisted {
	/// A default for the property wrapper.
	public enum Default {
		/// Tries to look up the value in `Info.plist` for the provided key
		/// before falling back to `fallbackValue` as a default.
		case infoPlist(key: String, fallbackValue: T)
		/// Defaults to the provided `value`.
		case value(_ value: T)
		/// A closure that provides the default value.
		case closure(() -> T)
	}
}

extension Persisted {
	private static func readUserDefault(forKey key: String) -> T? {
		if let data: Data = UserDefaults.standard.data(forKey: key) {
			try? JSONDecoder().decode(T.self, from: data)
		} else {
			nil
		}
	}
}
