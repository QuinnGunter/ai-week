//
//  AVAuthorizationStatus+Description.swift
//  Common
//
//  Created by Beni Federer on 24.10.24.
//

import AVFoundation

extension AVAuthorizationStatus {
	public var description: String {
		switch self {
		case .notDetermined: "Not Determined"
		case .authorized: "Authorized"
		case .denied: "Denied"
		case .restricted: "Restricted"
		@unknown default: String(describing: self)
		}
	}
}
