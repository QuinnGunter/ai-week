//
//  WebApp.Stacks.swift
//  mmhmm
//
//  Created by Beni Federer on 04.08.25.
//

import Foundation

extension WebApp {
	typealias Stacks = Base<StacksConfiguration>

	struct StacksConfiguration: WebAppConfigurationProtocol {
		static let webAppType: WebApp.WebAppType = .stacks
	}
}
