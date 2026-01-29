//
//  AppDelegate+AppBundleMoverDelegate.swift
//  mmhmm
//
//  Created by Beni Federer on 06.08.24.
//

import Foundation

extension AppDelegate: AppBundleMoverDelegate {
	var appBundleMoverAppName: String { "Airtime" }

	func userSelected(action: AppBundleMover.Action) {
		Logger.logMessage("App bundle mover selection: \(action)", level: .info)
	}
}

extension AppBundleMover.Action: CustomStringConvertible {
	var description: String {
		switch self {
		case .moveReplace: "Move or replace"
		case .launchExistingVersionInApplicationsFolder: "Launch existing version in Applications folder"
		case let .cancel(withSuppression): "Cancel\(withSuppression ? " with suppression" : "")"
		}
	}
}
