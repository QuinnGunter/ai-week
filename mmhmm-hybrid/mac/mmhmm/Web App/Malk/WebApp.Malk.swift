//
//  WebApp.Malk.swift
//  mmhmm
//
//  Created by Beni Federer on 11.09.25.
//

// swiftlint:disable file_length

import AppKit

import Common

protocol MalkBasedWebAppConfiguration {}

extension WebApp {
	typealias Camera = Malk<CameraConfiguration>

	struct CameraConfiguration: WebAppConfigurationProtocol, MalkBasedWebAppConfiguration {
		static let webAppType: WebApp.WebAppType = .camera
	}
}

extension WebApp {
	typealias Creator = Malk<CreatorConfiguration>

	struct CreatorConfiguration: WebAppConfigurationProtocol, MalkBasedWebAppConfiguration {
		static let webAppType: WebApp.WebAppType = .creator
	}
}

extension WebApp {
	private static let internalUserEmailDomains: Set<String> = [
		"all-turtles.com",
		"mmhmm.app",
		"airtimetools.com",
		"airtime.com",
	]

	// swiftlint:disable:next type_body_length
	@MainActor class Malk<WebAppConfiguration: WebAppConfigurationProtocol>: Base<WebAppConfiguration>, ObservableObject, RemoteControllableWebApp {
		/// While `true`, property changes are sent along to the browser,
		/// which in turn updates the web app.
		///
		/// Must be `false` while the browser updates this class with
		/// new web app state.
		///
		/// - Important: This boolean flag works reliably as a locking
		///              mechanism because all `WebApp.Malk` code runs
		///              synchronously on the `@MainActor`. Care must
		///              be taken to avoid any suspension points while
		///              this flag is set to not drop property updates
		///              from the app side.
		private var mustUpdateBrowser: Bool = true

		/// Whether this instance represents a Creator web app.
		private var isCreator: Bool { WebAppConfiguration.webAppType == .creator }

		/// Whether this instance represents a Camera web app.
		private var isCamera: Bool { WebAppConfiguration.webAppType == .camera }

		private(set) var streamDeckAdapter: StreamDeckAdapter?
		private(set) var broadcastWindowManager: BroadcastWindowManager?
		private(set) var remoteControlWindowManager: RemoteControlWindowManager?

		var supportsRemoteControl: Bool {
			CxxBridge.CEFState.getSupportsRemoteControl()
		}

		var isSignedIn: Bool {
			hybridBridgeIsInitialized && userID != nil
		}

		var isInternalUser: Bool {
			guard let userEmail = userEmail?.lowercased() else { return false }
			return WebApp
				.internalUserEmailDomains
				.first(where: { userEmail.hasSuffix($0) }) != nil
		}

		@Published fileprivate(set) var hybridBridgeIsInitialized: Bool = false {
			didSet {
				guard hybridBridgeIsInitialized != oldValue else { return }
				if state != .idle {
					// In idle state, no window is shown yet, so don't attempt
					// to update the toolbar visibility to avoid an error log.
					windowManager.showsToolbar = isSignedIn
				}

				if hybridBridgeIsInitialized {
					streamDeckAdapter = StreamDeckAdapter(with: self)

					Task {
						let deviceManager = Application.cefAppDelegate.deviceManager
						await deviceManager.startVirtualCameraProducer()

						let requestedDevices: [DeviceManager.CapturePermissionRequestableDevice] = if isCamera {
							[.camera]
						} else {
							[.camera, .microphone]
						}
						await deviceManager.requestPermissions(for: requestedDevices)
					}
				} else {
					streamDeckAdapter?.cleanup()
					streamDeckAdapter = nil
				}
			}
		}

		@Published fileprivate(set) var build: String?

		@Published fileprivate(set) var theme: Theme?

		@Published fileprivate(set) var releaseTrack: String?

		@Published fileprivate(set) var userID: String? {
			didSet {
				guard userID != oldValue else { return }
				windowManager.showsToolbar = isSignedIn
				guard let userID else { return }
				Analytics.shared.identify(userID: userID)
			}
		}

		@Published fileprivate(set) var userEmail: String?

		@Published fileprivate(set) var slideIdentifier: String?

		@Published fileprivate(set) var slideStatus: String?

