//
//  ProviderSource.swift
//  CameraExtension
//
//  Copyright © 2022 mmhmm, inc. All rights reserved.
//

import CoreMediaIO
import os.log

import CameraExtensionCommon

public class ProviderSource: NSObject {
	public private(set) var provider: CMIOExtensionProvider?

	private let logger: Logger
	private let deviceSource: DeviceSource

	public init(configuration: Configuration, clientQueue: DispatchQueue? = nil) {
		logger = Logger(subsystem: configuration.logSubsystem, category: configuration.logCategory)
		do {
			deviceSource = try DeviceSource(configuration: configuration, logger: logger)
			guard let device = deviceSource.device else {
				logger.fault("Failed starting camera extension, because device is nil.")
				fatalError("Failed starting camera extension, because device is nil.")
			}
			super.init()
			provider = CMIOExtensionProvider(source: self, clientQueue: clientQueue)
			try provider?.addDevice(device)
		} catch {
			logger.fault("Failed starting camera extension: \(error.localizedDescription, privacy: .public)")
			fatalError("Failed starting camera extension: \(error.localizedDescription)")
		}
	}
}

extension ProviderSource: CMIOExtensionProviderSource {
	public func connect(to client: CMIOExtensionClient) throws {}

	public func disconnect(from client: CMIOExtensionClient) {}

	public var availableProperties: Set<CMIOExtensionProperty> {
		// See full list of CMIOExtensionProperty choices in CMIOExtensionProperties.h
		return [.providerManufacturer]
	}

	public func providerProperties(forProperties properties: Set<CMIOExtensionProperty>) throws -> CMIOExtensionProviderProperties {
		let providerProperties = CMIOExtensionProviderProperties(dictionary: [:])
		if properties.contains(.providerManufacturer) {
			providerProperties.manufacturer = deviceSource.configuration.manufacturer
		}
		return providerProperties
	}

	public func setProviderProperties(_ providerProperties: CMIOExtensionProviderProperties) throws {}
}
