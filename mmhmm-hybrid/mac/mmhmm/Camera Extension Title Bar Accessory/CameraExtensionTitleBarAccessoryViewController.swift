//
//  CameraExtensionTitleBarAccessoryViewController.swift
//  mmhmm
//
//  Created by Matthew Tonkin on 22/5/2024.
//

import Cocoa
import Combine

import CameraExtensionHost

class CameraExtensionTitleBarAccessoryViewController: NSTitlebarAccessoryViewController {
	private let cameraExtensionStateProvider: DeviceManager.CameraExtensionStateProvider = Application.cefAppDelegate.deviceManager.cameraExtensionStateProvider
	private var subscriptions: Set<AnyCancellable> = []

	@IBOutlet private var disclosureImageView: NSImageView?

	@IBOutlet private var messageLabel: NSTextField? {
		didSet {
			messageLabel?.stringValue = ""
		}
	}

	@IBOutlet private var indicatorImageView: NSImageView? {
		didSet {
			indicatorImageView?.isHidden = true
		}
	}

	@IBAction private func transparentButtonClicked(_ sender: Any) {
		CxxBridge.notifyHybridOfTitlebarButtonClicked()
	}

	override func viewDidLoad() {
		super.viewDidLoad()

		cameraExtensionStateProvider
			.$state
			.removeDuplicates()
			.sink { [weak self] (state: DeviceManager.CameraExtensionStateProvider.State) in
				self?.update(withState: state)
			}
			.store(in: &subscriptions)

		Application
			.cefAppDelegate
			.$webAppSupportViewIsHidden
			.sink { [weak self] in
				self?.updateDisclosureView(withWebAppSupportViewIsHidden: $0)
			}
			.store(in: &subscriptions)
	}

	override func viewDidAppear() {
		super.viewDidAppear()

		NotificationCenter
			.default
			.publisher(for: NSWindow.didResizeNotification, object: view.window)
			.sink { [weak self] _ in
				self?.updateMessageLabelVisibility()
			}
			.store(in: &subscriptions)

		updateMessageLabelVisibility()
	}

	/// A constraint used to collapse the message label's width to zero.
	@IBOutlet private var messageLabelWidthConstraint: NSLayoutConstraint!

	/// Presents or hides the message label depending on window width.
	func updateMessageLabelVisibility(withWindowFrame frame: CGRect? = nil) {
		guard let frame: CGRect = frame ?? view.window?.frame else { return }

		if frame.width < NSWindow.compactWindowMaxSize.width, messageLabelWidthConstraint.isActive == false {
			messageLabelWidthConstraint.isActive = true
		} else if frame.width > NSWindow.compactWindowMaxSize.width, messageLabelWidthConstraint.isActive == true {
			messageLabelWidthConstraint.isActive = false
		}
	}
}

extension CameraExtensionTitleBarAccessoryViewController {
	private func update(withState state: DeviceManager.CameraExtensionStateProvider.State) {
		indicatorImageView?.isHidden = state.hidesIndicatorView
		indicatorImageView?.image = state.image
		indicatorImageView?.contentTintColor = state.symbolColor
		messageLabel?.textColor = state.textColor
		disclosureImageView?.isHidden = state.hidesDisclosureView

		switch state {
		case .unknown:
			messageLabel?.stringValue = ""
		case .installing:
			messageLabel?.stringValue = "The Airtime Virtual Camera is installing…"
		case let .installed(streamClients: streamClients):
			messageLabel?.stringValue = messageLabel(forStreamingClients: streamClients)
		case .awaitingUserApproval, .notInstalled, .uninstalling:
			messageLabel?.stringValue = String(localized: "Enable the Airtime Virtual Camera", comment: "Enable the Airtime Virtual Camera")
		case .requiresReboot:
			messageLabel?.stringValue = String(localized: "Reboot to use the Airtime Virtual Camera", comment: "Reboot to use the Airtime Virtual Camera")
		case .needsUpdate:
			messageLabel?.stringValue = String(localized: "Update the Airtime Virtual Camera", comment: "Update the Airtime Virtual Camera")
		case let .error(error):
			messageLabel?.stringValue = String(localized: "Airtime Virtual Camera error: \(error.localizedDescription)", comment: "Airtime Virtual Camera error")
		}

		updateDisclosureView(withColor: state.symbolColor)
	}

