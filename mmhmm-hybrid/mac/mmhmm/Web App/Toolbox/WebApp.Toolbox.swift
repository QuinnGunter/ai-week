//
//  WebApp.Toolbox.swift
//  mmhmm
//
//  Created by Beni Federer on 04.08.25.
//

import AppKit

import Common

extension WebApp {
	struct ToolboxConfiguration: WebAppConfigurationProtocol {
		static let webAppType: WebApp.WebAppType = .toolbox
	}
}

extension WebApp {
	@MainActor
	final class Toolbox: Base<ToolboxConfiguration> {
		private(set) var hybridAPITesterWindow: NSWindow?
		private var hybridAPITesterBrowserID: Int?

		override func handle(creationInfo: CEFBrowser.CreationInfo) -> Bool {
			guard super.handle(creationInfo: creationInfo) == false else {
				return true
			}

			switch creationInfo.webAppType {
			case .hybridAPITester:
				Logger.logMessage("Adopting hybrid API tester.", level: .info)
				hybridAPITesterBrowserID = creationInfo.browserID
				hybridAPITesterWindow = creationInfo.window
				return true
			default:
				return false
			}
		}

		override func handle(browsingInfo: CEFBrowser.BrowsingInfo) -> Bool {
			guard super.handle(browsingInfo: browsingInfo) == false else {
				return true
			}

			switch browsingInfo.webAppType {
			case .hybridAPITester:
				return true
			default:
				return false
			}
		}

		override func handle(error: Swift.Error, rawURL: String, webApp: WebApp.WebAppType, browserID: Int, isMainFrame: Bool) -> Bool {
			guard super.handle(error: error, rawURL: rawURL, webApp: webApp, browserID: browserID, isMainFrame: isMainFrame) == false else {
				return true
			}

			switch webApp {
			case .hybridAPITester:
				Logger.logError(error, messagePrefix: "Browser failed loading Hybrid API Tester at \(rawURL)", level: .fault)
				return true
			default:
				return false
			}
		}

		override func handle(loadInfo: CEFBrowser.LoadInfo) -> Bool {
			guard super.handle(loadInfo: loadInfo) == false else {
				return true
			}

			switch loadInfo.webAppType {
			case .hybridAPITester:
				return true
			default:
				return false
			}
		}

		override func ownsWindow(_ window: NSWindow) -> Bool {
			window == windowManager.window || window == hybridAPITesterWindow
		}

		override func canClose(window: NSWindow) -> Bool {
			// The toolbox never closes, it just hides, so only allow hybrid API tester window to close.
			window == hybridAPITesterWindow
		}

		override func handleWindowDidClose(ofWebApp webApp: WebApp.WebAppType) -> Bool {
			guard super.handleWindowDidClose(ofWebApp: webApp) == false else {
				return true
			}

			guard webApp == .hybridAPITester else {
				return false
			}

			hybridAPITesterWindow = nil

			return true
		}

		override func ownsBrowser(withID browserID: Int) -> Bool {
			[
				windowManager.browserID,
				hybridAPITesterBrowserID,
			].contains(browserID)
		}

		func emitEventInHybridAPITester(_ event: WebAppEventRepresentable) throws {
			guard let browserID: Int = hybridAPITesterBrowserID else {
				throw Error.webAppNotReady
			}

			try WebApp.EventProxy.shared.emit(event: event, inBrowser: Int32(browserID))
		}

		func openHybridAPITester() {
			guard hybridAPITesterWindow == nil else {
				hybridAPITesterWindow?.makeKeyAndOrderFront(nil)
				return
			}

			guard let browserID: Int = windowManager.browserID else {
				Logger.logMessage("No browser to associate hybrid API tester popup with.", level: .error)
				return
			}

			CxxBridge.openHybridAPITester(Int32(browserID))
		}

		func toggleVisibility() {
			windowManager.isPresenting.toggle()
		}

		var isVisible: Bool {
			windowManager.isPresenting
		}

		/// Closes the toolbox window, does not hide it.
		func close() {
			windowManager.closeWindow()
		}
	}
}
