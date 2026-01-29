//
//  SwiftBridge.swift
//  mmhmm
//
//  Created by Beni Federer on 15.07.24.
//

import AppKit

import Common
import CxxStdlib

// swiftlint:disable function_parameter_count

// NOTE:
// Swift currently does not expose nested structures, classes, or
// actors to C++. [See cxx-interop status.](https://www.swift.org/documentation/cxx-interop/status/#supported-swift-apis)

/// Info passed from MALK when the hybrid bridge is initialized.
public struct SwiftBridgeHybridBridgeInitializedInfo: Sendable {
	let build: String
	let theme: String
	let releaseTrack: String
	let browserID: Int

	public init(build: std.string, theme: std.string, releaseTrack: std.string, browserID: Int) {
		self.build = String(build)
		self.theme = String(theme)
		self.releaseTrack = String(releaseTrack)
		self.browserID = browserID
	}
}

/// Stand-in for `CGSize`, which somehow gets exported to C++
/// as `CefSize` for reasons that only the compiler understands.
public struct SwiftBridgeSize: Sendable {
	let cgSize: CGSize

	public init(width: Double, height: Double) {
		cgSize = CGSize(width: width, height: height)
	}
}

/// This the bridging layer connecting the CEF world to the Cocoa world.
///
/// All public Swift API is exposed to C++ via cxx-interop. Since making
/// big chunks of class API public is unwise, this bridging layer limits
/// public access of that API to a minimum via static types.
///
/// - Note: Swift currently does not expose nested structures, classes, or
/// actors to C++. [See cxx-interop status.](https://www.swift.org/documentation/cxx-interop/status/#supported-swift-apis)
public struct SwiftBridge {
	/// A property seems to be required to allow for cxx-interop.
	/// Without it, the compiler only generates a forward declaration.
	public let cxxInteropDummy: String = ""

	public static func navigateToExternalURL(url: std.string) {
		let urlString = String(url)
		guard let url = URL(string: urlString) else {
			Logger.logMessage("Failed to create URL for external URL string: \(urlString)", level: .error)
			return
		}

		Task { @MainActor in
			Application.cefAppDelegate.browser.navigateToExternalURL(url)
		}
	}

	public static func onBeforeBrowse(url: std.string, webAppType: WebAppType, browserID: Int, isMainFrame: Bool, frameIdentifier: std.string) {
		Task { @MainActor in
			let delegate: CEFBrowserDelegate = Application.cefAppDelegate.browser

			guard let webAppType: WebApp.WebAppType = webAppType.webAppType else {
				delegate.browserDidStartBrowsing(withResult: .failure(.failedIdentifyingWebAppType(rawURL: String(url), browserID: browserID)))
				return
			}

			let browsingInfo = CEFBrowser.BrowsingInfo(
				url: URL(string: String(url)),
				webAppType: webAppType,
				browserID: browserID,
				isMainFrame: isMainFrame,
				frameIdentifier: String(frameIdentifier)
			)
			delegate.browserDidStartBrowsing(withResult: .success(browsingInfo))
		}
	}

	public static func onLoadEnd(url: std.string, webAppType: WebAppType, httpStatusCode: Int, browserID: Int, isMainFrame: Bool, frameIdentifier: std.string) {
		Task { @MainActor in
			let delegate: CEFBrowserDelegate = Application.cefAppDelegate.browser

			guard let webAppType: WebApp.WebAppType = webAppType.webAppType else {
				delegate.browserDidFinishLoading(withResult: .failure(.failedIdentifyingWebAppType(rawURL: String(url), browserID: browserID)))
				return
			}

			let loadingInfoURL: URL? = URL(string: String(url))
			if loadingInfoURL == nil {
				Logger.logMessage("Failed creating URL from \(String(url)) on load end.", level: .error)
			}

			let loadInfo = CEFBrowser.LoadInfo(
				url: loadingInfoURL,
				webAppType: webAppType,
				httpStatusCode: httpStatusCode,
				browserID: browserID,
				isMainFrame: isMainFrame,
				frameIdentifier: String(frameIdentifier)
			)
			delegate.browserDidFinishLoading(withResult: .success(loadInfo))
		}
	}

