//
//  OSSystemExtension+Sendable.swift
//  CameraExtensionHost
//
//  Created by Beni Federer on 30.10.24.
//

import SystemExtensions

extension OSSystemExtensionRequest: @unchecked Sendable {}
extension OSSystemExtensionProperties: @unchecked Sendable {}
extension OSSystemExtensionRequest.Result: @unchecked Sendable {}
