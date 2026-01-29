//
//  Configuration.ServiceTests.swift
//  mmhmmTests
//
//  Created by Beni Federer on 23.10.24.
//

import Testing

@Suite("Service Configuration Dependent on User Defaults", .serialized)
class ServiceDependingOnUserDefaultsTests {
	private let tempStorage: String?
	static let key: String = UserDefaults.mmhmmKey.serviceConfiguration

	init() {
		// Store the initially active release override
		tempStorage = UserDefaults.standard.string(forKey: Self.key)
		// Remove the override, if any
		UserDefaults.standard.removeObject(forKey: Self.key)
	}

	deinit {
		// Ensure the initially active release override is restored
		UserDefaults.standard.set(tempStorage, forKey: Self.key)
	}

	@Test("Default service is production")
	func defaultService() async throws {
		#expect(Configuration.Service.default == .production)
	}

	@Test("Default service is override", arguments: Configuration.Service.allCases)
	func defaultServiceOverride(_ override: Configuration.Service) async throws {
		UserDefaults.standard.set(override.stringValue, forKey: Self.key)
		#expect(Configuration.Service.default == override)
	}

	@Test("Default service string value")
	func defaultServiceStringValue() async throws {
		#expect(Configuration.Service.default.stringValue == "production")
	}

	@Test("Default service string value with override", arguments: Configuration.Service.allCases)
	func defaultStringStringValue(withOverride override: Configuration.Service) async throws {
		UserDefaults.standard.set(override.stringValue, forKey: Self.key)
		switch override {
		case .development:
			#expect(override.stringValue == "development")
		case .stage:
			#expect(override.stringValue == "stage")
		case .production:
			#expect(override.stringValue == "production")
		}
	}
}

@Suite("Service Configuration")
struct ServiceTests {
	@Test("Service string value", arguments: Configuration.Service.allCases)
	func serviceStringValue(_ service: Configuration.Service) async throws {
		switch service {
		case .development:
			#expect(service.stringValue == "development")
		case .stage:
			#expect(service.stringValue == "stage")
		case .production:
			#expect(service.stringValue == "production")
		}
	}
}

extension Configuration.Service: CaseIterable {
	public static let allCases: [Configuration.Service] = [
		.development,
		.stage,
		.production,
	]
}
