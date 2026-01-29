//
//  WebApp.StreamDeckAdapter.swift
//  mmhmm
//
//  Created by Beni Federer on 15.09.25.
//

import Combine
import Foundation

extension WebApp.Malk {
	@MainActor
	class StreamDeckAdapter {
		/// Initializes a new adapter for the given web app.
		///
		/// - Parameter webApp: The web app to associate with this adapter.
		/// - Note: This does not retain the web app, to avoid retain cycles.
		init(with webApp: WebApp.Malk<WebAppConfiguration>) {
			self.webApp = webApp
			setupPropertyUpdating(for: webApp)
			StreamDeckManager.shared.webApp = webApp
		}

		/// Refreshes the Stream Deck state by re-subscribing to the web app's properties.
		func refresh() {
			subscribers.removeAll()
			guard let webApp else { return }
			setupPropertyUpdating(for: webApp)
		}

		func cleanup() {
			StreamDeckManager.shared.webApp = nil
		}

		/// The web app that this adapter is associated with.
		///
		/// The weak reference here avoids retain cycles, as the web app
		/// likely holds a strong reference to this adapter.
		private(set) weak var webApp: WebApp.Malk<WebAppConfiguration>?

		private var subscribers: Set<AnyCancellable> = []

		// swiftlint:disable:next function_body_length
		private func setupPropertyUpdating(for webApp: WebApp.Malk<WebAppConfiguration>) {
			webApp.$gesturesEnabled.sink { enabled in
				StreamDeckManager.shared.sendMessage(action: .toggleBigHands, properties: [.enabled: enabled])
			}.store(in: &subscribers)
			webApp.$cameraEnabled.sink { enabled in
				StreamDeckManager.shared.sendMessage(action: .toggleCamera, properties: [.enabled: enabled])
			}.store(in: &subscribers)
			webApp.$microphoneEnabled.sink { enabled in
				StreamDeckManager.shared.sendMessage(action: .toggleMic, properties: [.enabled: enabled])
			}.store(in: &subscribers)
			webApp.$cameraZoom.sink { value in
				StreamDeckManager.shared.sendMessage(action: .cameraZoom, properties: [.value: value])
			}.store(in: &subscribers)
			webApp.$presenterOpacity.sink { value in
				StreamDeckManager.shared.sendMessage(action: .presenterOpacity, properties: [.value: value])
			}.store(in: &subscribers)
			webApp.$presenterRotation.sink { value in
				StreamDeckManager.shared.sendMessage(action: .presenterRotation, properties: [.value: value])
			}.store(in: &subscribers)
			webApp.$presenterScale.sink { value in
				StreamDeckManager.shared.sendMessage(action: .presenterScale, properties: [.value: value])
			}.store(in: &subscribers)
			webApp.$presenterEnhancement.sink { value in
				StreamDeckManager.shared.sendMessage(action: .presenterEnhancement, properties: [.value: value])
			}.store(in: &subscribers)
			webApp.$presenterFullscreen.sink { enabled in
				StreamDeckManager.shared.sendMessage(action: .presenterFullscreen, properties: [.enabled: enabled])
			}.store(in: &subscribers)
			webApp.$presenterMask.sink { mask in
				StreamDeckManager.shared.sendMessage(action: .presenterMask, properties: [.value: mask.rawValue])
			}.store(in: &subscribers)
			webApp.$slideVisible.sink { enabled in
				StreamDeckManager.shared.sendMessage(action: .toggleSlide, properties: [.enabled: enabled])
			}.store(in: &subscribers)
			webApp.$mirrorVideo.sink { enabled in
				StreamDeckManager.shared.sendMessage(action: .toggleMirrorVideo, properties: [.enabled: enabled])
			}.store(in: &subscribers)
			webApp.$backgroundEnabled.sink { enabled in
				StreamDeckManager.shared.sendMessage(action: .toggleBackground, properties: [.enabled: enabled])
			}.store(in: &subscribers)
			webApp.$isRecording.sink { enabled in
				StreamDeckManager.shared.sendMessage(action: .toggleRecording, properties: [.enabled: enabled])
			}.store(in: &subscribers)
			webApp.$presenterEffects.sink { effects in
				StreamDeckManager.shared.sendPresenterEffectsMessage(with: effects)
			}.store(in: &subscribers)
			webApp.$currentEffectID.sink { effectID in
				StreamDeckManager.shared.sendMessage(action: .presenterEffect, properties: [.value: effectID as Sendable])
			}.store(in: &subscribers)
			webApp.$presenterEffectValue.sink { effectValue in
				StreamDeckManager.shared.sendMessage(action: .presenterEffectValue, properties: [.value: effectValue])
			}.store(in: &subscribers)
			webApp.$demoRooms.sink { demoRooms in
				StreamDeckManager.shared.sendMessage(action: .switchRoom, properties: [.options: demoRooms.map(\.json)])
			}.store(in: &subscribers)
		}
	}
}