		@Published fileprivate(set) var currentSlidePreview: URL?

		@Published fileprivate(set) var nextSlidePreview: URL?

		@Published fileprivate(set) var previousSlidePreview: URL?

		@Published var currentEffectID: String? {
			didSet {
				guard mustUpdateBrowser, currentEffectID != oldValue else { return }
				if let effect = currentEffectID {
					setPresenterValue(effect, forKey: .presenterEffect)
				} else {
					setRawPresenterValue("null", forKey: .presenterEffect)
				}
			}
		}

		@Published fileprivate(set) var presenterEffects: [String: String] = [:]

		@Clamped(toRange: 0.0...1.0, defaultValue: 0.0)
		var presenterEffectValue: Double {
			didSet {
				guard mustUpdateBrowser, presenterEffectValue != oldValue else { return }
				setPresenterValue(presenterEffectValue, forKey: .presenterEffectValue)
			}
		}

		@Published fileprivate(set) var isRecording: Bool = false

		@Published var isStageRendering: Bool = false

		@Published fileprivate(set) var remoteVisible: Bool = false {
			didSet {
				guard mustUpdateBrowser, remoteVisible != oldValue else { return }
				setPresenterValue(remoteVisible, forKey: .remoteVisible)
			}
		}

		// MARK: - Presenter Settings
		@Published var presenterMask: Mask = .rectangle {
			didSet {
				guard mustUpdateBrowser, presenterMask != oldValue else { return }
				setPresenterValue(presenterMask.rawValue, forKey: .presenterMask)
			}
		}

		@Clamped(toRange: 0.0...1.0, defaultValue: 1.0)
		var presenterOpacity: Double {
			didSet {
				guard mustUpdateBrowser, presenterOpacity != oldValue else { return }
				setPresenterValue(presenterOpacity, forKey: .presenterOpacity)
			}
		}

		@ModuloRotated(defaultValue: 0.0)
		var presenterRotation: Double {
			didSet {
				guard mustUpdateBrowser, presenterRotation != oldValue else { return }
				setPresenterValue(presenterRotation, forKey: .presenterRotation)
			}
		}

		@Clamped(toRange: 0.0...1.0, defaultValue: 1.0)
		var presenterScale: Double {
			didSet {
				guard mustUpdateBrowser, presenterScale != oldValue else { return }
				setPresenterValue(presenterScale, forKey: .presenterScale)
			}
		}

		@Clamped(toRange: 0.0...1.0, defaultValue: 0.0)
		var presenterEnhancement: Double {
			didSet {
				guard mustUpdateBrowser, presenterEnhancement != oldValue else { return }
				setPresenterValue(presenterEnhancement, forKey: .presenterEnhancement)
			}
		}

		@Published var presenterFullscreen: Bool = false {
			didSet {
				guard mustUpdateBrowser, presenterFullscreen != oldValue else { return }
				setPresenterValue(presenterFullscreen, forKey: .presenterFullscreen)
			}
		}

		// MARK: - Camera Settings
		@Clamped(toRange: 1.0...1.2, defaultValue: 1.0)
		var cameraZoom: Double {
			didSet {
				guard mustUpdateBrowser, cameraZoom != oldValue else { return }
				setPresenterValue(cameraZoom, forKey: .cameraZoom)
			}
		}

		@Published var cameraEnabled: Bool = true {
			didSet {
				guard mustUpdateBrowser, cameraEnabled != oldValue else { return }
				setPresenterValue(cameraEnabled, forKey: .cameraEnabled)
			}
		}

		@Published var mirrorVideo: Bool = false {
			didSet {
				guard mustUpdateBrowser, mirrorVideo != oldValue else { return }
				setPresenterValue(mirrorVideo, forKey: .mirrorVideo)
			}
		}

		@Published var microphoneEnabled: Bool = true {
			didSet {
				guard mustUpdateBrowser, microphoneEnabled != oldValue else { return }
				setPresenterValue(microphoneEnabled, forKey: .microphoneEnabled)
			}
		}

		@Published var gesturesEnabled: Bool = true {
			didSet {
				guard mustUpdateBrowser, gesturesEnabled != oldValue else { return }
				setPresenterValue(gesturesEnabled, forKey: .bigHandsEnabled)
			}
		}

