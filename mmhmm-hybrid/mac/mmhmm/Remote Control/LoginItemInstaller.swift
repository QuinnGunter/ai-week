//
//  LoginItemInstaller.swift
//  mmhmm
//
//  Created by Beni Federer on 22.05.25.
//

import AppKit
import ServiceManagement

import Common

protocol LoginItemInstallerDelegate: AnyObject {
	func loginItemWasInstalled(_ installer: LoginItemInstaller)
	func loginItemWasUninstalled(_ installer: LoginItemInstaller)
	func loginItemWillUpdate(_ installer: LoginItemInstaller)
	func loginItemDidUpdate(_ installer: LoginItemInstaller)
	func loginItemFailedToUpdate(_ installer: LoginItemInstaller, error: Error)
}

final class LoginItemInstaller {
	/// Creates an instance.
	///
	/// - Parameter identifier: Must correspond to a property list in the calling app’s `Contents/Library/LoginItems` directory.
	init(identifier: String) {
		self.identifier = identifier
	}

	/// Delegate notified about login item status changes.
	weak var delegate: LoginItemInstallerDelegate?

	private var lastSeenStatus: Status = .unavailable {
		didSet {
			let lastSeenStatus = lastSeenStatus
			guard lastSeenStatus != oldValue else { return }
			CxxBridge.notifyHybridOfLoginItemStatusChange()
		}
	}

	/// The installer's login item status.
	var status: Status {
		loginItemStatus.status
	}

	/// The login item's identifier.
	let identifier: String

	/// Informs the installer to update its internal status
	/// book keeping, which notifies dependent classes.
	///
	/// The login item installer is unable to observe
	/// changes to the login item's enabled state through
	/// the user. It needs to be explicitly told to update
	/// by an external source, which communicates with
	/// the login item directly via IPC.
	func updateStatus() {
		lastSeenStatus = status
	}

	/// Installs the login item.
	func install() {
		do {
			try loginItem.register()
			updateStatus()
			delegate?.loginItemWasInstalled(self)
			Logger.logMessage("Registered login item.", level: .info)
		} catch {
			Logger.logError(error, messagePrefix: "Failed to register login item", level: .error, targets: .uncheckedLocal)
		}
	}

	/// Uninstalls the login item.
	func uninstall() {
		do {
			try loginItem.unregister()
			updateStatus()
			delegate?.loginItemWasUninstalled(self)
			Logger.logMessage("Unregistered login item.", level: .info)
		} catch {
			Logger.logError(error, messagePrefix: "Failed to unregister login item", level: .error, targets: .uncheckedLocal)
		}
	}

	/// Switches the menu bar app to the next applicable state,
	/// i.e. does the right thing.
	func switchState() {
		let loginItemStatus: SMAppService.Status = loginItemStatus
		switch loginItemStatus {
		case .notRegistered, .notFound:
			install()
			Analytics.shared.logLoginItemEvent(.installed(previousStatus: loginItemStatus))
		case .enabled:
			uninstall()
			Analytics.shared.logLoginItemEvent(.uninstalled)
		case .requiresApproval:
			Self.openSystemSettings()
			Analytics.shared.logLoginItemEvent(.maybeReenabled)
		@unknown default:
			Logger.logMessage("Failed to switch state, because login item has unknown status \(loginItemStatus).", level: .error)
		}
	}

	@MainActor
	func validateMenuItem(_ menuItem: NSMenuItem) -> Bool {
		let status = loginItemStatus
		menuItem.title = status.menuItemTitle
		menuItem.state = status.controlState
		menuItem.isHidden = status.hidesMenuItem
		return status.enablesMenuItem
	}

	func logSummary(runningVersion: String? = nil) {
		let versionInfo: String = if let runningVersion {
			" (\(runningVersion))"
		} else {
			""
		}

		Logger.logMessage("Login item \(loginItemStatus)\(versionInfo).", level: .info)
	}

