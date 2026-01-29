//
//  Analytics+LoginItemEvent.swift
//  mmhmm
//
//  Created by Beni Federer on 25.09.24.
//

import ServiceManagement

import Mixpanel

extension Analytics {
	enum LoginItemEvent {
		case installed(previousStatus: SMAppService.Status)
		case uninstalled
		case maybeReenabled
	}

	nonisolated func logLoginItemEvent(_ event: LoginItemEvent) {
		Task { await isolatedLogLoginItemEvent(event) }
	}
}

extension Analytics {
	private func isolatedLogLoginItemEvent(_ event: LoginItemEvent) async {
		await isolatedLogEvent(event.name, properties: event.mixpanelProperties)
	}
}

extension Analytics.LoginItemEvent {
	fileprivate var name: String {
		switch self {
		case .installed: "login_item_installed"
		case .uninstalled: "login_item_uninstalled"
		case .maybeReenabled: "login_item_maybe_reenabled"
		}
	}

	fileprivate var mixpanelProperties: [String: MixpanelType]? {
		switch self {
		case let .installed(previousStatus):
			["previous_status": previousStatus.mixpanelValue]
		case .uninstalled, .maybeReenabled:
			nil
		}
	}
}

extension SMAppService.Status {
	fileprivate var mixpanelValue: String {
		switch self {
		case .notFound: "not_found"
		case .enabled: "enabled"
		case .notRegistered: "not_registered"
		case .requiresApproval: "requires_approval"
		@unknown default: "unknown"
		}
	}
}
