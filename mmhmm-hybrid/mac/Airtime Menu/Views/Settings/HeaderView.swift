//
//  HeaderView.swift
//  Airtime Menu
//
//  Created by Beni Federer on 30.05.25.
//

import SwiftUI

struct HeaderView: View {
	var body: some View {
		HStack(spacing: 12) {
			Spacer()
			if let appIcon = NSImage(named: "AppIcon") {
				Image(nsImage: appIcon)
					.resizable()
					.frame(width: 64, height: 64)
					.cornerRadius(12)
			}
			Text("Airtime")
				.font(.title)
				.fontWeight(.bold)
			Spacer()
		}
		.padding(.vertical, 16)
	}
}

struct HeaderView_Previews: PreviewProvider {
	static var previews: some View {
		HeaderView()
	}
}