	public static func onLoadError(url: std.string, webAppType: WebAppType, errorMessage: std.string, errorCode: Int, browserID: Int, frameIsMain: Bool, frameIdentifier: std.string) {
		Task { @MainActor in
			let delegate: CEFBrowserDelegate = Application.cefAppDelegate.browser

			guard let webAppType: WebApp.WebAppType = webAppType.webAppType else {
				delegate.browserDidFinishLoading(withResult: .failure(.failedIdentifyingWebAppType(rawURL: String(url), browserID: browserID)))
				return
			}

			let error = NSError(domain: String(describing: Self.self), code: errorCode, userInfo: [NSLocalizedFailureErrorKey: String(errorMessage)])
			delegate.browserDidFinishLoading(withResult: .failure(
				.failedLoading(
					rawURL: String(url),
					webApp: webAppType,
					error: error,
					browserID: browserID,
					frameIsMain: frameIsMain,
					frameIdentifier: String(frameIdentifier)
				)))
		}
	}

	public static func onGetScreenshareMediaRequest(includeScreens: Bool, includeWindows: Bool, requestID: Int, browserID: Int, activateTarget: Bool, presentPickerV2: Bool) {
		Task { @MainActor in
			ScreenSharePickerManager
				.shared
				.showScreenSharePicker(
					withRequest: ScreenSharePickerRequest(
						includeScreens: includeScreens,
						includeWindows: includeWindows,
						id: requestID,
						browserID: browserID,
						activateWindowTarget: activateTarget,
						presentPickerV2: presentPickerV2,
						excludedWindows: []
					)
				)
		}
	}

	public static func onNativeCallbackRequest(context: std.string, json: std.string, browserID: Int) {
		Task { @MainActor in
			Application.cefAppDelegate.browser.webAppHasNativeCallbackRequest(
				withContextIdentifier: String(context),
				json: String(json),
				browserID: browserID
			)
		}
	}

	public static func onBridgeInitialized(info: SwiftBridgeHybridBridgeInitializedInfo) {
		Task { @MainActor in
			Application.cefAppDelegate.browser.setup(withHybridBridgeInitializedInfo: info)
		}
	}

	public static func onPropertyChange<T: Sendable>(key: std.string, value: T, browserID: Int) {
		let value: Sendable = if let stdStringValue = value as? std.string {
			String(stdStringValue)
		} else {
			value
		}

		Task { @MainActor in
			Application.cefAppDelegate.browser.updateProperty(browserID: browserID, key: String(key), value: value)
		}
	}

	public static func onPropertyChangeWithNilValue(key: std.string, browserID: Int) {
		Task { @MainActor in
			Application.cefAppDelegate.browser.updateProperty(browserID: browserID, key: String(key), value: nil)
		}
	}

	public static func onPropertyChangeWithError(key: std.string, errorMessage: std.string, browserID: Int) {
		Logger.logMessage(String(errorMessage), level: .error)
	}

	public static func onShowMiniRemote(browserID: Int) {
		Logger.logMessage("Showing Mini Remote is deprecated.", level: .error)
	}

	public static func onHideMiniRemote(browserID: Int) {
		Logger.logMessage("Hiding Mini Remote is deprecated.", level: .error)
	}

	public static func onEnterBroadcastMode(browserID: Int) {
		NotificationCenter.default.post(name: .enterBroadcastMode, object: nil)
	}

	public static func onExitBroadcastMode(browserID: Int) {
		NotificationCenter.default.post(name: .exitBroadcastMode, object: nil)
	}

	public static func onStageRenderingStarted(browserID: Int) {
		Task { @MainActor in
			Application.cefAppDelegate.browser.webAppStartedStageRendering(browserID: browserID)
		}
	}

	public static func onStageRenderingStopped(browserID: Int) {
		Task { @MainActor in
			Application.cefAppDelegate.browser.webAppStoppedStageRendering(browserID: browserID)
		}
	}

	public static func onBrowserCreated(url: std.string, webAppType: WebAppType, windowHandle: CEFWindowHandle, browserID: Int) {
		guard let windowHandle: CEFNonNilWindowHandle else { return }
		let uncheckedSendableHandle = CEFNonNilWindowHandleUncheckedSendableBox(value: windowHandle)

		Task { @MainActor in
			let delegate: CEFBrowserDelegate = Application.cefAppDelegate.browser

			guard let webAppType: WebApp.WebAppType = webAppType.webAppType else {
				delegate.browserWasCreated(withResult: .failure(.failedIdentifyingWebAppType(rawURL: String(url), browserID: browserID)))
				return
			}

			guard let window: NSWindow = uncheckedSendableHandle.value.toNSWindow else {
				delegate.browserWasCreated(withResult: .failure(.failedRetrievingWindow(browserID: browserID)))
				return
			}

			let creationInfoURL: URL? = URL(string: String(url))
			if creationInfoURL == nil {
				Logger.logMessage("Failed creating URL from \(String(url)) on browser creation.", level: .error)
			}

			let creationInfo = CEFBrowser.CreationInfo(
				url: creationInfoURL,
				webAppType: webAppType,
				window: window,
				browserID: browserID
			)
			delegate.browserWasCreated(withResult: .success(creationInfo))
		}
	}

