//
//  AppBundleMover.swift
//  mmhmm
//
//  Created by Beni Federer on 04.06.24.
//

import AppKit

import Common

@MainActor
protocol AppBundleMoverDelegate: AnyObject {
	/// The app name of the bundle to move that is presented to users.
	var appBundleMoverAppName: String { get }

	/// The action the user selected from the `AppBundleMover` alert.
	///
	/// This function is called from the concurrency context of `presentAlert()`.
	///
	/// - Parameter action: The selected action.
	func userSelected(action: AppBundleMover.Action)
}

extension AppBundleMover {
	enum Action {
		case moveReplace
		case launchExistingVersionInApplicationsFolder
		case cancel(withSuppression: Bool)
	}
}

@MainActor
struct AppBundleMover {
	private static let unknownVersionText = String(localized: "Unknown Version")

	private let defaultAppName: String
	private weak var delegate: AppBundleMoverDelegate?

	init(delegate: AppBundleMoverDelegate) {
		self.delegate = delegate
		defaultAppName = delegate.appBundleMoverAppName
	}

	/// Presents a modal alert asking the user to move the application bundle
	/// to the Applications folder, if it is not already located there.
	///
	/// If the user consents,
	/// - and has the admin role, the app bundle is automatically moved to and
	///   relaunched from its new file system location.
	/// - but is not authorized, the system presents another alert asking for
	///   admin credentials to allow the file system operation, before proceeding.
	///
	/// The user is offered an option to suppress the alert for 30 days.
	///
	/// - Important: Prompting of unauthorized users only works in non-sandboxed apps.
	///              As of this writing, there is no non-deprecated support for this
	///              functionality in sandboxed apps.
	///
	/// - Throws: An error describing the failure. Use ``Error.isBenignAppBundleMoverError``
	///           to filter errors that indicate non-failures but other stop reasons.
	func presentAlert() throws {
		dispatchPrecondition(condition: .onQueue(.main))

		// Apparently the following helps with interference from the "scary file from the Internet" macOS dialog.
		if !NSApp.isActive {
			NSApp.activate()
		}

		let alert: NSAlert = try moveRequestAlert
		guard let clickedAlertButtonIndex: Int = alert.runModal().binaryIndex else { throw Error.unexpectedAlertConfiguration }

		let clickedAlertButtonAction = try AlertButtonAction(fromButtonWithIndex: clickedAlertButtonIndex, inAlert: alert)
		switch clickedAlertButtonAction {
		case nil:
			assertionFailure("Unexpected alert button")
			throw Error.unexpectedAlertButton(atIndex: clickedAlertButtonIndex)
		case .move, .replace:
			delegate?.userSelected(action: .moveReplace)
			try NSApp.relaunchAfterMovingToApplicationsFolder()
		case .launch:
			delegate?.userSelected(action: .launchExistingVersionInApplicationsFolder)
			guard let existingAppBundle: Bundle = try .main.appBundleInApplicationsFolder else {
				throw Error.failedRetrievingBundleInApplicationsFolder
			}
			try NSApp.terminateAndLaunchApp(atURL: existingAppBundle.bundleURL)
		case .cancel:
			if alert.suppressionButton?.state == .on {
				let thisBundleVersion: String = Bundle.main.object(forInfoDictionaryKey: "CFBundleVersion") as? String ?? "Unknown"
				UserDefaults.standard.suppressAppBundleLocationVerification(forBundleVersion: thisBundleVersion)
				delegate?.userSelected(action: .cancel(withSuppression: true))
			} else {
				delegate?.userSelected(action: .cancel(withSuppression: false))
			}
		}
	}

