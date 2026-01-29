//
//  CameraExtensionStatusView.swift
//  mmhmm
//
//  Created by Beni Federer on 31.03.25.
//

import SwiftUI

import Common

struct CameraExtensionStatusView: View {
	var viewProvider: () -> NSView
	@State private var isHovered = false
	@State private var viewSize: CGSize = .zero

	/// Whether the view is in compact mode.
	///
	/// The view is considered compact when its width is small,
	/// which is the case when the message label is hidden in
	/// ``CameraExtensionTitleBarAccessoryViewWrapperView``.
	private var isCompact: Bool {
		viewSize.width < 80
	}

	var body: some View {
		HStack {
			ZStack {
				if NSApplication.isLiquidGlassAvailable {
					Capsule()
						.fill(Color("Colors/ContentTernary"))
						.offset(x: isCompact ? -6 : -7, y: 0)
						.scaleEffect(x: isCompact ? 1.3 : 1.1, y: 1.2)
						.opacity(isHovered ? 1 : 0)
						.animation(.easeInOut(duration: 0.15), value: isHovered)
				} else {
					RoundedRectangle(cornerRadius: 4)
						.fill(Color("Colors/ContentTernary"))
						.offset(x: -10, y: 0)
						.scaleEffect(x: 1.0, y: 0.8)
						.opacity(isHovered ? 1 : 0)
						.animation(.easeInOut(duration: 0.15), value: isHovered)
				}

				if NSApplication.isLiquidGlassAvailable {
					CameraExtensionTitleBarAccessoryViewWrapperView(viewProvider: viewProvider)
						.background(
							GeometryReader { geometry in
								Color.clear
									.onAppear {
										viewSize = geometry.size
									}
									.onChange(of: geometry.size) { newSize in
										viewSize = newSize
									}
							}
						)
				} else {
					CameraExtensionTitleBarAccessoryViewWrapperView(viewProvider: viewProvider)
				}
			}
			.padding(.leading, NSApplication.isLiquidGlassAvailable ? 16 : 8)
			.onHover { isHovered = $0 }
		}
	}
}

struct CameraExtensionTitleBarAccessoryViewWrapperView: NSViewRepresentable {
	var viewProvider: () -> NSView
	func makeNSView(context: Context) -> NSView { viewProvider() }
	func updateNSView(_ nsView: NSViewType, context: Context) {}
}

struct CameraExtensionStatusView_Previews: PreviewProvider {
	private static let viewController = CameraExtensionTitleBarAccessoryViewController()

	static var previews: some View {
		CameraExtensionStatusView(viewProvider: { Self.viewController.view })
	}
}