	/// Reinstalls the login item if the bundled login item
	/// is newer than the passed in version.
	///
	/// - Parameter runningVersion: The version string of the currently running login item.
	func checkForUpdate(to runningVersion: String) throws {
		defer {
			logSummary(runningVersion: runningVersion)
		}

		guard let loginItemBundle = try Bundle.main.loginItemBundle(withIdentifier: identifier) else {
			throw Error.failedToFindLoginItemInBundle(identifier: identifier)
		}

		guard loginItemBundle.isNewer(than: runningVersion) else {
			Logger.logMessage("Login item is up to date.", level: .info)
			return
		}

		Logger.logMessage("Newer login item is available.", level: .info)

		do {
			delegate?.loginItemWillUpdate(self)

			try loginItem.unregister()
			updateStatus()

			try loginItem.register()
			updateStatus()

			delegate?.loginItemDidUpdate(self)
			Logger.logMessage("Updated login item.", level: .info)
		} catch {
			delegate?.loginItemFailedToUpdate(self, error: error)
			Logger.logError(error, messagePrefix: "Failed to update login item", level: .error)
		}
	}
}

extension LoginItemInstaller {
	enum Status: String {
		case unavailable
		case notInstalled
		case enabled
		case disabled
	}
}

extension LoginItemInstaller {
	/// The `SMAppService` login item's status.
	private var loginItemStatus: SMAppService.Status {
		loginItem.status
	}

	private var loginItem: SMAppService {
		SMAppService.loginItem(identifier: identifier)
	}
}

extension LoginItemInstaller {
	/// Opens the **Login Items** panel in **System Settings**.
	static func openSystemSettings() {
		SMAppService.openSystemSettingsLoginItems()
		Logger.logMessage("Opened System Settings.", level: .info)
	}

	/// Retrieves the status of a login item.
	///
	/// - Parameter identifier: The identifier of the login item.
	/// - Returns: The status of the login item.
	static func status(for identifier: String) -> SMAppService.Status {
		SMAppService.loginItem(identifier: identifier).status
	}
}

extension SMAppService.Status {
	fileprivate var menuItemTitle: String {
		switch self {
		case .notRegistered, .notFound, .enabled:
			// This string is prefixed with a tick icon, if enabled.
			String(localized: "Start Menu Bar Item at Login")
		case .requiresApproval:
			String(localized: "Enable Menu Bar Login Item")
		default:
			String(localized: "Menu Bar Login Item is Unavailable")
		}
	}

	fileprivate var controlState: NSControl.StateValue {
		switch self {
		case .enabled: .on
		default: .off
		}
	}

	fileprivate var enablesMenuItem: Bool {
		switch self {
		case .notRegistered, .enabled, .requiresApproval, .notFound: true
		default: false
		}
	}

	fileprivate var hidesMenuItem: Bool {
		enablesMenuItem == false || FeatureFlags.MenuBarLoginItem.isAvailable == false
	}

	fileprivate var status: LoginItemInstaller.Status {
		switch self {
		case .notRegistered, .notFound: .notInstalled
		case .enabled: .enabled
		case .requiresApproval: .disabled
		default: .unavailable
		}
	}
}

extension SMAppService.Status: @retroactive CustomStringConvertible {
	public var description: String {
		switch self {
		case .notRegistered: "is uninstalled"
		case .enabled: "is enabled"
		case .requiresApproval: "is disabled"
		case .notFound: "was not found"
		@unknown default: "has an unknown status"
		}
	}
}

extension LoginItemInstaller {
	enum Error {
		case failedToFindLoginItemInBundle(identifier: String)
	}
}

extension LoginItemInstaller.Error: BaseErrorWithAssociatedValues {
	static let domain: String = String(describing: Self.self)

	var errorMessage: String {
		switch self {
		case let .failedToFindLoginItemInBundle(identifier): "Failed to find the login item bundle \(identifier) in the main bundle."
		}
	}

	static let allCases: [LoginItemInstaller.Error] = [
		.failedToFindLoginItemInBundle(identifier: ""),
	]
}
