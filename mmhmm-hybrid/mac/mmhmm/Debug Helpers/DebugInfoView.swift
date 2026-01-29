//
//  DebugInfoView.swift
//  mmhmm
//
//  Created by Beni Federer on 11.04.25.
//

import SwiftUI

struct DebugInfoView: View {
	@State private var isHovered = false
	@State private var showAlert = false

	var body: some View {
		if Configuration.hasOverrides {
			Button(action: {
				showAlert = true
			}, label: {
				ZStack {
					if NSApplication.isLiquidGlassAvailable {
						Capsule()
							.fill(
								RadialGradient(
									colors: [.red, Color(red: 0.5, green: 0, blue: 0)],
									center: .center,
									startRadius: 0,
									endRadius: 17
								)
							)
							.frame(width: 24, height: 36)
							.opacity(isHovered ? 0.75 : 1)
							.animation(.easeInOut(duration: 0.15), value: isHovered)
					} else {
						RoundedRectangle(cornerRadius: 4)
							.fill(.red)
							.frame(width: 24, height: 24)
							.opacity(isHovered ? 0.75 : 1)
							.animation(.easeInOut(duration: 0.15), value: isHovered)
					}
					Image(systemName: "exclamationmark.circle.fill")
				}
			})
			.buttonStyle(.plain)
			.foregroundColor(.yellow)
			.help(Configuration.overridesSummary)
			.onHover { isHovered = $0 }
			.alert("Active Overrides", isPresented: $showAlert) {
				Button("OK", role: .cancel) {
					showAlert = false
				}
				Button("Remove & Relaunch", role: .destructive) {
					Configuration.removeOverrides()
					showAlert = false
				}
			} message: {
				Text("These overrides might cause unexpected behavior:\n\n\(Configuration.overridesSummary)")
			}
		} else {
			EmptyView()
		}
	}
}

struct DebugInfoView_Previews: PreviewProvider {
	static var previews: some View {
		DebugInfoView()
	}
}
