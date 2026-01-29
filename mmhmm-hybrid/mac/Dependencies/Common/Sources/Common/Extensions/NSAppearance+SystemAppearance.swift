//
//  NSAppearance+SystemAppearance.swift
//  Common
//
//  Created by Beni Federer on 15.01.25.
//

import AppKit

extension NSAppearance {
	/// An appearance matching the system-wide appearance.
	///
	/// This implementation is one of many possible, not necessarily
	/// widely applicable or working solutions. For details see
	/// https://stackoverflow.com/questions/25207077/how-to-detect-if-os-x-is-in-dark-mode
	public static var systemAppearance: Self? {
		if UserDefaults.AppleInterfaceStyle.isDark {
			Self(named: .darkAqua)
		} else {
			Self(named: .aqua)
		}
	}
}

extension UserDefaults {
	// swiftlint:disable identifier_name
	/// A user default exposing the system dark mode for use with KVO.
	///
	/// Since KVO only works if the `@obc dynamic var` has the exact
	/// same name as the user default key, this property must start with
	/// a capital letter.
	@objc dynamic public var AppleInterfaceStyle: String? {
		string(forKey: UserDefaults.AppleInterfaceStyle.Key)
	}
	// swiftlint:enable identifier_name
}

extension UserDefaults {
	enum AppleInterfaceStyle {
		static let Key: String = "AppleInterfaceStyle"
		static let Dark: String = "Dark"

		static var isDark: Bool {
			standard.string(forKey: Key) == Dark
		}
	}
}
