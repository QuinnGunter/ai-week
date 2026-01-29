//
//  WebApp.JavaScriptExecutor+Device.swift
//  mmhmm
//
//  Created by Beni Federer on 08.10.24.
//

import Foundation

extension WebApp.JavaScriptExecutor {
	var activeAudioDeviceDescription: String {
		get async throws {
			try await execute(javaScript: "return HybridBridge.audioDevice")
		}
	}

	var activeVideoDeviceDescription: String {
		get async throws {
			try await execute(javaScript: "return HybridBridge.videoDevice")
		}
	}

	var userID: String {
		get async throws {
			try await execute(javaScript: "return HybridBridge.userId")
		}
	}

	var userEmail: String {
		get async throws {
			try await execute(javaScript: "return HybridBridge.userEmail")
		}
	}

	var presenterEffects: [String: String] {
		get async throws {
			try await execute(javaScript: "return HybridBridge.presenter_effects")
		}
	}

	var demoRooms: [WebApp.Room] {
		get async throws {
			let jsonRooms: [[String: String]] = try await execute(javaScript: "return HybridBridge.demo_rooms")
			return try jsonRooms.map { try WebApp.Room(json: $0) }
		}
	}
}
