//
//  Configuration+RemoveOverrides.swift
//  mmhmm
//
//  Created by Beni Federer on 07.08.25.
//

import AppKit

#if DEBUG
extension Configuration {
	@MainActor
	static func removeOverrides() {
		Release.override = nil
		Release.updateOverride = nil
		Service.override = nil
		urlOverrides = nil

		do {
			try NSApplication.shared.relaunch()
		} catch {
			NSAlert(error: error).runModal()
		}
	}
}
#else
extension Configuration {
	@MainActor
	static func removeOverrides() {
		Service.override = nil
		urlOverrides = nil

		do {
			try NSApplication.shared.relaunch()
		} catch {
			NSAlert(error: error).runModal()
		}
	}
}
#endif
