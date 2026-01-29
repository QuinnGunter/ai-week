// swift-tools-version:5.3
// The swift-tools-version declares the minimum version of Swift required to build this package.

import PackageDescription

let package = Package(
	name: "SwiftBuildTools",
	platforms: [.macOS(.v10_11)],
	dependencies: [
		.package(url: "https://github.com/nicklockwood/SwiftFormat", .upToNextMajor(from: "0.49.7")),
		.package(url: "https://github.com/realm/SwiftLint.git", from: "0.54.0"),
	],
	targets: [.target(name: "SwiftBuildTools", path: "")]
)
