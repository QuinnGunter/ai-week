//
//  main.swift
//  CameraExtension
//
//  Copyright © 2020 mmhmm, inc. All rights reserved.
//

import CoreMediaIO
import Foundation

import CameraExtension

// NOTE: Don't try-catch here. It will break the CMIO registration of this camera.

let providerSource = ProviderSource(configuration: VirtualCameraExtension.HybridConfiguration())

guard let provider = providerSource.provider else {
	fatalError("Terminating because provider is nil.")
}

CMIOExtensionProvider.startService(provider: provider)

CFRunLoopRun()
