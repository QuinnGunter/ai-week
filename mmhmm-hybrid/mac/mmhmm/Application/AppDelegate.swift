//
//  AppDelegate.swift
//  mmhmm
//
//  Created by Beni Federer on 27.06.24.
//

import Cocoa
import Combine

import Common
import CxxCEF

@MainActor
class AppDelegate: NSObject, CEFApplicationDelegate {
	@IBOutlet private var testsMenuItem: NSMenuItem!
	@IBOutlet private var performanceMenuItem: NSMenuItem!

	/// Indicates whether the camera extension support view
	/// presented by the web app is visible.
	@Published var webAppSupportViewIsHidden: Bool = true

	let appState = AppState()
	let browser: Browser
	let deviceManager: DeviceManager
	let loginItemInstaller = LoginItemInstaller(identifier: AirtimeMenuProxy.airtimeMenuBundleIdentifier)
	let powerMonitor = PowerMonitor()
	let remoteControlManager: RemoteControlManager
	let sessionMonitor = SessionMonitor()
	let systemVideoEffectsMonitor = SystemVideoEffectsMonitor()
	let updater = Updater()

	private(set) var finishedSetup: Bool = false
	private(set) lazy var aboutPanelController = AboutPanelWindowController()

	private var collectionBehaviorTemporaryStorage: NSWindow.CollectionBehavior = []
	private var relaunchAlertNotShown: Bool = true
	private var subscriptions: Set<AnyCancellable> = []

	override init() {
		SystemReporter.logAppInfoLaunchSummary()
		Configuration.logSummary()
		loginItemInstaller.logSummary()

		InterprocessMessenger.shared.errorHandler = { _, error in
			Logger.logError(error, messagePrefix: "Failed to handle IPC message")
		}

		browser = Browser(appState: appState)
		Analytics.shared.appState = appState
		deviceManager = DeviceManager()
		remoteControlManager = RemoteControlManager(
			appState: appState,
			browser: browser,
			cameraExtensionStateProvider: deviceManager.cameraExtensionStateProvider,
			loginItemInstaller: loginItemInstaller
		)

		super.init()

		if let hybridStartupRequest = WebApp.WebAppType.hybridStartupRequest {
			// Requested via command line flag.
			Logger.logMessage("Overriding web apps \(appState.webApps.userFriendlyNames) with requested web app \(hybridStartupRequest).", level: .info)
			appState.webApps = [hybridStartupRequest]
		}

		deviceManager.delegate = self
		subscriptions = subscribeToChangeEvents()
	}

	override func awakeFromNib() {
		super.awakeFromNib()
		Task { @MainActor in
			testsMenuItem.isHidden = !Configuration.Release.default.allowsDebugTools
			performanceMenuItem.updateAsPerformanceMenuItem()
		}
	}

	func tryToTerminateApplication(_ app: NSApplication) {
		browser.toolbox.windowManager.closeWindow()
		CxxBridge.closeAllWindows(false)
	}
}

extension AppDelegate: NSApplicationDelegate {
	func applicationWillFinishLaunching(_ notification: Notification) {
		registerInternetAppleEventHandler()
	}

	func applicationDidFinishLaunching(_ notification: Notification) {
		Analytics.shared.logEvent("finished_launch")

		if loginItemInstaller.status == .notInstalled {
			loginItemInstaller.install()
		}

		#if !DEBUG && !TEST
		do {
			Logger.logMessage("Starting app bundle mover.", level: .info)
			let appBundleMover = AppBundleMover(delegate: self)
			try appBundleMover.presentAlert()
		} catch let error where error.isBenignAppBundleMoverError {
			Logger.logMessage("App bundle mover cancelled: \(error.localizedDescription)", level: .info)
		} catch {
			Logger.logError(error, messagePrefix: "Failed to move app bundle")
			NSAlert.showAlert(withMessageText: String(localized: "Failed to move Airtime to Applications folder."), informativeText: error.localizedDescription)
		}
		#endif

		Task { await launchWebApp() }
	}

	func applicationWillTerminate(_ notification: Notification) {
		cleanup()
		deviceManager.stopStreamDeckManager()

		// The following appears to be working in that the detached
		// task is allowed to run even after the main thread stopped.
		Task.detached(priority: .userInitiated) {
			await Logger.flushAndLogThrottledErrors()
			await Logger.flushAndLogThrottledMessages()
			// Do this last to ensure all shutdown analytics have been collected.
			await Analytics.shared.prepareForShutdown()
			Logger.logMessage("Shutdown complete", level: .info)
			// Sleep to give the asynchronous analytics shutdown
			// and the logger some time to finish.
			try await Task.sleep(for: .seconds(0.5))
		}
	}

	func applicationShouldTerminate(_ sender: NSApplication) -> NSApplication.TerminateReply {
		return .terminateNow
	}

	func application(_ application: NSApplication, continue userActivity: NSUserActivity, restorationHandler: @escaping ([any NSUserActivityRestoring]) -> Void) -> Bool {
		guard let url = userActivity.webpageURL else { return false }
		Logger.logMessage("Continuing user activity with URL: \(url.absoluteString)", level: .info)
		browser.openURL(url: url)
		return true
	}
}

// MARK: - Launching

