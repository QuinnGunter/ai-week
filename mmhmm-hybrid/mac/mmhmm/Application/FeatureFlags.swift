//
//  FeatureFlags.swift
//  mmhmm
//
//  Created by Beni Federer on 16.10.24.
//

enum FeatureFlags {}

extension FeatureFlags {
	enum DebugInfo {}
	enum MenuBarLoginItem {}
	enum UpdaterOverrides {}
	enum Stacks {}
}

extension FeatureFlags.DebugInfo {
	static var toolbarItemIsAvailable: Bool {
		Configuration.Release.default <= .alpha && Configuration.hasOverrides
	}

	static var logsDebugMessages: Bool {
		Configuration.Release.default <= .alpha
	}
}

extension FeatureFlags.MenuBarLoginItem {
	static var isAvailable: Bool {
		// Disables the menu bar login item in menus.
		false
	}
}

extension FeatureFlags.UpdaterOverrides {
	static var automaticallyDownloadsUpdates: Bool {
		// Force updates on internal users
		Configuration.Release.default == .alpha
	}
}
