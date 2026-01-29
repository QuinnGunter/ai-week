//
//  CEFHelpers.h
//  
//
//  Created by Beni Federer on 27.06.24.
//

#pragma once
#include "include/wrapper/cef_library_loader.h"

namespace CEFHelpers {
	/// ``CefScopedLibraryLoader`` can't be instantiated in Swift 6 due to deleted copy semantics.
	/// There are ways to deal with this, but it would require altering CEF code:
	/// https://www.swift.org/documentation/cxx-interop/#mapping-c-types-to-swift-reference-types
	/// This helper function is much simpler.
	inline bool LoadCEFLibrary() {
		return CefScopedLibraryLoader().LoadInMain();
	}
}