	public static func setMinSizeOnWindow(withHandle windowHandle: CEFWindowHandle, minSize: SwiftBridgeSize) {
		guard let windowHandle: CEFNonNilWindowHandle else { return }
		let uncheckedSendableHandle = CEFNonNilWindowHandleUncheckedSendableBox(value: windowHandle)

		Task { @MainActor in
			guard let window: NSWindow = uncheckedSendableHandle.value.toNSWindow else {
				Logger.logMessage("Failed to get window to set minimum size on.", level: .error)
				return
			}

			window.contentMinSize = minSize.cgSize
			if window.frame.size < minSize.cgSize {
				window.resizeTo(size: minSize.cgSize)
			}
		}
	}

	public static func setMaxSizeOnWindow(withHandle windowHandle: CEFWindowHandle, maxSize: SwiftBridgeSize) {
		guard let windowHandle: CEFNonNilWindowHandle else { return }
		let uncheckedSendableHandle = CEFNonNilWindowHandleUncheckedSendableBox(value: windowHandle)

		Task { @MainActor in
			guard let window: NSWindow = uncheckedSendableHandle.value.toNSWindow else {
				Logger.logMessage("Failed to get window to set maximum size on.", level: .error)
				return
			}

			// The hybrid API supports frame size dimensions of 0 to mean the screen bounded maximum,
			// requiring 0 to be replaced by the actual screen bound dimension's value.
			let reinterpretedMaxSize: CGSize = maxSize
				.cgSize
				.zeroLengthsReplacedWithScreenBoundsMax(ofWindow: window)

			// The `contentMaxSize` sets the window's maximum size.
			window.contentMaxSize = reinterpretedMaxSize

			if window.frame.size > reinterpretedMaxSize {
				window.resizeTo(size: maxSize.cgSize)
			}
		}
	}

	/// Determines if a window can be closed.
	///
	/// - Important: This function expects to be called on the main thread.
	///
	/// - Parameter windowHandle: The CEF window handle to check.
	/// - Returns: Whether the window can be closed.
	public static func canCloseWindow(withHandle windowHandle: CEFWindowHandle) -> Bool {
		guard let windowHandle: CEFNonNilWindowHandle else { return true }
		let uncheckedSendableHandle = CEFNonNilWindowHandleUncheckedSendableBox(value: windowHandle)

		return MainActor.assumeIsolated {
			// When the app is terminating, all windows must be allowed to close.
			guard Application.isTerminating == false else { return true }

			guard let window: NSWindow = uncheckedSendableHandle.value.toNSWindow else {
				Logger.logMessage("Failed to get window to check if it can close.", level: .error)
				return true
			}

			return Application.cefAppDelegate.browser.canCloseWindow(window)
		}
	}

	public static func onWebAppWindowClosed(_ webAppType: WebAppType) {
		MainActor.assumeIsolated {
			guard let webAppType: WebApp.WebAppType = webAppType.webAppType else {
				Logger.logMessage("Failed to identify web app type on window closed.", level: .error)
				return
			}
			Application.cefAppDelegate.browser.windowDidClose(forWebApp: webAppType)
		}
	}

	public static func onAppCapabilitiesRequestRelaunch() {
		Task { await Application.cefAppDelegate.showRelaunchRequestAlert() }
	}

	public static func onAppCapabilitiesRequestReboot() {
		Task { await Application.cefAppDelegate.showRebootRequestAlert() }
	}

	public static func onMainAppWindowResizeTo(width: Int, height: Int, browserID: Int) {
		let size = NSSize(width: Double(width), height: Double(height))
		Task { @MainActor in
			guard
				let webApp: WebAppProtocol = Application.cefAppDelegate.browser.webAppManagingBrowser(withID: browserID),
				webApp.windowManager.browserID == browserID
			else {
				Logger.logMessage("Ignoring unknown browser ID \(browserID) to resize window.", level: .info)
				return
			}

			webApp.windowManager.resize(to: size)
		}
	}

