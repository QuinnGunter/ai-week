//
//  AirtimeMenuBarApp.Model.LaunchMode.swift
//  mmhmm
//
//  Created by Beni Federer on 21.08.25.
//

extension AirtimeMenuBarApp.Model {
	enum LaunchMode {
		case webApp(WebApp.WebAppType)
		case lastUsed
	}
}

extension AirtimeMenuBarApp.Model.LaunchMode {
	var userFriendlyName: String {
		switch self {
		case let .webApp(type): type.userFriendlyName
		case .lastUsed: "Last Used"
		}
	}
}

extension AirtimeMenuBarApp.Model.LaunchMode: Identifiable {
	var id: String { userFriendlyName }
}

extension AirtimeMenuBarApp.Model.LaunchMode: CaseIterable {
	static let allCases: [AirtimeMenuBarApp.Model.LaunchMode] = [
		.webApp(.camera),
		.webApp(.creator),
		.webApp(.screenRecorder),
		.webApp(.stacks),
		.lastUsed,
	]

	static let virtualCameraProviders: [AirtimeMenuBarApp.Model.LaunchMode] = [
		.webApp(.camera),
		.webApp(.creator),
		.lastUsed,
	]
}

extension AirtimeMenuBarApp.Model.LaunchMode: RawRepresentable {
	init?(rawValue: String) {
		switch rawValue {
		case "lastUsed":
			self = .lastUsed
		default:
			guard let type = WebApp.WebAppType(rawValue: rawValue) else { return nil }
			self = .webApp(type)
		}
	}

	var rawValue: String {
		switch self {
		case let .webApp(type): type.rawValue
		case .lastUsed: "lastUsed"
		}
	}
}

extension AirtimeMenuBarApp.Model.LaunchMode: Hashable {}
