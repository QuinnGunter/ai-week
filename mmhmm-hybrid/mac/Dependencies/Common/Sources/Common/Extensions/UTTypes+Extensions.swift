//
//  UTTypes+Extensions.swift
//  Common
//
//  Created by Beni Federer on 29.07.25.
//

import UniformTypeIdentifiers

extension UTType {
	public static let textUTTypes: [UTType] = [
		.plainText,
		.json,
		.html,
		.javaScript,
		.xml,
		.commaSeparatedText,
	]

	public static let movieUTTypes: [UTType] = [
		.movie,
		.video,
		.quickTimeMovie,
		.mpeg4Movie,
		.avi,
		.mpeg2Video,
		.appleProtectedMPEG4Video,
	]

	public static let audioUTTypes: [UTType] = [
		.audio,
		.mp3,
		.mpeg4Audio,
		.wav,
		.aiff,
		.midi,
		.appleProtectedMPEG4Audio,
	]
}
