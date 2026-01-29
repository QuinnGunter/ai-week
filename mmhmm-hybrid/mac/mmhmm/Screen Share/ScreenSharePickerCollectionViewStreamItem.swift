//
//  ScreenSharePickerCollectionViewStreamItem.swift
//  mmhmm
//
//  Created by Matthew Tonkin on 1/11/2022.
//

import Cocoa
import ScreenCaptureKit

class ScreenSharePickerCollectionViewStreamItem: ScreenSharePickerCollectionViewItem {
	static let identifier = NSUserInterfaceItemIdentifier(rawValue: "ScreenSharePickerCollectionViewStreamItem")

	override var nibName: NSNib.Name? {
		return NSNib.Name("ScreenSharePickerCollectionViewItem")
	}

	private var isAppearing: Bool = false

	override func viewWillAppear() {
		super.viewWillAppear()
		isAppearing = true
		updateStream()
	}

	override func viewWillDisappear() {
		super.viewWillDisappear()
		isAppearing = false
		stream = nil
	}

	override var source: ScreenShare.Source? {
		didSet {
			guard source != oldValue else {
				return
			}

			stream = nil

			if isAppearing {
				updateStream()
			}
		}
	}

	private var addedToStream: Bool = false

	private var stream: SCStream? {
		didSet {
			guard stream != oldValue else {
				return
			}

			if let oldValue {
				oldValue.stopCapture()

				if addedToStream {
					try? oldValue.removeStreamOutput(self, type: .screen)
					addedToStream = false
				}
			}

			guard stream != nil else {
				imageView?.image = nil
				return
			}

			guard let stream = stream else {
				return
			}

			do {
				try stream.addStreamOutput(self,
										   type: .screen,
										   sampleHandlerQueue: DispatchQueue.main)
				addedToStream = true
			} catch {
				Logger.logError(error, messagePrefix: "Failed to add stream output")
				addedToStream = false
				return
			}

			Task {
				do {
					try await stream.startCapture()
				} catch {
					Logger.logError(error, messagePrefix: "Failed to start capture")
				}
			}
		}
	}

	private func updateStream() {
		guard let source else {
			stream = nil
			return
		}

		switch source {
		case let .display(display):
			stream = display.stream(withSize: initialImageViewSize, delgate: self)
		case let .window(window):
			stream = window.stream(withSize: initialImageViewSize, delgate: self)
		case .device:
			// Shouldn't happen, but we need to deal with it anyway
			stream = nil
		}
	}
}

extension ScreenSharePickerCollectionViewStreamItem: @preconcurrency SCStreamOutput {
	func stream(_ stream: SCStream, didOutputSampleBuffer sampleBuffer: CMSampleBuffer, of type: SCStreamOutputType) {
		MainActor.assumeIsolated { [weak self] in
			guard let image: NSImage = sampleBuffer.nsImage else {
				return
			}
			self?.imageView?.image = image
		}
	}
}

extension ScreenSharePickerCollectionViewStreamItem: SCStreamDelegate {
	nonisolated func stream(_ stream: SCStream, didStopWithError error: Error) {
		Logger.logError(error, messagePrefix: "Stream stopped with error")
	}
}

extension CMSampleBuffer {
	fileprivate var nsImage: NSImage? {
		guard let imageBuffer = CMSampleBufferGetImageBuffer(self) else {
			return nil
		}

		let imageRep = NSCIImageRep(ciImage: CIImage(cvPixelBuffer: imageBuffer))
		let image = NSImage(size: imageRep.size)
		image.addRepresentation(imageRep)
		return image
	}
}
