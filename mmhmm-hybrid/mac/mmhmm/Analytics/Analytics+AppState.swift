//
//  Analytics+AppState.swift
//  mmhmm
//
//  Created by Beni Federer on 17.04.25.
//

import Foundation

extension AppState {
	static let analyticsKey: String = "mode"
}

extension Array where Element == WebApp.WebAppType {
	var analyticsName: String {
		switch self {
		case [.creator], [.creator, .toolbox], [.toolbox, .creator]: "creator"
		case [.camera], [.camera, .toolbox], [.toolbox, .camera]: "camera"
		case [.stacks], [.stacks, .toolbox], [.toolbox, .stacks]: "stacks"
		case [.screenRecorder], [.screenRecorder, .toolbox], [.toolbox, .screenRecorder]: "screen_recorder"
		case [.toolbox]: "toolbox"
		default: "multiple"
		}
	}
}