	/// An alert informing the user that the application bundle needs to be
	/// moved to the Applications folder.
	///
	/// If the application bundle is not located in the Applications folder
	/// and the location verification is not currently suppressed for the calling
	/// app's version, this method creates an alert asking the user to move
	/// the application bundle to the Applications folder.
	///
	/// - Note: Accessing this property incurs multiple file system operations.
	///
	/// - Throws: An error describing the failure. Use ``Error.isBenignAppBundleMoverError``
	///           to filter errors that indicate non-failures but other stop reasons.
	private var moveRequestAlert: NSAlert {
		get throws {
			guard try Bundle.main.locatedInApplicationsFolder == false else {
				throw AppBundleMover.Error.alreadyLocatedInApplicationsFolder
			}

			if let thisBundleVersion: String = Bundle.main.object(forInfoDictionaryKey: "CFBundleVersion") as? String,
			   UserDefaults.standard.appBundleLocationVerificationIsSuppressed(forBundleVersion: thisBundleVersion) {
				throw AppBundleMover.Error.suppressedByUser
			}

			let appName: String = NSRunningApplication.current.localizedName ?? defaultAppName
			let alert = NSAlert()
			alert.alertStyle = .informational
			alert.showsSuppressionButton = true
			alert.suppressionButton?.title = String(localized: "Do not ask again for the next 30 days")
			alert.messageText = String(localized: "Move \(appName) to the Applications Folder?")
			alert.informativeText = String(localized: "\(appName) needs to be in the Applications folder to receive updates and install the \(appName) Camera.")

			if let existingAppBundle: Bundle = try .main.appBundleInApplicationsFolder {
				let thisBundleVersion: String = Bundle.main.object(forInfoDictionaryKey: "CFBundleVersion") as? String ?? Self.unknownVersionText
				let existingBundleVersion: String = existingAppBundle.object(forInfoDictionaryKey: "CFBundleVersion") as? String ?? Self.unknownVersionText
				let existingBundleShortVersion: String = existingAppBundle.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String ?? Self.unknownVersionText

				guard let thisBundleVersionInt = Int(thisBundleVersion), let existingBundleVersionInt = Int(existingBundleVersion) else {
					throw Error.failedDeterminingBundleVersions
				}

				if thisBundleVersionInt > existingBundleVersionInt {
					// This bundle is newer.
					alert.informativeText += String(localized: "\n\nAn older version of \(appName) (\(existingBundleShortVersion)) already exists in the Applications folder. Would you like to replace it?")
					alert.alertStyle = .warning

					let replaceButton: NSButton = alert.addButton(withTitle: AlertButtonAction.replace.rawValue)
					replaceButton.hasDestructiveAction = true
				} else {
					// The existing bundle is the same or newer.
					alert.informativeText += String(localized: "\n\nAnother copy of \(appName) (\(existingBundleShortVersion)) already exists in the Applications folder. Would you like to launch it instead?")
					alert.addButton(withTitle: AlertButtonAction.launch.rawValue)
					alert.showsSuppressionButton = false
				}
			} else {
				alert.addButton(withTitle: AlertButtonAction.move.rawValue)
			}

			// Add the Cancel button second to ensure buttons with non-destructive
			// actions are the default buttons and have a key equivalent of Return.
			alert.addButton(withTitle: AlertButtonAction.cancel.rawValue)

			return alert
		}
	}

	/// The button actions associated with the alert presented by this class.
	private enum AlertButtonAction: String, Equatable {
		case cancel
		case launch
		case move
		case replace

		var rawValue: String {
			switch self {
			case .cancel: String(localized: "Cancel")
			case .launch: String(localized: "Launch")
			case .move: String(localized: "Move")
			case .replace: String(localized: "Replace")
			}
		}

		init?(rawValue: String) {
			switch rawValue {
			case String(localized: "Cancel"): self = .cancel
			case String(localized: "Launch"): self = .launch
			case String(localized: "Move"): self = .move
			case String(localized: "Replace"): self = .replace
			default: return nil
			}
		}

		/// Creates an enum case from the button with the specified index in an alert.
		///
		/// This method can be used to determine if a button is associated with an action
		/// represented by the returned enum case.
		///
		/// - Parameters:
		///   - index: Index of the button to create an enum case from.
		///   - alert: The alert to evaluate.
		/// - Returns: The enum case.
		/// - Throws: An error describing the failure if either alert or specified button
		///           do not yield a valid enum case.
		@MainActor
		init?(fromButtonWithIndex index: Int, inAlert alert: NSAlert) throws {
			guard alert.buttons.count > index else {
				throw Error.unexpectedAlertConfiguration
			}
			self.init(rawValue: alert.buttons[index].title)
		}
	}
}

