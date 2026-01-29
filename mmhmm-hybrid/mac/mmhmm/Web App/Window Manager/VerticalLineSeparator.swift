//
//  VerticalLineSeparator.swift
//  mmhmm
//
//  Created by Beni Federer on 28.03.25.
//

import SwiftUI

struct VerticalLineSeparator: View {
	var body: some View {
		HStack {
			Spacer().frame(width: 10)
			Divider()
				.frame(height: 20)
				.frame(maxWidth: 1)
				.background(Color("Separator"))
			Spacer().frame(width: 10)
		}
	}
}

#Preview {
	VerticalLineSeparator()
}
