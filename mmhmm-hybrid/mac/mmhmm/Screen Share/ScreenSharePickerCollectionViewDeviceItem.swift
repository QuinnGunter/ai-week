//
//  ScreenSharePickerCollectionViewDeviceItem.swift
//  mmhmm
//
//  Created by Matthew Tonkin on 1/11/2022.
//

import Cocoa

class ScreenSharePickerCollectionViewDeviceItem: ScreenSharePickerCollectionViewItem {
	static let identifier = NSUserInterfaceItemIdentifier(rawValue: "ScreenSharePickerCollectionViewDeviceItem")

	override var nibName: NSNib.Name? {
		return NSNib.Name("ScreenSharePickerCollectionViewItem")
	}

	private lazy var snapshotGenerator = AVCaptureDeviceSnapshot()

	override var source: ScreenShare.Source? {
		didSet {
			guard source != oldValue else {
				return
			}

			guard
				let source,
				case let .device(device) = source
			else {
				imageView?.image = nil
				return
			}

			snapshotGenerator.createSnapshot(from: device) { [weak self] (image: NSImage?) in
				Task { @MainActor in
					self?.imageView?.image = image
				}
			}
		}
	}
}