extension AppBundleMover {
	enum Error {
		case alreadyLocatedInApplicationsFolder
		case suppressedByUser
		case failedDeterminingBundleVersions
		case failedRetrievingBundleInApplicationsFolder
		case unexpectedAlertButton(atIndex: Int)
		case unexpectedAlertConfiguration
	}
}

extension AppBundleMover.Error: BaseErrorWithAssociatedValues {
	static let allCases: [AppBundleMover.Error] = [
		.alreadyLocatedInApplicationsFolder,
		.suppressedByUser,
		.failedDeterminingBundleVersions,
		.failedRetrievingBundleInApplicationsFolder,
		.unexpectedAlertButton(atIndex: 0),
		.unexpectedAlertConfiguration,
	]

	static let domain: String = String(describing: Self.self)

	var errorMessage: String {
		switch self {
		case .alreadyLocatedInApplicationsFolder:
			String(localized: "App bundle is already located in Applications folder.")
		case .suppressedByUser:
			String(localized: "App bundle mover has been suppressed by the user for the current version.")
		case .failedDeterminingBundleVersions:
			String(localized: "Failed determining bundle versions.")
		case .failedRetrievingBundleInApplicationsFolder:
			String(localized: "Failed retrieving bundle in Applications folder.")
		case let .unexpectedAlertButton(index):
			String(localized: "Encountered unexpected alert button: \(index)")
		case .unexpectedAlertConfiguration:
			String(localized: "Encountered unexpected alert configuration.")
		}
	}
}

extension Error {
	/// Determines if an error can be treated as benign, i.e.
	/// not indicating a failure, but another reason to stop
	/// moving the app bundle, e.g. user interaction.
	var isBenignAppBundleMoverError: Bool {
		if let error = self as? AppBundleMover.Error {
			error == .alreadyLocatedInApplicationsFolder || error == .suppressedByUser
		} else if let error = self as? Bundle.MoveError {
			error == .userCanceled
		} else {
			false
		}
	}
}

extension UserDefaults.mmhmmKey {
	enum AppBundleMover {
		fileprivate static let alertSuppression: String = "AppBundleMoverAlertSuppression"
		fileprivate static let alertSuppressionTimeInterval: String = "AppBundleMoverAlertSuppressionTimeInterval"
		fileprivate static let alertSuppressionBundleVersion: String = "AppBundleMoverAlertSuppressionBundleVersion"
	}
}

extension UserDefaults {
	private static let maximumSuppressionDays: Int = 30
	private static let maximumSuppressionTimeInterval: Double = Double(60 * 60 * 24 * maximumSuppressionDays)

	fileprivate func appBundleLocationVerificationIsSuppressed(forBundleVersion bundleVersion: String) -> Bool {
		if let alertSuppressionUserDefault: [String: Any] = dictionary(forKey: UserDefaults.mmhmmKey.AppBundleMover.alertSuppression),
		   let alertSuppressionTimeInterval: TimeInterval = alertSuppressionUserDefault[mmhmmKey.AppBundleMover.alertSuppressionTimeInterval] as? TimeInterval,
		   let alertSuppressionBundleVersion: String = alertSuppressionUserDefault[mmhmmKey.AppBundleMover.alertSuppressionBundleVersion] as? String,
		   Date.now.timeIntervalSince1970 - alertSuppressionTimeInterval < Self.maximumSuppressionTimeInterval,
		   bundleVersion == alertSuppressionBundleVersion {
			return true
		} else {
			return false
		}
	}

	fileprivate func suppressAppBundleLocationVerification(forBundleVersion bundleVersion: String) {
		let alertSuppressionUserDefault: [String: Any] = [
			mmhmmKey.AppBundleMover.alertSuppressionTimeInterval: Date.now.timeIntervalSince1970,
			mmhmmKey.AppBundleMover.alertSuppressionBundleVersion: bundleVersion,
		]
		set(alertSuppressionUserDefault, forKey: mmhmmKey.AppBundleMover.alertSuppression)
	}
}

extension NSApplication.ModalResponse {
	/// Represents first and second button, returns `nil` for any other button.
	fileprivate var binaryIndex: Int? {
		switch self {
		case .alertFirstButtonReturn: 0
		case .alertSecondButtonReturn: 1
		default: nil
		}
	}
}
