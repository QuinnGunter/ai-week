//
//  AboutPanelWindowController.swift
//  mmhmm
//
//  Created by Matthew Tonkin on 3/10/20.
//  Copyright © 2020 mmhmm, inc. All rights reserved.
//

import AppKit
import Combine
import Metal

class AboutPanelWindowController: NSWindowController {
	private let systemReporter = SystemReporter()
	private var appVersionSubscription: AnyCancellable?

	override var windowNibName: NSNib.Name? {
		return String(describing: Self.self)
	}

	override func windowDidLoad() {
		super.windowDidLoad()
		window?.center()
		let appVersionDescription: String = SystemReporter.appVersionDescription(withVersionDetail: "")
		appVersionLabel?.stringValue = String(localized: "Version \(appVersionDescription)")
	}

	// MARK: - App Build

	@IBOutlet private var appVersionLabel: NSTextField?

	private var appBuildDisplayMode: SystemReporter.AppBuildDisplayMode = .raw {
		didSet {
			guard appBuildDisplayMode != oldValue else {
				return
			}
			updateAppBuildLabel()
		}
	}

	private func updateAppBuildLabel() {
		appBuildLabel?.stringValue = SystemReporter.appBuildString(mode: appBuildDisplayMode)
	}

	@IBOutlet private var appBuildLabel: NSTextField? {
		didSet {
			updateAppBuildLabel()
		}
	}

	@IBAction private func toggleAppBuildDisplayMode(_ sender: Any?) {
		switch appBuildDisplayMode {
		case .raw:
			appBuildDisplayMode = .localDate
		case .localDate:
			appBuildDisplayMode = .utcDate
		case .utcDate:
			appBuildDisplayMode = .raw
		}
	}

	// MARK: - OS Version

	@IBOutlet private var osVersionLabel: NSTextField? {
		didSet {
			osVersionLabel?.stringValue = SystemReporter.osVersionString
		}
	}

	// MARK: - Copyright

	@IBOutlet private var copyrightLabel: NSTextField? {
		didSet {
			copyrightLabel?.stringValue = Bundle.main.infoDictionary?["NSHumanReadableCopyright"] as? String ?? ""
		}
	}

	// MARK: - Acknowledgements

	private lazy var acknowledgementsController: AboutPanelAcknowledgementsWindowController = AboutPanelAcknowledgementsWindowController()

	@IBAction private func showAcknowledgements(_ sender: Any?) {
		guard let acknowledgementsWindow = acknowledgementsController.window else {
			return
		}
		window?.beginSheet(acknowledgementsWindow)
	}

	// MARK: - Copy

	@IBAction private func copy(_ sender: Any?) {
		copyVersion(sender)
	}

	@IBAction private func copySystemReport(_ sender: Any?) {
		LogFilePacker.copySystemReportToPasteboard()
	}

	@IBAction private func copyVersion(_ sender: Any?) {
		SystemReporter.copyAppVersionToPasteboard()
	}
}

@IBDesignable
class AboutPanelBackgroundView: NSView {
	override func draw(_ dirtyRect: NSRect) {
		NSColor(named: "about-panel-background")?.setFill()
		bounds.fill()
	}
}
