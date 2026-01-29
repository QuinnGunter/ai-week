//
//  CMVideoDimensions+CGSize.swift
//  CameraExtension
//
//  Created by Beni Federer on 17.11.23.
//

import CoreMedia

extension CMVideoDimensions {
	var cgSize: CGSize {
		CGSize(width: Double(width), height: Double(height))
	}
}
