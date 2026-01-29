//
//  AppDelegate+TestMenu.swift
//  mmhmm
//
//  Created by Beni Federer on 25.07.24.
//

import AppKit

import Common

extension AppDelegate {
	@IBAction private func toggleMainAppWindowFloating(_ sender: Any?) {
		guard let window: NSWindow = browser.webAppOwningKeyWindow?.windowManager.window else { return }
		window.isFloating.toggle()
		browser.updateHybridWithAppWindows()
	}

	@IBAction private func emitTestEventInKeyWindowWebApp(_ sender: Any?) {
		guard let webApp: WebAppProtocol = browser.webAppOwningKeyWindow else { return }

		let event = WebApp.EventProxy.GenericEvent(name: "test", payload: ["foo": "bar", "number": "42"])

		do {
			if webApp.webAppType == .toolbox, NSApp.keyWindow == browser.toolbox.hybridAPITesterWindow {
				try browser.toolbox.emitEventInHybridAPITester(event)
			} else {
				try webApp.emit(event: event)
			}
		} catch {
			Logger.logError(error, messagePrefix: "Failed to emit test event in key window web app")
		}
	}

	@IBAction private func resetCaptureDevicePermissionsAndRelaunch(_ sender: Any?) {
		guard let bundleIdentifier: String = Bundle.main.bundleIdentifier else { fatalError("Bundle identifier not found.") }
		let script: String = "tccutil reset Microphone \(bundleIdentifier); tccutil reset Camera \(bundleIdentifier)"
		let shellBinaryURL: URL = URL(fileURLWithPath: "/bin/sh")
		do {
			let process = try Process.run(shellBinaryURL, arguments: ["-c", script])
			process.waitUntilExit()
			try NSApp.relaunch()
		} catch {
			fatalError("Failed to reset capture device permissions and relaunch: \(error.localizedDescription).")
		}
	}

	@IBAction private func submitLoggerTestMessage(_ sender: Any?) {
		Logger.logMessage("This is a submitted test message.", level: .fault)
	}

	@IBAction private func submitLoggerTestError(_ sender: Any?) {
		Logger.logError(TestError.menuTestError, messagePrefix: "Submitting TestError", level: .fault)
	}

	@IBAction private func logInfoAndErrorTestMessages(_ sender: Any?) {
		Logger.logMessage("This is a test info message.", level: .info)
		Logger.logMessage("This is a test error message, which must crash debug, but not release.", level: .error)
	}

	@IBAction private func logInfoAndErrorTestMessagesNotAsserting(_ sender: Any?) {
		Logger.logMessage("This is a test info message.", level: .info)
		Logger.logMessage("This is a test error message, which must not crash.", level: .error, targets: .uncheckedAll)
	}

	@IBAction private func logInfoMessageAndError(_ sender: Any?) {
		Logger.logMessage("This is a test info message.", level: .info)
		Logger.logError(TestError.menuTestError, messagePrefix: "Logging TestError")
	}

	@IBAction private func logInfoMessageAndErrorNotAsserting(_ sender: Any?) {
		Logger.logMessage("This is a test info message.", level: .info)
		Logger.logError(TestError.menuTestError, messagePrefix: "Logging TestError", targets: .uncheckedAll)
	}

	@IBAction private func logAndClearThrottledErrors(_ sender: Any?) {
		Task { await Logger.flushAndLogThrottledErrors() }
	}

	@IBAction private func logAndClearThrottledMessages(_ sender: Any?) {
		Task { await Logger.flushAndLogThrottledMessages() }
	}

	@IBAction private func logOneMebibyteWorthOfMessagesToFile(_ sender: Any?) {
		Task { await Logger.logApproximatelyOneMebibyteToFileUnthrottled() }
	}

	@IBAction private func copyAppVersion(_ sender: Any?) {
		SystemReporter.copyAppVersionToPasteboard()
	}

	@IBAction private func showActivityLog(_ sender: Any?) {
		NSWorkspace.shared.open(URL.nativeAppLogFilePath)
	}

	@IBAction private func showHybridAPITester(_ sender: Any?) {
		browser.toolbox.openHybridAPITester()
	}

	@IBAction private func showSegmentationPanel(_ sender: Any?) {
		guard let browserID: Int = browser.webAppOwningKeyWindow?.windowManager.browserID else {
			Logger.logMessage("No browser to associate segmentation panel popup with.", level: .info)
			return
		}

		CxxBridge.openSegmentationPanel(Int32(browserID))
	}
}

extension AppDelegate {
	private enum TestError: Int, BaseError {
		case menuTestError

		static let domain: String = String(describing: Self.self)

		var errorMessage: String {
			switch self {
			case .menuTestError: return "This is a TestError message."
			}
		}
	}
}
