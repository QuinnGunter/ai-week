//
//  WebApp.WindowManager.ToolboxButtonView.swift
//  mmhmm
//
//  Created by Beni Federer on 28.02.25.
//

import SwiftUI

import Common

extension WebApp.WindowManager {
	struct ToolboxButtonView: View {
		let onButtonTap: () -> Void
		@ObservedObject var configuration: Configuration
		@State private var isHovered = false

		var body: some View {
			HStack {
				if let info: String = configuration.info {
					Text(info)
						.font(.system(size: 9))
						.foregroundColor(.yellow)
				}

				Button(action: onButtonTap) {
					ZStack {
						if NSApplication.isLiquidGlassAvailable {
							Capsule()
								.fill(Color("Colors/ContentTernary"))
								.frame(width: 70, height: 36)
								.opacity(isHovered ? 1 : 0)
								.animation(.easeInOut(duration: 0.15), value: isHovered)
						} else {
							RoundedRectangle(cornerRadius: 4)
								.fill(Color("Colors/ContentTernary"))
								.frame(width: 70, height: 24)
								.opacity(isHovered ? 1 : 0)
								.animation(.easeInOut(duration: 0.15), value: isHovered)
						}
						HStack {
							Image("Symbols/AirtimeLogo")
								.resizable()
								.aspectRatio(contentMode: .fit)
								.frame(width: 16, height: 16)
							Text("Tools")
								.font(.system(size: 11))
						}
					}
				}
				.foregroundColor(Color("Colors/ContentSecondary"))
				.buttonStyle(.plain)
				.disabled(!configuration.isEnabled)
				.help(configuration.tooltip ?? "")
				.onHover { isHovered = $0 }
			}
		}
	}
}

extension WebApp.WindowManager.ToolboxButtonView {
	final class Configuration: ObservableObject {
		@Published var isEnabled: Bool = true
		@Published var tooltip: String?
		@Published var info: String?
	}
}

extension WebApp.WindowManager.ToolboxButtonView.Configuration {
	func update(withToolboxButton toolboxButton: mmhmm.ToolboxButton) {
		isEnabled = toolboxButton.isEnabled
		tooltip = toolboxButton.tooltip.isEmpty ? nil : String(toolboxButton.tooltip)
		info = toolboxButton.info.isEmpty ? nil : String(toolboxButton.info)
	}
}

struct ToolboxButtonView_Previews: PreviewProvider {
	static var previews: some View {
		let configuration = {
			let configuration = WebApp.WindowManager.ToolboxButtonView.Configuration()
			configuration.isEnabled = true
			configuration.tooltip = "Open toolbox"
			return configuration
		}()

		WebApp.WindowManager.ToolboxButtonView(
			onButtonTap: { print("Button tapped") },
			configuration: configuration
		)
	}
}
