//
//  WebApp.swift
//  mmhmm
//
//  Created by Beni Federer on 07.08.25.
//

import Foundation

enum WebApp {
	/// The type of web app a browser's content represents.
	///
	/// This is a surrogate for the C++ enum of the same name.
	/// Technically, Swift cxx-interop should support the C++ enum,
	/// but in practice the type can't be resolved at compile time (yet).
	enum WebAppType: String {
		case external
		case miniRemote
		case mmhmm
		case broadcast
		case prompt
		case hybridAPITester
		case segmentationPanel
		case toolbox
		case offline
		case stacks
		case camera
		case creator
		case screenRecorder
		case localHost
		case settings
	}

	/// The themes supported by the web app.
	///
	/// As defined in `gApp.validThemes`.
	enum Theme: String {
		case dark
		case light
		case system
	}
}

extension WebApp.WebAppType {
	static let toolWebApps: [WebApp.WebAppType] = [
		.camera,
		.creator,
		.screenRecorder,
		.stacks,
	]

	var userFriendlyName: String {
		switch self {
		case .external: "External"
		case .miniRemote: "Mini Remote"
		case .mmhmm: "mmhmm"
		case .broadcast: "Broadcast"
		case .prompt: "Prompt"
		case .hybridAPITester: "Hybrid API Tester"
		case .segmentationPanel: "Segmentation Panel"
		case .toolbox: "Toolbox"
		case .offline: "Offline"
		case .stacks: "Stacks"
		case .camera: "Camera"
		case .creator: "Creator"
		case .screenRecorder: "Screen Recorder"
		case .localHost: "localhost"
		case .settings: "Settings"
		}
	}

	var allowsBroadcastMode: Bool {
		switch self {
		case .broadcast, .creator, .miniRemote: true
		default: false
		}
	}

	var allowsSpeakerNotes: Bool {
		switch self {
		case .broadcast, .creator, .miniRemote: true
		default: false
		}
	}

	var supportsUndoRedo: Bool {
		switch self {
		case .camera, .creator, .miniRemote, .stacks: true
		default: false
		}
	}

	var supportsBalancedMode: Bool {
		switch self {
		case .broadcast, .camera, .creator, .miniRemote: true
		default: false
		}
	}

	var showsToolbar: Bool {
		switch self {
		case .camera, .creator, .screenRecorder, .stacks: true
		default: false
		}
	}
}

extension WebApp.WebAppType: Codable {}
