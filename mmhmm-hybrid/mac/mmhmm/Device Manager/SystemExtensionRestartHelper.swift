//
//  SystemExtensionRestartHelper.swift
//  mmhmm
//
//  Created by Martin Pilkington on 09/02/2024.
//

import AppKit

final class SystemExtensionRestartHelper: Sendable {
	static let shared: SystemExtensionRestartHelper = .init()

	/// Private init requires client code to call the `shared` instance.
	private init() {}

	var needsSystemRestart: Bool {
		let lastShown: TimeInterval = UserDefaults.standard.double(forKey: UserDefaults.mmhmmKey.restartAlertLastShown)
		if lastShown == 0 {
			return false
		}

		let systemUptime: TimeInterval = ProcessInfo.processInfo.systemUptime
		let timeSinceLastShown: TimeInterval = Date.timeIntervalSinceReferenceDate - lastShown

		return timeSinceLastShown < systemUptime
	}

	@MainActor
	func showSystemRestartAlert(withMessageText messageText: String, informativeText: String? = nil) {
		let alert = NSAlert()
		alert.messageText = messageText
		alert.informativeText = informativeText ?? ""
		alert.addButton(withTitle: NSLocalizedString("Restart Now", comment: "Restart Now button title"))
		alert.addButton(withTitle: NSLocalizedString("Restart Later", comment: "Restart Later button title"))

		UserDefaults.standard.setValue(Date.timeIntervalSinceReferenceDate, forKey: UserDefaults.mmhmmKey.restartAlertLastShown)
		if alert.runModal() == .alertFirstButtonReturn {
			restart()
		}
	}
}

extension SystemExtensionRestartHelper {
	private func restart() {
		Logger.logMessage("Rebooting...", level: .info)

		// This is pulled from https://developer.apple.com/library/archive/qa/qa1134/_index.html
		var processSerialNumber = ProcessSerialNumber(highLongOfPSN: 0, lowLongOfPSN: UInt32(kSystemProcess))

		var targetDesc: AEDesc = AEDesc()
		let descError: OSErr = AECreateDesc(typeProcessSerialNumber, &processSerialNumber, MemoryLayout<ProcessSerialNumber>.stride, &targetDesc)
		if descError != noErr {
			Logger.logMessage("Failed to Create AEDescriptor with code: \(descError)", level: .error)
			showRestartFailed()
			return
		}

		let targetDescriptor = NSAppleEventDescriptor(aeDescNoCopy: &targetDesc)
		let event = NSAppleEventDescriptor(eventClass: kCoreEventClass, eventID: kAERestart, targetDescriptor: targetDescriptor, returnID: AEReturnID(kAutoGenerateReturnID), transactionID: AETransactionID(kAnyTransactionID))

		guard let rawEvent: UnsafePointer<AEDesc> = event.aeDesc else {
			Logger.logMessage("Failed to create raw AppleEvent to restart", level: .error)
			showRestartFailed()
			return
		}

		let error: OSStatus = AESendMessage(rawEvent, nil, AESendMode(kAENoReply), kAENormalPriority)
		if error != noErr {
			Logger.logMessage("Failed to send restart AppleEvent with code: \(error)", level: .error)
			showRestartFailed()
			return
		}
	}

	private func showRestartFailed() {
		Task { @MainActor in
			NSAlert.showAlert(withMessageText: NSLocalizedString("Airtime could not restart your Mac", comment: "Airtime could not restart your Mac"),
							  informativeText: NSLocalizedString("Please try restarting manually", comment: "Please try restarting manually"))
		}
	}
}

extension UserDefaults.mmhmmKey {
	fileprivate static let restartAlertLastShown: String = "RestartAlertLastShown"
}