		@Published var hasNextSlide: Bool = true {
			didSet {
				guard mustUpdateBrowser, hasNextSlide != oldValue else { return }
				setPresenterValue(hasNextSlide, forKey: .hasNextSlide)
			}
		}

		@Published var hasPreviousSlide: Bool = true {
			didSet {
				guard mustUpdateBrowser, hasPreviousSlide != oldValue else { return }
				setPresenterValue(hasPreviousSlide, forKey: .hasPreviousSlide)
			}
		}

		@Published var slideVisible: Bool = true {
			didSet {
				guard mustUpdateBrowser, slideVisible != oldValue else { return }
				setPresenterValue(slideVisible, forKey: .slideVisible)
			}
		}

		@Published fileprivate(set) var demoRooms: [Room] = []

		@Published var backgroundEnabled: Bool = true {
			didSet {
				guard mustUpdateBrowser, backgroundEnabled != oldValue else { return }
				setPresenterValue(!backgroundEnabled, forKey: .roomHidden)
			}
		}

		nonisolated var currentMedia: Media? {
			get async throws {
				let json: [String: Sendable]? = try await Task {
					try await javaScriptExecutor.execute(javaScript: "return HybridBridge.media")
				}.result.get()

				return if let json {
					try Media(json: json)
				} else {
					nil
				}
			}
		}

		nonisolated var currentRoom: Room? {
			get async throws {
				let json: [String: Sendable]? = try await Task {
					try await javaScriptExecutor.execute(javaScript: "return HybridBridge.room")
				}.result.get()

				return if let json {
					try Room(json: json)
				} else {
					nil
				}
			}
		}

