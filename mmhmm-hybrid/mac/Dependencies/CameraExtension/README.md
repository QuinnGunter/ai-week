# CameraExtension

This package unifies the Core Media I/O camera extension used in mmhmm Studio and mmhmm Hybrid.
For framework specific documentation and sample code see [here][1].

## Getting Started

1. Set up a new target as described in [Creating a camera extension with Core Media I/O][2].
2. Add this package.
3. Adopt the `CameraConfiguration` protocol.

```swift
struct MyCameraConfiguration: CameraConfiguration {
	// define protocol implementation
}
```

4. Edit the project's' `main.swift` file to use `CameraProviderSource.`

```swift
import Foundation
import CoreMediaIO

import CameraExtension

// NOTE: Don't try-catch here. It will break the CMIO registration of this camera.

let providerSource = CameraProviderSource(configuration: MyCameraConfiguration())
CMIOExtensionProvider.startService(provider: providerSource.provider)

CFRunLoopRun()
```

## Debugging Camera Extensions

The Apple documentation [Debugging and testing system extensions][3] gives a good overview.
In general, the following changes ease the pain of developing and debugging a camera extension.

* [Disable SIP][4] to disable codesigning and notarization checks, as well as to allow configuring system extensions with the `systemextensionsctl` CLI. 
* In Terminal, enter `% systemextensionsctl developer on` to allow system extensions to be installed from app bundles outside of the `Application` folder.
  This allows installing the camera extension directly out of a debug build run from within Xcode.
* The `systemextensionsctl list` command gives an overview over currently installed and in/active camera extensions, including their team and bundle IDs.
* Use `systemextensionsctl uninstall <teamId> <bundleId>` to remove a camera extension quickly before running one of our apps to prompt an installation dialog. 

Note that attaching the debugger to a camera extension in Xcode might or might not work. It does for me in Studio, but for some reason not in Hybrid.
Consider consulting the camera extension logs as an alternative, or, as a last resort, add code to [log to the system console][5]. 

[1]: https://developer.apple.com/documentation/coremediaio
[2]: https://developer.apple.com/documentation/coremediaio/creating_a_camera_extension_with_core_media_i_o
[3]: https://developer.apple.com/documentation/driverkit/debugging_and_testing_system_extensions
[4]: https://developer.apple.com/documentation/security/disabling_and_enabling_system_integrity_protection
[5]: https://developer.apple.com/documentation/os/logging/generating_log_messages_from_your_code
