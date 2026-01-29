//
//  RemoteControlCreatorMenuView.swift
//  mmhmm
//
//  Created by Beni Federer on 30.10.25.
//

import SwiftUI

struct RemoteControlCreatorMenuView: View {
	@ObservedObject var model: AirtimeMenuBarApp.Model
	@State private var gesturesEnabled: Bool = false
	@State private var presenterFullscreen: Bool = false

	var body: some View {
		let gesturesEnabledBinding = Binding<Bool>(
			get: { model.remoteControlState?.gesturesEnabled ?? false },
			set: { _ in model.proxy?.toggleGesturesEnabled() }
		)

		let presenterFullscreenBinding = Binding<Bool>(
			get: { model.remoteControlState?.presenterFullscreen ?? false },
			set: { _ in model.proxy?.togglePresenterFullscreen() }
		)

		VStack {
			if let proxy = model.proxy, let remoteControlState = model.remoteControlState {
				if let slideStatus: String = remoteControlState.slideStatus, slideStatus.isEmpty == false {
					Text(slideStatus)
				}

				Button("Previous Slide") {
					proxy.previousSlide()
				}
				.disabled(remoteControlState.hasPreviousSlide == false)

				Button("Next Slide") {
					proxy.nextSlide()
				}
				.disabled(remoteControlState.hasNextSlide == false)

				Button {
					proxy.toggleSlideVisible()
				} label: {
					if remoteControlState.slideVisible {
						Text("Hide Slides")
					} else {
						Text("Show Slides")
					}
				}

				Button {
					proxy.toggleCameraEnabled()
				} label: {
					if remoteControlState.cameraEnabled {
						Text("Disable Camera")
					} else {
						Text("Enable Camera")
					}
				}

				Toggle("Presenter Fullscreen", isOn: presenterFullscreenBinding)

				Toggle("Big Hands", isOn: gesturesEnabledBinding)
			} else {
				Text("Airtime Creator is unavailable")
					.disabled(true)
			}
		}
	}
}
