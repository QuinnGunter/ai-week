//
//  WebApp.Malk+SupportingTypes.swift
//  mmhmm
//
//  Created by Beni Federer on 11.09.25.
//

import Foundation

extension WebApp.Malk {
	// swiftformat:disable:next redundantRawValues
	enum PropertyKey: String, CaseIterable {
		case userID = "userId"
		case userEmail = "userEmail"
		case remoteVisible = "remote_visible"
		case presenterMask = "presenter_mask"
		case presenterOpacity = "presenter_opacity"
		case presenterRotation = "presenter_rotation"
		case presenterScale = "presenter_scale"
		case presenterEnhancement = "presenter_enhancement"
		case presenterFullscreen = "presenter_fullScreen"
		case cameraZoom = "camera_zoom"
		case cameraEnabled = "camera_enabled"
		case microphoneEnabled = "microphone_enabled"
		case bigHandsEnabled = "bigHands_enabled"
		case slideVisible = "slide_selected"
		case hasNextSlide = "has_next_slide"
		case hasPreviousSlide = "has_previous_slide"
		case hasCurrentSlide = "has_current_slide"
		case mirrorVideo = "presenter_mirrorVideo"
		case roomHidden = "room_hidden"
		case isRecording
		case presenterEffect = "presenter_effect"
		case presenterEffectValue = "presenter_effect_value"
		case slideIdentifier = "slide_identifier"
		case slideStatus = "slide_status"
		case currentSlidePreview = "current_slide_preview"
		case nextSlidePreview = "next_slide_preview"
		case previousSlidePreview = "previous_slide_preview"
		case theme = "theme"
	}
}

extension WebApp {
	enum Mask: String {
		case rectangle
		case circle
		case silhouette
	}

	struct Room {
		let id: String
		let thumbnailURL: URL?
		let title: String

		init(id: String, thumbnailURL: URL?, title: String) {
			self.id = id
			self.thumbnailURL = thumbnailURL
			self.title = title
		}

		init(json: [String: Any]) throws {
			guard
				let id = json["identifier"] as? String,
				let title = json["title"] as? String
			else {
				throw Error.roomParsingFailed
			}

			let thumbnailURL: URL?

			if let rawThumbnailURL = json["thumbnail"] as? String {
				thumbnailURL = URL(string: rawThumbnailURL)
			} else {
				thumbnailURL = nil
			}

			self.init(id: id, thumbnailURL: thumbnailURL, title: title)
		}

		var json: [String: Sendable] {
			var json: [String: Sendable] = [
				"identifier": id,
				"title": title,
			]

			if let thumbnailURL {
				json["thumbnail"] = thumbnailURL.absoluteString
			}
			return json
		}
	}

	struct Media {
		let id: String
		let thumbnailURL: URL?

		init(id: String, thumbnailURL: URL?) {
			self.id = id
			self.thumbnailURL = thumbnailURL
		}

		init(json: [String: Any]) throws {
			guard let id = json["identifier"] as? String else {
				throw Error.mediaParsingFailed
			}

			let thumbnailURL: URL?

			if let rawThumbnailURL = json["thumbnail"] as? String {
				thumbnailURL = URL(string: rawThumbnailURL)
			} else {
				thumbnailURL = nil
			}

			self.init(id: id, thumbnailURL: thumbnailURL)
		}

		var json: [String: Sendable] {
			var json: [String: Sendable] = ["identifier": id]

			if let thumbnailURL {
				json["thumbnail"] = thumbnailURL.absoluteString
			}
			return json
		}
	}
}
