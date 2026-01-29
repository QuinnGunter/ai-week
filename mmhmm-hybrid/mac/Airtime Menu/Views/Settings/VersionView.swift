//
//  VersionView.swift
//  mmhmm
//
//  Created by Beni Federer on 04.11.25.
//

import SwiftUI

struct VersionView: View {
	let versionString: String

	var body: some View {
		Text(versionString)
			.font(.system(size: 11, weight: .light))
			.frame(maxWidth: .infinity, alignment: .center)
			.foregroundStyle(.tertiary)
			.textSelection(.enabled)
	}
}