	public static func onSetIsFloatingTo(isFloating: Bool, browserID: Int) {
		Task { @MainActor in
			guard
				let webApp: WebAppProtocol = Application.cefAppDelegate.browser.webAppManagingBrowser(withID: browserID),
				webApp.windowManager.browserID == browserID
			else {
				Logger.logMessage("Ignoring unknown browser ID \(browserID) to set floating state of window.", level: .info)
				return
			}

			webApp.windowManager.window?.isFloating = isFloating
		}
	}

	public static func onSetIsHiddenTo(isHidden: Bool, browserID: Int) {
		Task { @MainActor in
			guard
				let webApp: WebAppProtocol = Application.cefAppDelegate.browser.webAppManagingBrowser(withID: browserID),
				webApp.windowManager.browserID == browserID
			else {
				Logger.logMessage("Ignoring unknown browser ID \(browserID) to set hidden state of window.", level: .info)
				return
			}

			webApp.windowManager.isPresenting = !isHidden
		}
	}

	public static func onOmitInScreenShares(windowWithHandle windowHandle: CEFWindowHandle, isOmitted: Bool) {
		guard let windowHandle: CEFNonNilWindowHandle else { return }
		let uncheckedSendableHandle = CEFNonNilWindowHandleUncheckedSendableBox(value: windowHandle)

		MainActor.assumeIsolated {
			guard let window: NSWindow = uncheckedSendableHandle.value.toNSWindow else {
				Logger.logMessage("Failed to get window to set omit in screen shares.", level: .error)
				return
			}

			window.isOmittedInScreenShares = isOmitted
		}
	}

	public static func onCameraAuthorize() {
		Task { try await Application.cefAppDelegate.deviceManager.cameraPermissionsHelper.requestAuthorization() }
	}

	public static func onMicrophoneAuthorize() {
		Task { try await Application.cefAppDelegate.deviceManager.microphonePermissionsHelper.requestAuthorization() }
	}

	public static func onVirtualCameraInstall() {
		Task { await Application.cefAppDelegate.deviceManager.activateCameraExtension() }
	}

	public static func onVirtualCameraUninstall() {
		Task { await Application.cefAppDelegate.deviceManager.deactivateCameraExtension() }
	}

	public static func onVirtualCameraAuthorize() {
		Task { await Application.cefAppDelegate.deviceManager.activateCameraExtension() }
	}

	public static func onVirtualCameraSupportViewDidAppear() {
		Task { @MainActor in
			Application.cefAppDelegate.webAppSupportViewIsHidden = false
		}
	}

	public static func onVirtualCameraSupportViewWillDisappear() {
		Task { @MainActor in
			Application.cefAppDelegate.webAppSupportViewIsHidden = true
		}
	}

	public static func onTitlebarUpdate(titlebar: mmhmm.Titlebar, browserID: Int) {
		Task { @MainActor in
			guard
				let webApp: WebAppProtocol = Application.cefAppDelegate.browser.webAppManagingBrowser(withID: browserID),
				webApp.windowManager.browserID == browserID
			else {
				Logger.logMessage("Failed to get web app for browser ID \(browserID) to set hidden state of window.", level: .error)
				return
			}

			webApp.windowManager.toolboxButtonConfiguration.update(withToolboxButton: titlebar.toolboxButton)
		}
	}
}

/// Bridges to `CefWindowHandle`, which is a typedef of `void*`,
/// which must become an `UnsafeMutableRawPointer?` when passed
/// as a Swift function argument.
public typealias CEFWindowHandle = UnsafeMutableRawPointer?
public typealias CEFNonNilWindowHandle = UnsafeMutableRawPointer

typealias CEFNonNilWindowHandleUncheckedSendableBox = UncheckedSendableBox<CEFNonNilWindowHandle>

extension CEFNonNilWindowHandle {
	@MainActor
	fileprivate var toNSWindow: NSWindow? {
		asUnmanagedNSView.window
	}
}

extension UnsafeMutableRawPointer {
	fileprivate var asUnmanagedNSView: NSView {
		Unmanaged<NSView>.fromOpaque(self).takeUnretainedValue()
	}
}

// swiftlint:enable function_parameter_count
