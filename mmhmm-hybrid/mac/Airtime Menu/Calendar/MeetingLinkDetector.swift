//
//  MeetingLinkDetector.swift
//  Airtime Menu
//
//  Created by Claude on 15.12.25.
//

import EventKit
import Foundation

struct MeetingLinkDetector {
	enum MeetingType: Equatable {
		case zoom
		case googleMeet
		case teams
		case webex
		case slack
		case discord
		case jitsi
		case whereby
		case unknown

		var isVideoMeeting: Bool {
			self != .unknown
		}
	}

	struct DetectedMeeting: Equatable {
		let type: MeetingType
		let url: URL
		let displayName: String

		var iconName: String {
			type.isVideoMeeting ? "video.fill" : "link"
		}
	}

	private static let patterns: [(regex: String, type: MeetingType, displayName: String)] = [
		// Zoom patterns (including onetoone subdomain)
		("https?://[^\\s]*zoom\\.us/j/[^\\s]+", .zoom, "Zoom"),
		("https?://[^\\s]*zoom\\.us/my/[^\\s]+", .zoom, "Zoom"),
		("https?://[^\\s]*zoom\\.us/s/[^\\s]+", .zoom, "Zoom"),

		// Google Meet
		("https?://meet\\.google\\.com/[a-z]{3}-[a-z]{4}-[a-z]{3}[^\\s]*", .googleMeet, "Google Meet"),

		// Microsoft Teams
		("https?://teams\\.microsoft\\.com/l/meetup-join/[^\\s]+", .teams, "Teams"),
		("https?://[^\\s]*teams\\.live\\.com/meet/[^\\s]+", .teams, "Teams"),

		// Webex
		("https?://[^\\s]*webex\\.com/[^\\s]*meet[^\\s]*", .webex, "Webex"),
		("https?://[^\\s]*webex\\.com/join/[^\\s]+", .webex, "Webex"),

		// Slack Huddles
		("https?://[^\\s]*slack\\.com/[^\\s]*huddle[^\\s]*", .slack, "Slack Huddle"),

		// Discord
		("https?://discord\\.gg/[^\\s]+", .discord, "Discord"),
		("https?://discord\\.com/channels/[^\\s]+", .discord, "Discord"),

		// Jitsi Meet
		("https?://meet\\.jit\\.si/[^\\s]+", .jitsi, "Jitsi"),
		("https?://[^\\s]*\\.onjitsi\\.com/[^\\s]+", .jitsi, "Jitsi"),

		// Whereby
		("https?://whereby\\.com/[^\\s]+", .whereby, "Whereby"),
	]

	static func detectMeetingLink(in event: EKEvent) -> DetectedMeeting? {
		let searchTexts = [
			event.notes,
			event.location,
			event.url?.absoluteString,
		].compactMap { $0 }

		for text in searchTexts {
			if let meeting = findMeetingLink(in: text) {
				return meeting
			}
		}

		return nil
	}

	private static func findMeetingLink(in text: String) -> DetectedMeeting? {
		for (pattern, type, displayName) in patterns {
			if let regex = try? NSRegularExpression(pattern: pattern, options: .caseInsensitive) {
				let range = NSRange(text.startIndex..., in: text)
				if let match = regex.firstMatch(in: text, range: range),
				   let matchRange = Range(match.range, in: text)
				{
					let urlString = String(text[matchRange])
					if let url = URL(string: urlString) {
						return DetectedMeeting(type: type, url: url, displayName: displayName)
					}
				}
			}
		}

		if let genericURL = findGenericVideoLink(in: text) {
			return genericURL
		}

		return nil
	}

	private static func findGenericVideoLink(in text: String) -> DetectedMeeting? {
		let urlPattern = "https?://[^\\s]+"
		guard let regex = try? NSRegularExpression(pattern: urlPattern, options: .caseInsensitive) else {
			return nil
		}

		let range = NSRange(text.startIndex..., in: text)
		let matches = regex.matches(in: text, range: range)

		for match in matches {
			guard let matchRange = Range(match.range, in: text) else { continue }
			let urlString = String(text[matchRange])
			guard let url = URL(string: urlString) else { continue }

			let host = url.host?.lowercased() ?? ""
			let videoKeywords = ["meet", "call", "video", "conference", "join"]

			if videoKeywords.contains(where: { host.contains($0) || url.path.lowercased().contains($0) }) {
				return DetectedMeeting(type: .unknown, url: url, displayName: "Join Meeting")
			}
		}

		return nil
	}
}
