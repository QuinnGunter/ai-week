// swift-tools-version: 5.9

import PackageDescription

let package = Package(
	name: "CameraExtension",
	platforms: [
		.macOS("13.0"),
	],
	products: [
		.library(
			name: "CameraExtension",
			targets: ["CameraExtension"]
		),
		.library(
			name: "CameraExtensionHost",
			targets: ["CameraExtensionHost"]
		),
	],
	dependencies: [
		.package(url: "https://github.com/apple/swift-collections.git", .upToNextMajor(from: "1.0.0")),
		.package(path: "../Common"),
	],
	targets: [
		.target(
			name: "CameraExtensionCommon"
		),
		.target(
			name: "CameraExtension",
			dependencies: [
				.product(name: "DequeModule", package: "swift-collections"),
				.product(name: "Common", package: "Common"),
				.target(name: "CameraExtensionCommon"),
			]
		),
		.target(
			name: "CameraExtensionHost",
			dependencies: [
				.product(name: "DequeModule", package: "swift-collections"),
				.product(name: "Common", package: "Common"),
				.target(name: "CameraExtensionCommon"),
			]
		),
		.testTarget(
			name: "CameraExtensionTests",
			dependencies: ["CameraExtension"],
			resources: [.process("Resources/no_producer.png")]
		),
	]
)
