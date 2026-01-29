//
//  PropertyListener.swift
//  CameraExtensionHost
//
//  Created by Matthew Tonkin on 27/10/2023.
//  Copyright © 2023 mmhmm, inc. All rights reserved.
//

import CoreMediaIO
import Foundation

final public class PropertyListener {
	public let objectID: CMIOObjectID
	public let selector: CMIOObjectPropertySelector

	@Published public private(set) var propertyValue: String

	private let listenerQueue: DispatchQueue

	public init(objectID: CMIOObjectID, selector: CMIOObjectPropertySelector) throws {
		self.objectID = objectID
		self.selector = selector
		propertyValue = objectID.stringProperty(forSelector: selector) ?? ""

		/// This queue needs to be fast, because data like log messages might come through hot and fast.
		listenerQueue = DispatchQueue(label: "app.mmhmm.cameraExtension.propertyListener.\(selector)", qos: .userInteractive)

		var propertyAddress = CMIOObjectPropertyAddress(mSelector: selector,
														mScope: CMIOObjectPropertyScope(kCMIOObjectPropertyScopeGlobal),
														mElement: CMIOObjectPropertyElement(kCMIOObjectPropertyElementMain))

		let listener: CMIOObjectPropertyListenerBlock = { [weak self] _, _ in
			if let propertyValue: String = objectID.stringProperty(forSelector: selector) {
				self?.propertyValue = propertyValue
			}
		}

		let status: OSStatus = CMIOObjectAddPropertyListenerBlock(objectID, &propertyAddress, listenerQueue, listener)
		if status != kCMIOHardwareNoError {
			throw NSError(domain: "app.mmhmm.cameraExtension.propertyListener",
						  code: 1,
						  userInfo: [NSLocalizedDescriptionKey: "Error \(status) adding property listener for \(selector)"])
		}
	}
}

extension PropertyListener: Equatable {
	public static func == (lhs: PropertyListener, rhs: PropertyListener) -> Bool {
		lhs.objectID == rhs.objectID && lhs.selector == rhs.selector
	}
}
