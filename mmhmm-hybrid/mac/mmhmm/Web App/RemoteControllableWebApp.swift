//
//  RemoteControllableWebApp.swift
//  mmhmm
//
//  Created by Beni Federer on 15/09/2025.
//

import Combine
import Foundation

/// Protocol defining the interface that `StreamDeckManager` expects from a web app for remote control functionality.
/// This protocol encompasses all properties and methods required to control the app via Stream Deck.
@MainActor
protocol RemoteControllableWebApp {
	/// Indicates whether the hybrid bridge is initialized and ready for communication
	var hybridBridgeIsInitialized: Bool { get }

	// MARK: - Camera Controls

	/// Camera enabled state (toggleable)
	var cameraEnabled: Bool { get set }

	/// Camera zoom level (0.0 to higher values, typically 1.0 = 100%)
	var cameraZoom: Double { get set }

	/// Whether video feed is mirrored horizontally
	var mirrorVideo: Bool { get set }

	// MARK: - Audio Controls

	/// Microphone enabled state (toggleable)
	var microphoneEnabled: Bool { get set }

	// MARK: - Presenter Controls

	/// Presenter mask/frame style
	var presenterMask: WebApp.Mask { get set }

	/// Presenter opacity (0.0 to 1.0, where 1.0 = fully opaque)
	var presenterOpacity: Double { get set }

	/// Presenter rotation in degrees (0-360)
	var presenterRotation: Double { get set }

	/// Presenter scale factor (typically 1.0 = 100%)
	var presenterScale: Double { get set }

	/// Presenter enhancement/sharpness level (0.0 to 1.0)
	var presenterEnhancement: Double { get set }

	/// Whether presenter is displayed in fullscreen mode
	var presenterFullscreen: Bool { get set }

	// MARK: - Presenter Effects

	/// Available presenter effects as [effectName: effectID] dictionary
	var presenterEffects: [String: String] { get }

	/// Currently active effect ID (nil if no effect is active)
	var currentEffectID: String? { get set }

	/// Current effect intensity/value (0.0 to 1.0)
	var presenterEffectValue: Double { get set }

	// MARK: - Gesture Controls

	/// Whether big hands/gesture recognition is enabled
	var gesturesEnabled: Bool { get set }

	// MARK: - Slide/Presentation Controls

	/// Whether slide tray/slides are visible
	var slideVisible: Bool { get set }

	// MARK: - Background/Room Controls

	/// Whether background/room is enabled
	var backgroundEnabled: Bool { get set }

	/// Available demo rooms
	var demoRooms: [WebApp.Room] { get }

	// MARK: - Recording Controls

	/// Whether recording is currently active
	var isRecording: Bool { get }

	// MARK: - Action Methods

	/// Navigate to the next slide
	func nextSlide()

	/// Navigate to the previous slide
	func previousSlide()

	/// Switch to a specific room by identifier
	/// - Parameter identifier: The unique identifier of the room to switch to
	func switchToRoom(withIdentifier identifier: String)

	/// Show specific media by identifier
	/// - Parameter identifier: The unique identifier of the media to display
	func showMedia(withIdentifier identifier: String)

	/// Pause the current recording
	func pauseRecording()

	/// Start a new recording or resume a paused one
	func startOrResumeRecording()

	/// The currently active room
	var currentRoom: WebApp.Room? { get async throws }

	/// The currently active media
	var currentMedia: WebApp.Media? { get async throws }
}
