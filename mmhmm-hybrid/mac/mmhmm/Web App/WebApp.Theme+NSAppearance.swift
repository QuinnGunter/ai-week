//
//  WebApp.Theme+NSAppearance.swift
//  mmhmm
//
//  Created by Beni Federer on 15.01.25.
//

import AppKit

import Common

extension WebApp.Theme {
	@MainActor
	var appearance: NSAppearance? {
		switch self {
		case .dark: NSAppearance(named: .darkAqua)
		case .light: NSAppearance(named: .aqua)
		case .system: .systemAppearance
		}
	}
}
