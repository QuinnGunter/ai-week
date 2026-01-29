//
//  Updater.swift
//  mmhmm
//
//  Created by Beni Federer on 22.07.24.
//

import AppKit

import Sparkle

@MainActor
class Updater: NSObject {
	private var updaterController: SPUStandardUpdaterController?

	override init() {
		super.init()

		updaterController = SPUStandardUpdaterController(startingUpdater: true, updaterDelegate: self, userDriverDelegate: nil)

		#if !DEBUG
		Configuration.Release.removeUpdateOverrideIfCurrent()
		updaterController?.updater.automaticallyChecksForUpdates = true
		updaterController?.updater.automaticallyDownloadsUpdates = FeatureFlags.UpdaterOverrides.automaticallyDownloadsUpdates
		DispatchQueue.main.asyncAfter(deadline: .now().advanced(by: .seconds(10))) { [weak self] in
			self?.updaterController?.updater.checkForUpdatesInBackground()
		}
		#endif
	}

	func checkForUpdates() {
		Logger.logMessage("Checking for updates...", level: .info)

		updaterController?.updater.checkForUpdates()

		Task { @MainActor in
			NSApp
				.windows
				.first { $0.frameAutosaveName.contains("Update") }
				.map { $0.makeKeyAndOrderFront(nil) }
		}
	}
}

extension Updater: @preconcurrency SPUUpdaterDelegate {
	func feedURLString(for updater: SPUUpdater) -> String? {
		guard let sparkleUpdateURL: URL = Configuration.sparkleUpdateURL else {
			Logger.logMessage("Could not create URL components for Sparkle update URL.", level: .error)
			return nil
		}
		return sparkleUpdateURL.absoluteString
	}

	func updaterShouldRelaunchApplication(_ updater: SPUUpdater) -> Bool {
		true
	}

	func updater(_ updater: SPUUpdater, willInstallUpdateOnQuit item: SUAppcastItem, immediateInstallationBlock immediateInstallHandler: @escaping () -> Void) -> Bool {
		if FeatureFlags.UpdaterOverrides.automaticallyDownloadsUpdates {
			Task { @MainActor in
				showUpdateImmediatelyAlert(with: item, immediateInstallationBlock: immediateInstallHandler)
			}
		}

		// https://github.com/sparkle-project/Sparkle/issues/736#issuecomment-180431349
		// "If you return NO, then the update is aborted."
		return false
	}

	// MARK: - Notifications

	func updater(_ updater: SPUUpdater, didFinishUpdateCycleFor updateCheck: SPUUpdateCheck, error: (any Error)?) {
		if let error {
			Logger.logError(error, messagePrefix: "Finished update cycle with error", targets: .uncheckedAll)
		} else {
			Logger.logMessage("Did finish update cycle.", level: .info)
		}
	}

	func updater(_ updater: SPUUpdater, didFinishLoading appcast: SUAppcast) {
		Logger.logMessage("Did finish loading appcast \(appcast.logDescription).", level: .info)
	}

	func updaterWillNotScheduleUpdateCheck(_ updater: SPUUpdater) {
		Logger.logMessage("Will not schedule update check.", level: .info)
	}

	func updater(_ updater: SPUUpdater, willScheduleUpdateCheckAfterDelay delay: TimeInterval) {
		Logger.logMessage("Will schedule update check after delay \(delay).", level: .info)
	}

	func updater(_ updater: SPUUpdater, didFindValidUpdate item: SUAppcastItem) {
		Logger.logMessage("Did find valid update \(item.logDescription).", level: .info)
	}

	func updater(_ updater: SPUUpdater, userDidMake choice: SPUUserUpdateChoice, forUpdate updateItem: SUAppcastItem, state: SPUUserUpdateState) {
		Logger.logMessage("User did choose \(choice.logDescription) in \(state.logDescription) for update \(updateItem.logDescription).", level: .info)
	}

	func updater(_ updater: SPUUpdater, willDownloadUpdate item: SUAppcastItem, with request: NSMutableURLRequest) {
		Logger.logMessage("Will download update \(item.logDescription).", level: .info)
	}

	func updater(_ updater: SPUUpdater, didDownloadUpdate item: SUAppcastItem) {
		Logger.logMessage("Did download update \(item.logDescription).", level: .info)
	}

	func updater(_ updater: SPUUpdater, willExtractUpdate item: SUAppcastItem) {
		Logger.logMessage("Will extract update \(item.logDescription).", level: .info)
	}

	func updater(_ updater: SPUUpdater, didExtractUpdate item: SUAppcastItem) {
		Logger.logMessage("Did extract update \(item.logDescription).", level: .info)
	}

	func updater(_ updater: SPUUpdater, willInstallUpdate item: SUAppcastItem) {
		Logger.logMessage("Will install update \(item.logDescription).", level: .info)
	}

	func updaterWillRelaunchApplication(_ updater: SPUUpdater) {
		Logger.logMessage("Will relaunch application.", level: .info)
	}

	// MARK: - Errors

	// TODO: It's unclear if `updater(didAbortWithError:)` is a catch-all or not. Some errors are definitely
	// coming through multiple error handlers. Until we're sure, let's leave all error handlers in place.

	func updaterDidNotFindUpdate(_ updater: SPUUpdater, error: any Error) {
		logError(error, messagePrefix: "Failed to find update")
	}

	func updater(_ updater: SPUUpdater, failedToDownloadUpdate item: SUAppcastItem, error: any Error) {
		logError(error, messagePrefix: "Failed to download update")
	}

	func updater(_ updater: SPUUpdater, didAbortWithError error: any Error) {
		logError(error, messagePrefix: "Aborted with error")
	}

	// This function has `internal` access level for testability purposes.
	func logError(_ error: any Error, messagePrefix: String) {
		guard error.shouldLogAsSparkleError else { return }
		Logger.logError(error, messagePrefix: messagePrefix)
	}
}

extension Updater {
	private func showUpdateImmediatelyAlert(with item: SUAppcastItem, immediateInstallationBlock immediateInstallHandler: @escaping () -> Void) {
		let fullProductVersionString: String = "Airtime " + item.displayVersionString + " (" + item.versionString + ")"
		let alert = NSAlert()
		alert.messageText = "Update Ready for Installation"
		alert.informativeText = "\(fullProductVersionString) has been downloaded and can be installed immediately. Would you like to relaunch now?"
		alert.addButton(withTitle: "Install on Quit")
		alert.addButton(withTitle: "Install and Relaunch")
		alert.buttons.last?.hasDestructiveAction = true

		let response: NSApplication.ModalResponse = alert.runModal()
		if response == .alertSecondButtonReturn {
			immediateInstallHandler()
		}
	}
}