		// swiftlint:disable:next cyclomatic_complexity function_body_length
		func updateProperty(key: String, value: Any?) {
			guard let property = PropertyKey(rawValue: key) else {
				Logger.logMessage("Property change for unsupported key: \(key)", level: .info)
				return
			}

			mustUpdateBrowser = false
			defer { mustUpdateBrowser = true }

			switch property {
			case .userID:
				let userID: String? = (value as? String)
				if self.userID != userID {
					self.userID = userID
				}
			case .userEmail:
				let userEmail: String? = (value as? String)
				if self.userEmail != userEmail {
					self.userEmail = userEmail
				}
			case .remoteVisible:
				let remoteVisible: Bool = (value as? Bool) ?? false
				if self.remoteVisible != remoteVisible {
					self.remoteVisible = remoteVisible
				}
			case .bigHandsEnabled:
				let gesturesEnabled: Bool = (value as? Bool) ?? false
				if self.gesturesEnabled != gesturesEnabled {
					self.gesturesEnabled = gesturesEnabled
				}
			case .cameraEnabled:
				let cameraEnabled: Bool = (value as? Bool) ?? false
				if self.cameraEnabled != cameraEnabled {
					self.cameraEnabled = cameraEnabled
				}
			case .microphoneEnabled:
				let microphoneEnabled: Bool = (value as? Bool) ?? false
				if self.microphoneEnabled != microphoneEnabled {
					self.microphoneEnabled = microphoneEnabled
				}
			case .cameraZoom:
				let cameraZoom: Double = (value as? Double) ?? 1
				if self.cameraZoom != cameraZoom {
					self.cameraZoom = cameraZoom
				}
			case .presenterEnhancement:
				let presenterEnhancement: Double = (value as? Double) ?? 0
				if self.presenterEnhancement != presenterEnhancement {
					self.presenterEnhancement = presenterEnhancement
				}
			case .presenterFullscreen:
				let presenterFullscreen: Bool = (value as? Bool) ?? false
				if self.presenterFullscreen != presenterFullscreen {
					self.presenterFullscreen = presenterFullscreen
				}
			case .presenterOpacity:
				let presenterOpacity: Double = (value as? Double) ?? 1
				if self.presenterOpacity != presenterOpacity {
					self.presenterOpacity = presenterOpacity
				}
			case .presenterRotation:
				let presenterRotation: Double = (value as? Double) ?? 0
				if self.presenterRotation != presenterRotation {
					self.presenterRotation = presenterRotation
				}
			case .presenterScale:
				let presenterScale: Double = (value as? Double) ?? 1
				if self.presenterScale != presenterScale {
					self.presenterScale = presenterScale
				}
			case .presenterMask:
				guard let rawMask = value as? String, let mask = Mask(rawValue: rawMask) else {
					presenterMask = .rectangle
					return
				}
				let presenterMask: Mask = mask
				if self.presenterMask != presenterMask {
					self.presenterMask = presenterMask
				}
			case .slideVisible:
				let slideVisible: Bool = (value as? Bool) ?? false
				if self.slideVisible != slideVisible {
					self.slideVisible = slideVisible
				}
			case .hasNextSlide:
				let hasNextSlide: Bool = (value as? Bool) ?? false
				if self.hasNextSlide != hasNextSlide {
					self.hasNextSlide = hasNextSlide
				}
			case .hasPreviousSlide:
				let hasPreviousSlide: Bool = (value as? Bool) ?? false
				if self.hasPreviousSlide != hasPreviousSlide {
					self.hasPreviousSlide = hasPreviousSlide
				}
			case .mirrorVideo:
				let mirrorVideo: Bool = (value as? Bool) ?? false
				if self.mirrorVideo != mirrorVideo {
					self.mirrorVideo = mirrorVideo
				}
			case .roomHidden:
				let backgroundEnabled: Bool = !((value as? Bool) ?? false)
				if self.backgroundEnabled != backgroundEnabled {
					self.backgroundEnabled = backgroundEnabled
				}
			case .isRecording:
				let isRecording: Bool = (value as? Bool) ?? false
				if self.isRecording != isRecording {
					self.isRecording = isRecording
				}
			case .presenterEffect:
				let currentEffectID: String? = (value as? String)
				if self.currentEffectID != currentEffectID {
					self.currentEffectID = currentEffectID
				}
			case .presenterEffectValue:
				let presenterEffectValue: Double = (value as? Double) ?? 0
				if self.presenterEffectValue != presenterEffectValue {
					self.presenterEffectValue = presenterEffectValue
				}
			case .slideIdentifier:
				let slideIdentifier: String? = (value as? String)
				if self.slideIdentifier != slideIdentifier {
					self.slideIdentifier = slideIdentifier
				}
			case .slideStatus:
				let slideStatus: String? = (value as? String)
				if self.slideStatus != slideStatus {
					self.slideStatus = slideStatus
				}
			case .currentSlidePreview:
				guard let stringValue: String = (value as? String) else {
					currentSlidePreview = nil
					return
				}
				let currentSlidePreview: URL? = URL(string: stringValue)
				if self.currentSlidePreview != currentSlidePreview {
					self.currentSlidePreview = currentSlidePreview
				}
			case .nextSlidePreview:
				guard let stringValue: String = (value as? String) else {
					nextSlidePreview = nil
					return
				}
				let nextSlidePreview: URL? = URL(string: stringValue)
				if self.nextSlidePreview != nextSlidePreview {
					self.nextSlidePreview = nextSlidePreview
				}
			case .previousSlidePreview:
				guard let stringValue: String = (value as? String) else {
					previousSlidePreview = nil
					return
				}
				let previousSlidePreview: URL? = URL(string: stringValue)
				if self.previousSlidePreview != previousSlidePreview {
					self.previousSlidePreview = previousSlidePreview
				}
			case .hasCurrentSlide:
				// This property is not currently in use.
				break
			case .theme:
				guard let stringValue: String = (value as? String) else {
					theme = .system
					return
				}
				theme = Theme(rawValue: stringValue) ?? .system
			}
		}

		// MARK: - Actions

		func enableSlidePreviewNotifications() {
			do {
				try javaScriptExecutor.execute(javaScript: "HybridBridge.enableSlideThumbnailNotifications(true)")
			} catch {
				Logger.logMessage("Failed to enable thumbnail notifications", level: .fault)
			}
		}

		func showReleaseNotes() {
			do {
				try javaScriptExecutor.execute(javaScript: "HybridBridge.displayReleaseNotes()")
			} catch {
				Logger.logMessage("Failed to show release notes: \(error)", level: .fault)
			}
		}

		func openBroadcastWindow() {
			do {
				try javaScriptExecutor.execute(javaScript: "gApp.openBroadcastWindow()")
			} catch {
				Logger.logMessage("Failed to open broadcast window: \(error)", level: .fault)
			}
		}

