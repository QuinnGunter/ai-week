//
//  Sparkle+LogDescription.swift
//  mmhmm
//
//  Created by Beni Federer on 22.07.24.
//

import Foundation

import Sparkle

// These extensions are intentionally not conforming to protocols like `CustomDebugStringConvertible`, because
// we own neither these predefined protocols not the Sparkle implementations.
//
// Swift 6 introduces the `@retroactive` keyword to allow shenanigans, but in doing so also discourages the practice.
// https://github.com/swiftlang/swift-evolution/blob/main/proposals/0364-retroactive-conformance-warning.md

extension SUAppcast {
	/// A description of the first three items in the appcast.
	var logDescription: String {
		// Find a valid end index for the first three or less items.
		let upToThree: Int = min(items.count, 3)
		let itemsLogDescription: String = items[..<upToThree]
			.map { $0.logDescription }
			.joined(separator: ",")
		let suffix: String = if items.count > 3 { ", ..." } else { "" }
		return "Items: " + itemsLogDescription + suffix
	}
}

extension SUAppcastItem {
	var logDescription: String {
		"\(title ?? "Unknown"): \(itemDescription?.firstHTMLHeader1Content ?? itemDescription ?? "Unknown")"
	}
}

extension String {
	/// The content of the first <h1> block within A HTML string's <body> block.
	fileprivate var firstHTMLHeader1Content: String? {
		guard
			let bodyStartTag: Range = range(of: "<body>"),
			let bodyEndTag: Range = range(of: "</body>")
		else {
			return nil
		}

		let bodyRange = Range(uncheckedBounds: (bodyStartTag.upperBound, bodyEndTag.lowerBound))
		let body: Substring = self[bodyRange]

		guard
			let h1StartTag: Range = body.range(of: "<h1>"),
			let h1EndTag: Range = body.range(of: "</h1>")
		else {
			return nil
		}

		let h1Range = Range(uncheckedBounds: (h1StartTag.upperBound, h1EndTag.lowerBound))
		return String(body[h1Range])
	}
}

extension SPUUserUpdateChoice {
	var logDescription: String {
		switch self {
		case .dismiss: "dismiss"
		case .install: "install"
		case .skip: "skip"
		@unknown default: "unknown"
		}
	}
}

extension SPUUserUpdateStage {
	var logDescription: String {
		switch self {
		case .downloaded: "downloaded"
		case .installing: "installing"
		case .notDownloaded: "not downloaded"
		@unknown default: "unknown"
		}
	}
}

extension SPUUserUpdateState {
	var logDescription: String {
		"\(userInitiated ? "" : "not ")user initiated \(stage.logDescription) stage"
	}
}
