//
//  WebApp.Malk.Info.swift
//  mmhmm
//
//  Created by Beni Federer on 11.09.25.
//

import Foundation

extension WebApp {
	struct Info: Sendable {
		let activeAudioDevice: String
		let activeVideoDevice: String
		let loggedInUserEmail: String
		let loggedInUserID: String
	}
}

extension WebApp.Info {
	static let unknown = WebApp.Info(activeAudioDevice: "Unknown",
									 activeVideoDevice: "Unknown",
									 loggedInUserEmail: "Unknown",
									 loggedInUserID: "Unknown")
}

extension WebApp.Malk {
	var info: WebApp.Info {
		get async throws {
			async let activeAudioDevice: String = {
				do {
					return try await javaScriptExecutor.activeAudioDeviceDescription
				} catch {
					return error.localizedDescription
				}
			}()
			async let activeVideoDevice: String = {
				do {
					return try await javaScriptExecutor.activeVideoDeviceDescription
				} catch {
					return error.localizedDescription
				}
			}()
			async let loggedInUserID: String = {
				do {
					return try await javaScriptExecutor.userID
				} catch {
					return error.localizedDescription
				}
			}()
			async let loggedInUserEmail: String = {
				do {
					return try await javaScriptExecutor.userEmail
				} catch {
					return error.localizedDescription
				}
			}()

			return await WebApp.Info(activeAudioDevice: activeAudioDevice,
									 activeVideoDevice: activeVideoDevice,
									 loggedInUserEmail: loggedInUserEmail,
									 loggedInUserID: loggedInUserID)
		}
	}
}