		func openRemoteControl() {
			do {
				try javaScriptExecutor.execute(javaScript: "gApp.openMiniRemoteWindow()")
			} catch {
				Logger.logMessage("Failed to open remote control: \(error)", level: .fault)
			}
		}

		func startOrResumeRecording() {
			do {
				try javaScriptExecutor.execute(javaScript: "HybridBridge.startOrResumeRecording()")
			} catch {
				Logger.logMessage("Failed to start or resume recording: \(error)", level: .fault)
			}
		}

		func pauseRecording() {
			do {
				try javaScriptExecutor.execute(javaScript: "HybridBridge.pauseRecording()")
			} catch {
				Logger.logMessage("Failed to pause recording: \(error)", level: .fault)
			}
		}

		func nextSlide() {
			do {
				try javaScriptExecutor.execute(javaScript: "HybridBridge.selectNextSlide()")
			} catch {
				Logger.logMessage("Failed to go to the next slide: \(error)", level: .fault)
			}
		}

		func previousSlide() {
			do {
				try javaScriptExecutor.execute(javaScript: "HybridBridge.selectPreviousSlide()")
			} catch {
				Logger.logMessage("Failed to go to the previous slide: \(error)", level: .fault)
			}
		}

		func switchToRoom(withIdentifier identifier: String) {
			do {
				try javaScriptExecutor.execute(javaScript: "HybridBridge.room = \"\(identifier)\"")
			} catch {
				Logger.logMessage("Failed to switch to room: \(identifier)", level: .fault)
			}
		}

		func showMedia(withIdentifier identifier: String) {
			do {
				try javaScriptExecutor.execute(javaScript: "HybridBridge.toggleMedia(\"\(identifier)\")")
			} catch {
				Logger.logMessage("Failed to show media: \(identifier)", level: .fault)
			}
		}

		func setup(withHybridBridgeInitializedInfo info: SwiftBridgeHybridBridgeInitializedInfo) {
			Logger.logMessage("Setup with web app \(info.build) \(info.releaseTrack) \(info.theme)", level: .info)

			build = info.build
			theme = Theme(rawValue: info.theme) ?? .system
			releaseTrack = info.releaseTrack
			hybridBridgeIsInitialized = true

			Task {
				do {
					try await fetchProperties()
				} catch {
					Logger.logMessage("Failed to fetch initial values: \(error)", level: .fault)
				}
			}
		}

		private func fetchProperties() async throws {
			presenterEffects = try await Task {
				try await javaScriptExecutor.presenterEffects
			}.result.get()

			demoRooms = try await Task {
				try await javaScriptExecutor.demoRooms
			}.result.get()

			userID = try await Task {
				try await javaScriptExecutor.userID
			}.result.get()

			userEmail = try await Task {
				try await javaScriptExecutor.userEmail
			}.result.get()

			try await updateProperties()
		}

		private func updateProperties() async throws {
			let javascriptProperties: [String] = PropertyKey.allCases.map { "\"\($0.rawValue)\": HybridBridge.\($0.rawValue)" }
			let javascript = "return {\(javascriptProperties.joined(separator: ","))};"
			let properties: [String: Sendable] = try await Task {
				try await javaScriptExecutor.execute(javaScript: javascript)
			}.result.get()

			PropertyKey.allCases.forEach { key in
				guard let value = properties[key.rawValue] else { return }
				updateProperty(key: key.rawValue, value: value)
			}
		}

		// MARK: - Web App Communication

		private func setPresenterValue(_ value: String, forKey key: PropertyKey) {
			setRawPresenterValue("\"\(value)\"", forKey: key)
		}

		private func setPresenterValue(_ value: Double, forKey key: PropertyKey) {
			setRawPresenterValue("\(value)", forKey: key)
		}

		private func setPresenterValue(_ value: Bool, forKey key: PropertyKey) {
			setRawPresenterValue(value ? "true" : "false", forKey: key)
		}

		private func setRawPresenterValue(_ rawValue: String, forKey key: PropertyKey) {
			guard hybridBridgeIsInitialized else {
				Logger.logMessage("Not setting presenter value for key '\(key.rawValue)' because the hybrid bridge is not initialized.", level: .info)
				return
			}

			do {
				try javaScriptExecutor.execute(javaScript: "HybridBridge.\(key.rawValue) = \(rawValue)")
			} catch {
				Logger.logMessage("Failed to set presenter value for key '\(key.rawValue)': \(error)", level: .fault)
			}
		}

