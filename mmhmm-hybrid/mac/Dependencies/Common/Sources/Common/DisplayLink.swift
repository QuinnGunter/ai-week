//
//  DisplayLink.swift
//  Common
//
//  Created by Beni Federer on 13.06.25.
//

import CoreVideo

/// Replacement for `CADisplayLink` before macOS 14.
final public class DisplayLink {
	private var displayLink: CVDisplayLink?
	private var closure: (() -> Void)?

	public init() {}

	public func start(closure: @escaping () -> Void) {
		CVDisplayLinkCreateWithActiveCGDisplays(&displayLink)
		guard let displayLink else { return }

		self.closure = closure

		let callback: CVDisplayLinkOutputCallback = { _, _, _, _, _, userInfo -> CVReturn in
			guard let userInfo else {
				return kCVReturnInvalidArgument
			}

			let displayLink: DisplayLink = Unmanaged<DisplayLink>.fromOpaque(userInfo).takeUnretainedValue()
			displayLink.closure?()
			return kCVReturnSuccess
		}

		CVDisplayLinkSetOutputCallback(displayLink, callback, UnsafeMutableRawPointer(Unmanaged.passUnretained(self).toOpaque()))
		CVDisplayLinkStart(displayLink)
	}

	public func stop() {
		guard let displayLink else { return }
		CVDisplayLinkStop(displayLink)
		closure = nil
	}

	deinit {
		stop()
	}
}
