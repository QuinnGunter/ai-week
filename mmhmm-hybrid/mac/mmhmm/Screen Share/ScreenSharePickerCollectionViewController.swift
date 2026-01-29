//
//  ScreenSharePickerCollectionViewController.swift
//  mmhmm
//
//  Created by Matthew Tonkin on 28/9/2022.
//  Copyright © 2022 mmhmm, inc. All rights reserved.
//

import AVKit
import Cocoa
import ScreenCaptureKit

@MainActor
protocol ScreenSharePickerCollectionViewControllerDelegate: AnyObject {
	func screenSharePickerCollectionViewController(_ screenSharePickerCollectionViewController: ScreenSharePickerCollectionViewController, selectedSource source: ScreenShare.Source?)
	func screenSharePickerCollectionViewController(_ screenSharePickerCollectionViewController: ScreenSharePickerCollectionViewController, doubleClickedSource source: ScreenShare.Source)
}

class ScreenSharePickerCollectionViewController: NSViewController {
	weak var delegate: ScreenSharePickerCollectionViewControllerDelegate?

	private enum Section: Int {
		case displays = 0
		case windows = 1
	}

	fileprivate enum Item {
		case display(SCDisplay)
		case window(SCWindow)
		case device(AVCaptureDevice)
	}

	private(set) var displays: Set<SCDisplay> = []
	private(set) var windows: Set<SCWindow> = []
	private(set) var devices: Set<AVCaptureDevice> = []

	private var selectedItem: Item? {
		didSet {
			guard selectedItem != oldValue else {
				return
			}

			let source: ScreenShare.Source?
			if let selectedItem {
				source = self.source(forItem: selectedItem)
			} else {
				source = nil
			}

			delegate?.screenSharePickerCollectionViewController(self, selectedSource: source)
		}
	}

	override func viewDidAppear() {
		super.viewDidAppear()
		collectionView?.becomeFirstResponder()
	}

	func updateContent(displays: Set<SCDisplay>?, windows: Set<SCWindow>?, devices: Set<AVCaptureDevice>?) {
		guard
			// swiftformat:disable indent
			displays?.symmetricDifference(self.displays).isEmpty == false ||
			windows?.symmetricDifference(self.windows).isEmpty == false ||
			devices?.symmetricDifference(self.devices).isEmpty == false
			// swiftformat:enable indent
		else {
			return
		}

		self.displays = displays ?? Set()
		self.windows = windows ?? Set()
		self.devices = devices ?? Set()
		updateDataSource(animated: true)
		restoreSelectedItem()
	}

	private var dataSource: NSCollectionViewDiffableDataSource<Section, Item>?

	private func updateDataSource(animated: Bool) {
		var snapshot = NSDiffableDataSourceSnapshot<Section, Item>()

		// Sort items by ID for stable ordering

		if !displays.isEmpty || !devices.isEmpty {
			snapshot.appendSections([.displays])

			let displayItems: [Item] = displays
				.sorted { $0.displayID < $1.displayID }
				.map { .display($0) }
			snapshot.appendItems(displayItems, toSection: .displays)

			let deviceItems: [Item] = devices
				.sorted { $0.uniqueID < $1.uniqueID }
				.map { .device($0) }
			snapshot.appendItems(deviceItems, toSection: .displays)
		}

		if !windows.isEmpty {
			snapshot.appendSections([.windows])

			let windowItems: [Item] = windows
				.sorted { $0.windowID < $1.windowID }
				.map { .window($0) }
			snapshot.appendItems(windowItems, toSection: .windows)
		}

		dataSource?.apply(snapshot, animatingDifferences: animated)
	}

	@IBOutlet private var collectionView: NSCollectionView? {
		didSet {
			guard let collectionView else {
				return
			}

			collectionView.register(ScreenSharePickerCollectionViewStreamItem.self,
									forItemWithIdentifier: ScreenSharePickerCollectionViewStreamItem.identifier)

			collectionView.register(ScreenSharePickerCollectionViewDeviceItem.self,
									forItemWithIdentifier: ScreenSharePickerCollectionViewDeviceItem.identifier)

			collectionView.register(ScreenSharePickerCollectionViewHeader.self,
									forSupplementaryViewOfKind: NSCollectionView.elementKindSectionHeader,
									withIdentifier: ScreenSharePickerCollectionViewHeader.identifier)

			dataSource = NSCollectionViewDiffableDataSource(collectionView: collectionView) { [weak self] collectionView, indexPath, item in
				let source: ScreenShare.Source? = self?.source(forItem: item)

				let identifier: NSUserInterfaceItemIdentifier
				switch source {
				case .display, .window:
					identifier = ScreenSharePickerCollectionViewStreamItem.identifier
				case .device:
					identifier = ScreenSharePickerCollectionViewDeviceItem.identifier
				case .none:
					// Use something, but this shouldn't happen
					identifier = ScreenSharePickerCollectionViewStreamItem.identifier
				}

				let viewItem: NSCollectionViewItem = collectionView.makeItem(withIdentifier: identifier, for: indexPath)
				guard let pickerItem = viewItem as? ScreenSharePickerCollectionViewItem else {
					return viewItem
				}

				pickerItem.delegate = self
				pickerItem.source = self?.source(forItem: item)
				return pickerItem
			}

			// https://developer.apple.com/forums/thread/656970
			dataSource?.supplementaryViewProvider = { [weak self] (view: NSCollectionView, kind: String, indexPath: IndexPath) -> (NSView & NSCollectionViewElement)? in
				guard kind == NSCollectionView.elementKindSectionHeader else { return nil }

				let view: NSView = collectionView.makeSupplementaryView(ofKind: kind,
																		withIdentifier: ScreenSharePickerCollectionViewHeader.identifier,
																		for: indexPath)

				guard let self, let headerView = view as? ScreenSharePickerCollectionViewHeader else { return nil }

				let section: Section? = if self.displays.isEmpty == false, self.windows.isEmpty == false {
					Section(rawValue: indexPath.section)
				} else if self.displays.isEmpty == false || self.windows.isEmpty {
					.displays
				} else {
					.windows
				}

				switch section {
				case .displays:
					headerView.title = NSLocalizedString("Share entire screen", comment: "Screen sharing entire screen section header title")
				case .windows:
					headerView.title = NSLocalizedString("Share a window", comment: "Screen sharing windows section header title")
				case nil:
					headerView.title = ""
				}

				return headerView
			}

			updateDataSource(animated: false)
		}
	}

