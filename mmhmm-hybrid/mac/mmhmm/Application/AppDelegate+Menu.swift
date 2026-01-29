//
//  AppDelegate+Menu.swift
//  mmhmm
//
//  Created by Beni Federer on 18.09.24.
//

import AppKit

extension AppDelegate: NSMenuItemValidation {
	// swiftlint:disable:next cyclomatic_complexity function_body_length
	func validateMenuItem(_ menuItem: NSMenuItem) -> Bool {
		menuItem.ensureCurrentProductName()

		switch menuItem.action {
		case #selector(toggleBetaOptIn):
			return Configuration.validateToggleBetaOptInMenuItem(menuItem)
		case #selector(openPasteboardURL):
			guard
				let pasteboardString = NSPasteboard.general.string(forType: .string),
				let url = URL(string: pasteboardString),
				url.hasHybridAppScheme || url.isOOOAppDomain || url.isAirtimeAppDomain
			else {
				menuItem.isHidden = true
				return false
			}

			menuItem.isHidden = false
			return true
		case #selector(activateCameraExtension):
			return deviceManager.updateCameraExtensionActivationMenuItem(menuItem)
		case #selector(deactivateCameraExtension):
			return deviceManager.updateCameraExtensionDeactivationMenuItem(menuItem)
		case #selector(menuUndo):
			return browser.typeOfWebAppOwningKeyWindow?.supportsUndoRedo ?? NSApp.keyWindow?.firstResponder?.undoManager?.canUndo ?? false
		case #selector(menuRedo):
			return browser.typeOfWebAppOwningKeyWindow?.supportsUndoRedo ?? NSApp.keyWindow?.firstResponder?.undoManager?.canRedo ?? false
		case #selector(toggleBroadcastMode):
			menuItem.title = if browser.creator.broadcastWindowManager?.isPresenting ?? false {
				String(localized: "Hide Broadcast Window")
			} else {
				String(localized: "Show Broadcast Window")
			}
			menuItem.isHidden = (browser.typeOfWebAppOwningKeyWindow?.allowsBroadcastMode ?? false) ? false : true
			return browser.creator.isSignedIn && browser.typeOfWebAppOwningKeyWindow?.allowsBroadcastMode ?? false
		case #selector(toggleRemoteControl):
			menuItem.title = if browser.creator.remoteControlWindowManager?.isPresenting ?? false {
				String(localized: "Hide Speaker Notes")
			} else {
				String(localized: "Show Speaker Notes")
			}
			let supportsRemoteControl: Bool = browser.creator.supportsRemoteControl
			let allowsSpeakerNotes: Bool = browser.typeOfWebAppOwningKeyWindow?.allowsSpeakerNotes ?? false
			menuItem.isHidden = (supportsRemoteControl && allowsSpeakerNotes) ? false : true
			return supportsRemoteControl && allowsSpeakerNotes
		case #selector(reload):
			if browser.typeOfWebAppOwningKeyWindow == nil {
				menuItem.isHidden = true
				return false
			} else {
				let isActive: Bool = !(NSApp.currentEvent?.modifierFlags.contains(.shift) ?? false)
				menuItem.isHidden = !isActive
				return isActive
			}
		case #selector(reloadIgnoringCache):
			if browser.typeOfWebAppOwningKeyWindow == nil {
				menuItem.isHidden = true
				return false
			} else {
				let isActive: Bool = NSApp.currentEvent?.modifierFlags.contains(.shift) ?? false
				menuItem.isHidden = !isActive
				return isActive
			}
		case #selector(toggleBalancedMode):
			guard browser.typeOfWebAppOwningKeyWindow?.supportsBalancedMode ?? false else {
				menuItem.isHidden = true
				return false
			}
			return menuItem.validateAsBalancedModeMenuItem()
		case #selector(showToolbox):
			menuItem.title = if browser.toolbox.isVisible {
				"Hide Toolbox"
			} else {
				"Show Toolbox"
			}
			// Disable hiding the toolbox, when it is the only open window.
			// In this state, either a web app must be selected or the toolbox
			// can be closed to quit the app.
			return appState.webApps != [.toolbox]
		case #selector(showDevTools):
			menuItem.isHidden = Configuration.Release.default.isInternal == false
			return Configuration.Release.default.isInternal
		case #selector(switchMenuBarAppState):
			return loginItemInstaller.validateMenuItem(menuItem)
		default:
			return true
		}
	}
}

extension NSMenuItem {
	fileprivate func ensureCurrentProductName() {
		title = title.replacingOccurrences(of: "mmhmm", with: "Airtime")
	}
}

extension AppDelegate {
	@IBAction private func toggleBetaOptIn(_ sender: Any?) {
		Configuration.toggleBetaOptIn()
	}

	@IBAction private func exportLogFiles(_ sender: Any?) {
		Task { @MainActor in
			await LogFilePacker.promptUserToExportLogFiles()
		}
	}

	@IBAction private func copyLogFilesToPasteboard(_ sender: Any?) {
		LogFilePacker.copyLogFilesArchiveToPasteboard()
	}

