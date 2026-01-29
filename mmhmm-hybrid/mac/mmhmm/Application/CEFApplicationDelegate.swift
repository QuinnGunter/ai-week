//
//  CEFApplicationDelegate.swift
//  mmhmm
//
//  Created by Beni Federer on 25.07.24.
//

import AppKit

@MainActor
protocol CEFApplicationDelegate: NSApplicationDelegate {
	/// The implementation should close all CEF windows.
	func tryToTerminateApplication(_ app: NSApplication)
}