		// MARK: - WebApp.Base Overrides

		override func didUpdateState(_ state: State) {
			super.didUpdateState(state)

			guard state != .loaded else { return }

			// Reset stateful properties when leaving the loaded state.
			build = nil
			theme = nil
			releaseTrack = nil
			hybridBridgeIsInitialized = false
		}

		override func handle(creationInfo: CEFBrowser.CreationInfo) -> Bool {
			guard super.handle(creationInfo: creationInfo) == false else {
				return true
			}

			guard isCreator else {
				return false
			}

			switch creationInfo.webAppType {
			case .miniRemote:
				Logger.logMessage("Configuring window as remote control window.", level: .info)
				configureRemoteControlWindow(with: creationInfo)
				return true
			case .broadcast:
				Logger.logMessage("Configuring window as broadcast window.", level: .info)
				configureBroadcastWindow(with: creationInfo)
				return true
			default:
				return false
			}
		}

		override func handle(loadInfo: CEFBrowser.LoadInfo) -> Bool {
			guard super.handle(loadInfo: loadInfo) == false else {
				return true
			}

			guard isCreator else {
				return false
			}

			switch loadInfo.webAppType {
			case .miniRemote:
				Logger.logMessage("Handling window as remote control window.", level: .info)
				remoteControlWindowManager?.removeLoadingIndicator()
				return true
			case .broadcast:
				return true
			default:
				return false
			}
		}

		override func ownsWindow(_ window: NSWindow) -> Bool {
			// swiftformat:disable indent
			window == windowManager.window ||
			window == broadcastWindowManager?.window ||
			window == remoteControlWindowManager?.window
			// swiftformat:enable indent
		}

		override func handleWindowDidClose(ofWebApp webApp: WebApp.WebAppType) -> Bool {
			guard super.handleWindowDidClose(ofWebApp: webApp) else {
				return false
			}

			Task {
				let deviceManager = Application.cefAppDelegate.deviceManager
				await deviceManager.stopVirtualCameraProducer()
			}

			broadcastWindowManager?.closeWindow()
			remoteControlWindowManager?.closeWindow()

			return true
		}

		override func ownsBrowser(withID browserID: Int) -> Bool {
			guard isCreator else {
				return super.ownsBrowser(withID: browserID)
			}

			return [
				windowManager.browserID,
				broadcastWindowManager?.browserID,
				remoteControlWindowManager?.browserID,
			].contains(browserID)
		}

		// MARK: - Broadcast Window

		private func broadcastWindowManager(withWindow window: NSWindow) -> BroadcastWindowManager {
			if let broadcastWindowManager {
				broadcastWindowManager.window = window
				return broadcastWindowManager
			} else {
				Logger.logMessage("Creating broadcast window.", level: .info)

				let broadcastWindowManager = BroadcastWindowManager(window: window)
				self.broadcastWindowManager = broadcastWindowManager

				return broadcastWindowManager
			}
		}

		func configureBroadcastWindow(with info: CEFBrowser.CreationInfo) {
			let broadcastWindowManager: BroadcastWindowManager = broadcastWindowManager(withWindow: info.window)
			broadcastWindowManager.browserID = info.browserID
			broadcastWindowManager.window?.makeKeyAndOrderFront(self)
		}

		// MARK: - Remote Window

		private func remoteControlWindowManager(withWindow window: NSWindow) -> RemoteControlWindowManager {
			if let remoteControlWindowManager {
				remoteControlWindowManager.window = window
				return remoteControlWindowManager
			} else {
				let remoteControlWindowManager = RemoteControlWindowManager(window: window)
				self.remoteControlWindowManager = remoteControlWindowManager

				return remoteControlWindowManager
			}
		}

		func configureRemoteControlWindow(with info: CEFBrowser.CreationInfo) {
			let remoteControlWindowManager: RemoteControlWindowManager = remoteControlWindowManager(withWindow: info.window)
			remoteControlWindowManager.browserID = info.browserID
			remoteControlWindowManager.window?.makeKeyAndOrderFront(self)
		}
	}
}