	@IBAction private func showHelpRequest(_ sender: Any?) {
		NSWorkspace.shared.open(URL.helpURL)
	}

	@IBAction private func showReleaseNotes(_ sender: Any?) {
		browser.creator.showReleaseNotes()
	}

	@IBAction private func openPasteboardURL(_ sender: Any?) {
		guard
			let pasteboardString = NSPasteboard.general.string(forType: .string),
			let url = URL(string: pasteboardString),
			url.hasHybridAppScheme || url.isOOOAppDomain
		else {
			return
		}

		Logger.logMessage("Opening URL from pasteboard: \(url.absoluteString)", level: .info)

		browser.openURL(url: url)
	}

	@IBAction private func checkForUpdates(_ sender: Any?) {
		updater.checkForUpdates()
	}

	@IBAction private func activateCameraExtension(_ sender: Any?) {
		Task { await deviceManager.activateCameraExtension() }
	}

	@IBAction private func deactivateCameraExtension(_ sender: Any?) {
		Task { await deviceManager.deactivateCameraExtension() }
	}

	@IBAction private func switchMenuBarAppState(_ sender: Any?) {
		loginItemInstaller.switchState()
	}

	@IBAction private func toggleBroadcastMode(_ sender: Any?) {
		if let broadcastWindowManager = browser.creator.broadcastWindowManager, broadcastWindowManager.isPresenting == true {
			broadcastWindowManager.closeWindow()
		} else {
			browser.creator.openBroadcastWindow()
		}
	}

	@IBAction private func toggleRemoteControl(_ sender: Any?) {
		if let remoteControlWindowManager = browser.creator.remoteControlWindowManager, remoteControlWindowManager.isPresenting == true {
			remoteControlWindowManager.closeWindow()
		} else {
			browser.creator.openRemoteControl()
		}
	}

	@IBAction private func showAboutPanel(_ sender: Any?) {
		aboutPanelController.showWindow(sender)
	}

	@IBAction private func reload(_ sender: Any?) {
		reloadBrowser(usingStrategy: .Soft)
	}

	@IBAction private func reloadIgnoringCache(_ sender: Any?) {
		reloadBrowser(usingStrategy: .HardIgnoringCache)
	}

	@IBAction private func showToolbox(_ sender: Any?) {
		browser.toolbox.toggleVisibility()
	}

	@IBAction private func showDevTools(_ sender: Any?) {
		guard let browserID: Int = browser.webAppOwningKeyWindow?.windowManager.browserID else {
			Logger.logMessage("No browser to show dev tools for.", level: .info)
			return
		}

		Logger.logMessage("Showing dev tools for browser \(browserID).", level: .info)

		CxxBridge.showDevTools(Int32(browserID))
	}

	@IBAction private func toggleBalancedMode(_ sender: Any?) {
		guard let menuItem: NSMenuItem = sender as? NSMenuItem else { return }
		menuItem.state = BalancedMode.toggle().controlState
	}

	@IBAction private func menuCloseWindow(_ sender: Any?) {
		guard let keyWindow = NSApp.keyWindow else { return }
		if keyWindow.isBroadcastWindow {
			browser.creator.broadcastWindowManager?.closeWindow()
		} else {
			keyWindow.performClose(sender)
		}
	}

	// CEF messes with the first responder chain which is why we need to reroute the Quit menu action.
	// Sometimes, the first responder chain behaves as expected when initiating the Quit action, but
	// if the main window or the broadcast window is key, the Quit action eventually calls through to
	// [NativeWidgetMacNSWindow performKeyEquivalent:], [RenderWidgetHostViewCocoa performKeyEquivalent:],
	// [RenderWidgetHostViewCocoa keyEvent:wasKeyEquivalent:], which swallow the event.
	@IBAction private func menuQuit(_ sender: Any?) {
		NSApp.terminate(self)
	}

	@IBAction private func menuUndo(_ sender: Any?) {
		if let browserID: Int = browser.webAppOwningKeyWindow?.windowManager.browserID {
			CxxBridge.undoInBrowser(Int32(browserID))
		} else if let firstResponder: NSResponder = NSApp.keyWindow?.firstResponder {
			firstResponder.tryToPerform(#selector(menuUndo), with: sender)
		}
	}

	@IBAction private func menuRedo(_ sender: Any?) {
		if let browserID: Int = browser.webAppOwningKeyWindow?.windowManager.browserID {
			CxxBridge.redoInBrowser(Int32(browserID))
		} else if let firstResponder: NSResponder = NSApp.keyWindow?.firstResponder {
			firstResponder.tryToPerform(#selector(menuRedo), with: sender)
		}
	}
}

extension AppDelegate {
	private func reloadBrowser(usingStrategy strategy: CxxBridge.ReloadStrategy) {
		guard let browserID: Int = browser.webAppOwningKeyWindow?.windowManager.browserID else {
			Logger.logMessage("No browser to reload", level: .info)
			return
		}

		Logger.logMessage("Reloading browser \(strategy == .HardIgnoringCache ? "hard" : "soft")", level: .info)

		CxxBridge.reloadBrowser(Int32(browserID), strategy)
	}
}
