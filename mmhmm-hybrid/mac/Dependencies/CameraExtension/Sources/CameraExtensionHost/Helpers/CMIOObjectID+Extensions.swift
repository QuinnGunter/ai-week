//
//  CMIOObjectID+Extensions.swift
//  CameraExtensionHost
//
//  Created by Matthew Tonkin on 27/10/2022.
//

import CoreMediaIO
import Foundation

import CameraExtensionCommon

extension CMIOObjectID {
	public func stringProperty(forSelector selector: CMIOObjectPropertySelector) -> String? {
		guard let data: Data = propertyData(forSelector: selector), !data.isEmpty else {
			return nil
		}

		var stringValue: String?
		data.withUnsafeBytes { bytes in
			let typedPointer: UnsafeBufferPointer<CFString> = bytes.bindMemory(to: CFString.self)
			if let cfString: CFString = typedPointer.baseAddress?.pointee {
				stringValue = String(cfString as NSString)
			}
		}
		return stringValue
	}

	public func objectIDs(forSelector selector: CMIOObjectPropertySelector) -> [CMIOObjectID]? {
		guard let data: Data = propertyData(forSelector: selector), !data.isEmpty else {
			return nil
		}

		var objectIDs: [CMIOObjectID] = []
		data.withUnsafeBytes {
			objectIDs = Array($0.bindMemory(to: CMIOObjectID.self))
		}
		return objectIDs
	}
}

extension CMIOObjectID {
	private func propertyData(forSelector selector: CMIOObjectPropertySelector) -> Data? {
		let scope = CMIOObjectPropertyScope(kCMIOObjectPropertyScopeGlobal)
		let element = CMIOObjectPropertyElement(0)
		var address = CMIOObjectPropertyAddress(mSelector: selector, mScope: scope, mElement: element)
		guard CMIOObjectHasProperty(self, &address) else {
			return nil
		}

		var size: UInt32 = 0
		var usedSpace: UInt32 = 0
		let sizeResult: OSStatus = CMIOObjectGetPropertyDataSize(self, &address, 0, nil, &size)
		guard sizeResult == kCMIOHardwareNoError else {
			print("CMIOObjectID error reading property data size: \(sizeResult)")
			return nil
		}

		var data = Data(count: Int(size))
		var dataResult: OSStatus = 0
		data.withUnsafeMutableBytes { (bufferPointer: UnsafeMutableRawBufferPointer) in
			dataResult = CMIOObjectGetPropertyData(self, &address, 0, nil, size, &usedSpace, bufferPointer.baseAddress)
		}

		guard dataResult == kCMIOHardwareNoError else {
			print("CMIOObjectID error reading property data: \(dataResult)")
			return nil
		}

		return data
	}
}

extension CMIOStreamID {
	public var streamingClientPIDs: Set<pid_t> {
		guard let joinedClientPIDStrings: String = stringProperty(forSelector: Property.streamingClients.selectorName) else {
			return []
		}

		let clientPIDStrings: [String] = joinedClientPIDStrings.components(separatedBy: ",")
		return Set(clientPIDStrings.compactMap { Int32($0) })
	}
}
