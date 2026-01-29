//
//  root_window_manager_mac.h
//  mmhmm
//
//  Created by Beni Federer on 09.09.24.
//

#pragma once

#include "include/cef_v8.h"

namespace client {
	class RootWindow;
}

namespace mmhmm {
	void OnBrowserCreated(client::RootWindow* root_window, CefRefPtr<CefBrowser> browser);
}
