//
//  PulsatingIconView.swift
//  mmhmm
//
//  Created by Beni Federer on 18.11.25.
//

import Combine
import SwiftUI

import Common

/// A view that displays a pulsating icon by modulating its opacity over time.
struct PulsatingIconView: View {
	let imageName: String
	let baseOpacity: Double
	let pulseAmplitude: Double
	let pulseDuration: TimeInterval

	@State private var pulseOpacity: Double

	private let pulseTimer: Publishers.Autoconnect<Timer.TimerPublisher>
	private let logoImage: NSImage

	init(
		imageName: String,
		baseOpacity: Double = 0.6,
		pulseAmplitude: Double = 0.1,
		pulseDuration: TimeInterval = 2.0
	) {
		self.imageName = imageName
		self.baseOpacity = baseOpacity
		self.pulseAmplitude = pulseAmplitude
		self.pulseDuration = pulseDuration
		_pulseOpacity = State(initialValue: baseOpacity)
		pulseTimer = Timer.publish(every: 1.0 / 60.0, on: .main, in: .common).autoconnect()
		logoImage = NSImage(named: imageName) ?? NSImage()
	}

	var body: some View {
		Image(nsImage: logoImage.render(on: NSColor.accent.withAlphaComponent(pulseOpacity)))
			.onReceive(pulseTimer) { _ in
				updatePulseOpacity()
			}
	}

	private func updatePulseOpacity() {
		let elapsed: TimeInterval = Date().timeIntervalSince1970
		let elapsedScaled: TimeInterval = elapsed / pulseDuration
		let phase = elapsedScaled.truncatingRemainder(dividingBy: 1.0) * 2 * .pi
		// Oscillate between (baseOpacity - pulseAmplitude) and (baseOpacity + pulseAmplitude)
		pulseOpacity = baseOpacity + pulseAmplitude * sin(phase)
	}
}