	private func messageLabel(forStreamingClients streamingClients: [StreamingClient]) -> String {
		let consumerApplications: Set<String> = CameraHelper.applicationTitles(forStreamingClients: streamingClients)
		if consumerApplications.count == 1, let applicationName: String = consumerApplications.first {
			let applicationTitle: String = StreamClient.applicationTitle(forProcessName: applicationName)
			return String(localized: "Connected to \(applicationTitle)", comment: "Title bar camera consumer single application connection message")
		} else if consumerApplications.count > 1 {
			return String(localized: "Multiple apps connected", comment: "Title bar camera consumer multiple applications connected message")
		} else {
			return "No apps connected"
		}
	}

	private func updateDisclosureView(withWebAppSupportViewIsHidden webAppSupportViewIsHidden: Bool) {
		let symbolName: String = if webAppSupportViewIsHidden {
			"chevron.down"
		} else {
			"chevron.up"
		}

		let configuration = NSImage.SymbolConfiguration(paletteColors: [messageLabel?.textColor ?? .textColor])
		disclosureImageView?.image = NSImage(systemSymbolName: symbolName, accessibilityDescription: nil)?
			.withSymbolConfiguration(configuration)
	}

	private func updateDisclosureView(withColor color: NSColor) {
		let configuration = NSImage.SymbolConfiguration(paletteColors: [color])
		guard let image = disclosureImageView?.image else { return }
		disclosureImageView?.image = image.withSymbolConfiguration(configuration)
	}
}

extension NSImage {
	fileprivate static var checkmarkCircle: NSImage? {
		let configuration = NSImage.SymbolConfiguration(paletteColors: [.systemGreen])
		return NSImage(systemSymbolName: "checkmark.circle", accessibilityDescription: nil)?
			.withSymbolConfiguration(configuration)
	}

	fileprivate static var infoCircle: NSImage? {
		let configuration = NSImage.SymbolConfiguration(paletteColors: [.systemGreen])
		return NSImage(systemSymbolName: "info.circle", accessibilityDescription: nil)?
			.withSymbolConfiguration(configuration)
	}

	fileprivate static var exclamationTriangle: NSImage? {
		let configuration = NSImage.SymbolConfiguration(paletteColors: [.systemYellow])
		return NSImage(systemSymbolName: "exclamationmark.triangle", accessibilityDescription: nil)?
			.withSymbolConfiguration(configuration)
	}

	fileprivate static var exclamationOctagon: NSImage? {
		let configuration = NSImage.SymbolConfiguration(paletteColors: [.textColor, .systemRed])
		return NSImage(systemSymbolName: "exclamationmark.octagon.fill", accessibilityDescription: nil)?
			.withSymbolConfiguration(configuration)
	}
}

extension DeviceManager.CameraExtensionStateProvider.State {
	fileprivate var image: NSImage? {
		switch self {
		case .unknown:
			nil
		case .notInstalled, .awaitingUserApproval, .installing, .uninstalling:
			NSImage(named: "Symbols/SettingsOnOff") ?? .infoCircle
		case let .installed(clients):
			if clients.isEmpty {
				NSImage(named: "Symbols/NotConnected") ?? .checkmarkCircle
			} else {
				NSImage(named: "Symbols/Connected") ?? .checkmarkCircle
			}
		case .requiresReboot, .needsUpdate:
			.exclamationTriangle
		case .error:
			.exclamationOctagon
		}
	}

	fileprivate var hidesIndicatorView: Bool {
		switch self {
		case .unknown: true
		case .notInstalled, .awaitingUserApproval, .installing, .installed, .requiresReboot, .needsUpdate, .uninstalling, .error: false
		}
	}

	fileprivate var hidesDisclosureView: Bool {
		switch self {
		case .unknown: true
		case .notInstalled, .awaitingUserApproval, .installing, .installed, .requiresReboot, .needsUpdate, .uninstalling, .error: false
		}
	}

	fileprivate var textColor: NSColor {
		switch self {
		case .notInstalled, .awaitingUserApproval, .installing, .uninstalling, .unknown:
			NSColor(named: NSColor.Name("Colors/ActionSecondaryTextOnly")) ?? .textColor
		case .installed, .requiresReboot, .needsUpdate, .error:
			symbolColor
		}
	}

	fileprivate var symbolColor: NSColor {
		switch self {
		case .notInstalled, .awaitingUserApproval, .installing, .uninstalling, .unknown:
			NSColor(named: NSColor.Name("Colors/ActionSecondary")) ?? .textColor
		case let .installed(clients):
			if clients.isEmpty {
				NSColor(named: NSColor.Name("Colors/ContentSecondary")) ?? .textColor
			} else {
				NSColor(named: NSColor.Name("Colors/ActionSuccess")) ?? .textColor
			}
		case .requiresReboot, .needsUpdate: .systemYellow
		case .error: .systemRed
		}
	}
}