extension AppDelegate {
	private func launchWebApp() async {
		// Update hybrid state before creating the initial root window.
		// The hybrid state is injected into each CEF window's browser
		// as a V8 object exposed as a `gHybrid` JavaScript global constant.

		browser.updateHybridWithAppWindows()
		await deviceManager.updateHybridWithVirtualCamera()
		await deviceManager.updateHybridWithAppCapabilities()
		await deviceManager.startDevices()

		do {
			try await powerMonitor.startMonitoringForHybrid()
			try await sessionMonitor.startMonitoringForHybrid()
			try await systemVideoEffectsMonitor.startMonitoringForHybrid()
		} catch {
			Logger.logError(error, messagePrefix: "Failed to start monitoring")
		}

		mmhmm.PowerMonitor.updateHybridWithCurrentState()

		// Preference of web app configuration on launch:
		// 1. The web app requested by the browser or the menu bar app via hybrid scheme URL.
		// 2. The web apps configuration in memory, which was previously determined based on
		//    * the `--web-app` command line flag,
		//    * previously stored user defaults,
		//    * Info.plist defaults reflecting different installer flavors,
		//    * a hard coded default web app.
		// 3. If all of the above fail, the toolbox is presented.

		if let requestedWebAppType = browser.requestedWebAppType {
			Logger.logMessage("Overriding web apps \(appState.webApps.userFriendlyNames) with requested web app \(requestedWebAppType.userFriendlyName).", level: .info)
			appState.webApps = [requestedWebAppType]
		} else if appState.webApps.isEmpty {
			Logger.logMessage("No web apps to launch, defaulting to toolbox.", level: .info)
			appState.webApps = [.toolbox]
		} else if appState.webApps != [.toolbox] {
			// Since the toolbox is always present in `appState.webApps`,
			// it is automatically persisted when the app quits. However,
			// the toolbox is never shown alongside other web apps on launch.
			// The toolbox will be launched either way, but removing it here
			// indicates that it should be launched in a hidden state.
			appState.removeWebApp(.toolbox)
		}

		if appState.webApps.contains(.toolbox) == false {
			// Preload the toolbox window in a hidden state to avoid visible load flickering.
			Logger.logMessage("Launching toolbox in background.", level: .info)
			Task { @MainActor [weak self] in
				self?.browser.toolbox.launch(initiallyHidden: true)
			}
		}

		Logger.logMessage("Launching web apps: \(appState.webApps.userFriendlyNames)", level: .info)

		Task { @MainActor [weak self] in
			guard let self else { return }

			self.appState.webApps.forEach {
				self.browser.launchWebApp(ofType: $0)
			}
			self.remoteControlManager.start()
			self.finishedSetup = true
		}

		Analytics.shared.logEvent("finished_load")
		Logger.logMessage("Finished main app setup.", level: .info)

		// Signal to the IPC messenger that the render process is ready to receive messages.
		InterprocessMessenger.shared.receiverProcessIsReady = true
	}

	private func retrieveWebAppURL() async -> URL {
		do {
			// Attempt to retrieve the web app URL a couple of times over a total of 5 seconds.
			return try await Retry(logIdentifier: "retrieve web app URL") {
				do {
					return try await Configuration.webAppURL
				} catch let error as NSError where error.domain == NSURLErrorDomain && error.code == -1009 {
					// "The Internet connection appears to be offline"
					return nil
				}
			}.attempt(3, interval: .milliseconds(2500))
		} catch {
			Logger.logError(error, messagePrefix: "Failed to retrieve web app URL", level: .error)

			// Default to a hard coded URL in an effort to do something to remedy the situation.

			let defaultWebAppURLString = String(CxxBridge.CEFState.getDefaultMainAppURL())
			guard let defaultWebAppURL = URL(string: defaultWebAppURLString) else {
				Logger.logError(error, messagePrefix: "Failed to create default web app URL", level: .fault)
				fatalError("Failed to create default web app URL")
			}

			return defaultWebAppURL
		}
	}
}

// MARK: - Web App Lifecycle

extension AppDelegate {
	/// Stops and closes everything that needs to get deactivated
	/// before the app terminates or when the web app reloads.
	func cleanup() {
		// Do this first to ensure no errors are logged about IPC issues
		// since the CEF browsers get unreliable when shutting down or reloading.
		InterprocessMessenger.shared.receiverProcessIsReady = false

		Task {
			await deviceManager.stopDevices()
			try? await powerMonitor.stop()
			try? await sessionMonitor.stop()
			try? await systemVideoEffectsMonitor.stop()
			await Configuration.Service.API.shared.clearURLCache()
		}

		if remoteControlManager.isRunning {
			remoteControlManager.stop()
		}

		/// CEF windows need to be closed for the CEF termination procedure
		/// to work properly. On reload, secondary browsers lose connection
		/// to the web app and need to be re-opened after the main web app
		/// reloaded.
		browser.toolbox.windowManager.closeWindow()
	}
}

// MARK: - Alerts

extension AppDelegate {
	func showRelaunchRequestAlertConditionally() {
		guard relaunchAlertNotShown else { return }
		showRelaunchRequestAlert()
		relaunchAlertNotShown = false
	}

	func showRelaunchRequestAlert() {
		NSAlert.showRelaunchAlert(
			withMessageText: String(localized: "Quit & Reopen to complete Airtime Virtual Camera installation?",
									comment: "Airtime Virtual Camera installation relaunch message text."),
			informativeText: String(localized: "Airtime Virtual Camera will not work correctly until Airtime has been quit and reopened.",
									comment: "Airtime Virtual Camera installation relaunch informative text.")
		)
	}

	func showRebootRequestAlert() {
		SystemExtensionRestartHelper.shared.showSystemRestartAlert(
			withMessageText: String(localized: "Your Mac needs to be restarted",
									comment: "Your Mac needs to be restarted"),
			informativeText: String(localized:
				"""
				After installing or updating the Airtime Virtual Camera extension a restart is sometimes required. \
				That appears to be the case now. You can skip this step, however, your Airtime Virtual Camera may not \
				work in other applications.
				""",
				comment: "Camera extension reboot request")
		)
	}
}
