//
//  RemoteControlState.ChangeObserver.swift
//  mmhmm
//
//  Created by Beni Federer on 21.05.25.
//

import Combine

extension RemoteControlState {
	/// Notifies about changes to any publishers of `AppState`, `Creator`
	/// and `CameraExtensionStateProvider`.
	@MainActor
	final class ChangeObserver {
		init(
			appState: AppState,
			browser: Browser,
			cameraExtensionStateProvider: DeviceManager.CameraExtensionStateProvider
		) {
			self.appState = appState
			self.browser = browser
			self.cameraExtensionStateProvider = cameraExtensionStateProvider
		}

		private let appState: AppState

		private let cameraExtensionStateProvider: DeviceManager.CameraExtensionStateProvider

		private var subscriptions: Set<AnyCancellable> = []

		private let browser: Browser

		private var creator: WebApp.Creator { browser.creator }

		private var screenRecorder: WebApp.ScreenRecorder { browser.screenRecorder }
	}
}

extension RemoteControlState.ChangeObserver {
	/// Starts the observer.
	///
	/// - Parameter debounceTimeInterval: The interval to wait for identical events
	///                                   to be observed before calling `handler`.
	/// - Parameter handler: The handler to call when any observed publisher changes.
	///                      Runs on `MainActor`.
	func start(debounceTimeInterval: DispatchQueue.SchedulerTimeType.Stride = .milliseconds(100), handler: @escaping @Sendable (() -> Void)) {
		creator
			.objectWillChange
			.debounce(for: debounceTimeInterval, scheduler: DispatchQueue.main)
			.sink {
				// Call the handler asynchronously to make sure the actual change
				// has materialized, since this is a `willChange` notification.
				//
				// Running the handler asynchronously also fixes issues where the
				// change notification is issued by a setter of a property, which
				// would be read synchronously further up the call stack, which
				// violates Swift's concurrency model.
				Task { @MainActor in handler() }
			}
			.store(in: &subscriptions)

		screenRecorder
			.objectWillChange
			.debounce(for: debounceTimeInterval, scheduler: DispatchQueue.main)
			.sink {
				// Call the handler asynchronously to make sure the actual change
				// has materialized, since this is a `willChange` notification.
				//
				// Running the handler asynchronously also fixes issues where the
				// change notification is issued by a setter of a property, which
				// would be read synchronously further up the call stack, which
				// violates Swift's concurrency model.
				Task { @MainActor in handler() }
			}
			.store(in: &subscriptions)

		appState
			.$webApps
			.debounce(for: debounceTimeInterval, scheduler: DispatchQueue.main)
			.sink { _ in
				Task { @MainActor in handler() }
			}
			.store(in: &subscriptions)

		cameraExtensionStateProvider
			.$state
			.debounce(for: debounceTimeInterval, scheduler: DispatchQueue.main)
			.sink { _ in
				Task { @MainActor in handler() }
			}
			.store(in: &subscriptions)
	}

	/// Stops the observer.
	func stop() {
		subscriptions.removeAll()
	}
}
