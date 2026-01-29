//
//  StreamDeckMessage.swift
//  mmhmm
//
//  Created by Martin Pilkington on 20/06/2023.
//

import Foundation

struct StreamDeckMessage {
	let action: Action
	let properties: [PropertyKey: Sendable]

	init(action: Action, properties: [PropertyKey: Sendable]) {
		self.action = action
		self.properties = properties
	}

	init(jsonData: Data) throws {
		guard
			let jsonObject = try JSONSerialization.jsonObject(with: jsonData, options: .fragmentsAllowed) as? [String: Any],
			let rawAction = jsonObject["action"] as? String
		else {
			throw Error.invalidJSON
		}

		guard let action = Action(rawValue: rawAction) else {
			throw Error.unknownAction
		}

		self.action = action
		let rawData = (jsonObject["properties"] as? [String: Sendable]) ?? [:]
		var data = [PropertyKey: Sendable]()
		for (key, value) in rawData {
			guard let dataKey = PropertyKey(rawValue: key) else {
				throw Error.invalidDataKey
			}
			data[dataKey] = value
		}
		properties = data
	}

	var jsondata: Data {
		get throws {
			var rawProperties = [String: Any]()
			for (key, value) in properties {
				rawProperties[key.rawValue] = value
			}

			let jsonObject: [String: Any] = [
				"action": action.rawValue,
				"properties": rawProperties,
			]
			return try JSONSerialization.data(withJSONObject: jsonObject)
		}
	}
}

extension StreamDeckMessage {
	enum Action: String {
		case presenterOpacity = "app.mmhmm.presenteropacity"
		case presenterRotation = "app.mmhmm.presenterrotation"
		case presenterScale = "app.mmhmm.presenterscale"
		case presenterEnhancement = "app.mmhmm.presenterenhancement"
		case presenterFullscreen = "app.mmhmm.presenterfullscreen"
		case cameraZoom = "app.mmhmm.camerazoom"
		case goToSlide = "app.mmhmm.gotoslide"
		case toggleCamera = "app.mmhmm.togglecamera"
		case toggleMic = "app.mmhmm.togglemic"
		case toggleBigHands = "app.mmhmm.togglebighands"
		case switchRoom = "app.mmhmm.switchroom"
		case toggleSlide = "app.mmhmm.toggleslide"
		case toggleMirrorVideo = "app.mmhmm.togglemirrorvideo"
		case toggleBackground = "app.mmhmm.togglebackground"
		case toggleRecording = "app.mmhmm.togglerecording"
		case presenterEffect = "app.mmhmm.presentereffect"
		case presenterMask = "app.mmhmm.presentermask"
		case presenterEffectValue = "app.mmhmm.presentereffectvalue"
		case switchMedia = "app.mmhmm.switchmedia"
	}

	enum Error: Swift.Error {
		case parsingFailure
		case invalidJSON
		case unknownAction
		case conversionFailure
		case invalidDataKey
		case invalidHandshakeReply
		case apiMismatch
		case handshakeTimedOut
	}

	enum PropertyKey: String {
		case delta
		case reset
		case value
		case enabled
		case context
		case options
		case icons
	}
}

extension StreamDeckMessage {
	var delta: Double {
		return (properties[.delta] as? Double) ?? 0.0
	}

	var needsReset: Bool {
		return (properties[.reset] as? Bool) ?? false
	}

	func typedValue<T>() -> T? {
		return properties[.value] as? T
	}

	var context: String {
		return (properties[.context] as? String) ?? ""
	}
}
