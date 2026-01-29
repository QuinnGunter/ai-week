// swift-tools-version:5.3
import PackageDescription

// NOTE: This is a fork of https://github.com/sparkle-project/Sparkle. The only reason this is not a remote package dependency
//       on the original repo, is that we need to set `SPARKLE_NORMALIZE_INSTALLED_APPLICATION_NAME = 1` as detailed at
//       https://github.com/sparkle-project/Sparkle/discussions/2261 . This change requires a rebuild of Sparkle, the build
//       product of which is pointed to in the `targets` section below, instead the original `url`.
//
//       If app bundle renameability is no longer a requirement, consider replacing this fork with the remote dependency again
//       to make staying up to date much more straightforward.

// Version is technically not required here, SPM doesn't check
// Custom version to indicate `SPARKLE_NORMALIZE_INSTALLED_APPLICATION_NAME = 1` changed via `SPARKLE_VERSION_SUFFIX`.
let version = "2.7.0999"

// Tag is required to point towards the right asset. SPM requires the tag to follow semantic versioning to be able to resolve it.
let tag = "2.7.0"
let checksum = "180c3928b69f980378ea86a586e1f835ac41c8336e59daece29c5730f0f9f75b"
let url = "https://github.com/sparkle-project/Sparkle/releases/download/\(tag)/Sparkle-for-Swift-Package-Manager.zip"

let package = Package(
	name: "Sparkle",
	platforms: [.macOS(.v10_13)], // leaving "10.13" as a breadcrumb for searching
	products: [
		.library(
			name: "Sparkle",
			targets: ["Sparkle"])
	],
	targets: [
		.binaryTarget(
			name: "Sparkle",
			path: "Sparkle.xcframework"
		)
	]
)
