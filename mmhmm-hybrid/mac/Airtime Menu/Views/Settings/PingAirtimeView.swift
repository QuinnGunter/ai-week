//
//  PingAirtimeView.swift
//  Airtime Menu
//
//  Created by Beni Federer on 02.06.25.
//

import SwiftUI

struct PingAirtimeView: View {
	@ObservedObject var model: AirtimeMenuBarApp.Model

	var body: some View {
		HStack(alignment: .top) {
			VStack(alignment: .leading) {
				Text("Remote Control Status")
					.font(.headline)
				Text("The status of the remote control connection to Airtime.")
					.font(.caption)
					.foregroundColor(.secondary)
			}
			.frame(width: 180, alignment: .leading)

			Image(systemName: model.pingState.iconName)
				.resizable()
				.scaledToFit()
				.frame(width: 20, height: 20)
				.foregroundColor(model.pingState.color)
				.help(model.pingState.tooltip)

			Button("Refresh Status") {
				Task { await model.refreshPingState() }
			}
			.padding(.leading, 8)
		}
	}
}

extension AirtimeMenuBarApp.Model.PingState {
	fileprivate var iconName: String {
		switch self {
		case .pinging: "questionmark.square.dashed"
		case .unavailable: "xmark.square.fill"
		case .succeeded: "checkmark.square.fill"
		case .failed: "xmark.octagon.fill"
		}
	}

	fileprivate var color: Color {
		switch self {
		case .pinging: .gray
		case .unavailable: .gray
		case .succeeded: .green
		case .failed: .red
		}
	}

	fileprivate var tooltip: String {
		switch self {
		case .pinging: String(localized: "Determining connection status...")
		case .unavailable: String(localized: "Airtime is not running.")
		case .succeeded: String(localized: "Connection is active.")
		case let .failed(error): String(localized: "Connection failed: \(error.localizedDescription)")
		}
	}
}

struct PingAirtimeView_Previews: PreviewProvider {
	static var previews: some View {
		PingAirtimeView(model: AirtimeMenuBarApp.Model())
	}
}
