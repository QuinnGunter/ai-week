//
//  Hardware.swift
//  mmhmm (mmhmmCommon)
//
//  Created by Matthew Tonkin on 13/4/2022.
//

#if os(macOS)
import Foundation
import IOKit
#else
import UIKit
#endif

public enum Hardware {
	public static let identifier: UUID = {
		// https://stackoverflow.com/questions/46672972/uniquely-identifying-an-osx-machine
		#if os(macOS)
		let service: io_service_t = IOServiceGetMatchingService(kIOMainPortDefault, IOServiceMatching("IOPlatformExpertDevice"))
		guard service > 0, let identifier = IORegistryEntryCreateCFProperty(service, kIOPlatformUUIDKey as CFString, kCFAllocatorDefault, 0) else {
			Logger.logMessage("Can not access IOPlatformUUID identifier", level: .info)
			return fallbackHardwareIdentifier
		}

		IOObjectRelease(service)

		guard let identifierString: String = identifier.takeUnretainedValue() as? String, let identifier = UUID(uuidString: identifierString) else {
			return fallbackHardwareIdentifier
		}

		return identifier
		#else
		return UIDevice.current.identifierForVendor ?? fallbackHardwareIdentifier
		#endif
	}()

	private static let fallbackHardwareIdentifier: UUID = {
		if let existingIdentifierString: String = UserDefaults.standard.string(forKey: UserDefaults.mmhmmKey.fallbackHardwareIdentifier), let existingIdentifier = UUID(uuidString: existingIdentifierString) {
			return existingIdentifier
		} else {
			let newIdentifier = UUID()
			UserDefaults.standard.set(newIdentifier.uuidString, forKey: UserDefaults.mmhmmKey.fallbackHardwareIdentifier)
			return newIdentifier
		}
	}()
}

extension UserDefaults.mmhmmKey {
	fileprivate static let fallbackHardwareIdentifier: String = "FallbackHardwareIdentifier"
}