	private func source(forItem item: Item) -> ScreenShare.Source? {
		switch item {
		case let .display(display):
			return ScreenShare.Source.display(display)
		case let .window(window):
			return ScreenShare.Source.window(window)
		case let .device(device):
			return ScreenShare.Source.device(device)
		}
	}

	private func updateSelectedItem() {
		guard let selectionIndexPaths: Set<IndexPath> = collectionView?.selectionIndexPaths,
			  selectionIndexPaths.count == 1,
			  let selectionIndexPath: IndexPath = selectionIndexPaths.first,
			  let item: Item = dataSource?.itemIdentifier(for: selectionIndexPath)
		else {
			selectedItem = nil
			return
		}

		selectedItem = item
	}

	private func restoreSelectedItem() {
		guard
			let collectionView,
			let selectedItem,
			let dataSource,
			let indexPath: IndexPath = dataSource.indexPath(for: selectedItem)
		else {
			collectionView?.selectionIndexPaths = []
			return
		}

		guard collectionView.selectionIndexPaths != Set([indexPath]) else {
			return
		}

		collectionView.selectItems(at: Set([indexPath]), scrollPosition: .top)
	}
}

extension ScreenSharePickerCollectionViewController: NSCollectionViewDelegate {
	func collectionView(_ collectionView: NSCollectionView, didSelectItemsAt indexPaths: Set<IndexPath>) {
		updateSelectedItem()
	}

	func collectionView(_ collectionView: NSCollectionView, didDeselectItemsAt indexPaths: Set<IndexPath>) {
		updateSelectedItem()
	}
}

extension ScreenSharePickerCollectionViewController: ScreenSharePickerCollectionViewItemDelegate {
	func screenShareCollectionViewItemDoubleClicked(_ screenRecorderCollectionViewItem: ScreenSharePickerCollectionViewItem) {
		guard let source: ScreenShare.Source = screenRecorderCollectionViewItem.source else {
			return
		}

		delegate?.screenSharePickerCollectionViewController(self, doubleClickedSource: source)
	}
}

extension ScreenSharePickerCollectionViewController.Item: Hashable {
	func hash(into hasher: inout Hasher) {
		switch self {
		case let .display(display):
			hasher.combine(0)
			hasher.combine(display.displayID)
		case let .window(window):
			hasher.combine(1)
			hasher.combine(window.windowID)
		case let .device(device):
			hasher.combine(2)
			hasher.combine(device.uniqueID)
		}
	}

	static func == (lhs: Self, rhs: Self) -> Bool {
		switch (lhs, rhs) {
		case let (.display(lhsDisplay), .display(rhsDisplay)):
			return lhsDisplay.displayID == rhsDisplay.displayID
		case let (.window(lhsWindow), .window(rhsWindow)):
			return lhsWindow.windowID == rhsWindow.windowID
		case let (.device(lhsDevice), .device(rhsDevice)):
			return lhsDevice.uniqueID == rhsDevice.uniqueID
		default:
			return false
		}
	}
}

extension Array where Element == SCWindow {
	@MainActor
	func filtered(hostWindow: NSWindow? = nil) -> [SCWindow] {
		let menuBarHeight: CGFloat = NSApplication.shared.mainMenu?.menuBarHeight ?? NSStatusBar.system.thickness

		let windows: [SCWindow] = filter { (window: SCWindow) in
			// Filter out windows that don't have an application
			// So far, this is just the menu bar
			guard let application: SCRunningApplication = window.owningApplication else {
				return false
			}

			// Filter out system stuff
			// #304 "WindowManager" is for icons from Stage Manager
			guard
				window.isOnScreen,
				application.applicationName != "Dock",
				application.applicationName != "WindowManager"
			else {
				return false
			}

			// Filter out menu bar items
			// If there's a better way to do this, I don't know what it is
			// #298 Adjust for retina by multiplying menuBarHeight by 2 (the easy way)
			guard window.frame.height > menuBarHeight * 2 else {
				return false
			}

			// #304 Filter out Stage Manager windows. These have a low x origin and small size
			if window.frame.origin.x < 64, window.frame.width < 200, window.frame.height < 200 {
				return false
			}

			// Filter out the window hosting this view
			if let hostWindow, window.windowID == hostWindow.windowNumber {
				return false
			}

			return true
		}

		return windows.sorted(by: { (first: SCWindow, second: SCWindow) in
			let firstTitle: String = first.displayTitle ?? ""
			let secondTitle: String = second.displayTitle ?? ""
			return firstTitle.caseInsensitiveCompare(secondTitle) == .orderedAscending
		})
	}
}
