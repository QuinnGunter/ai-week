//
//  root_window_manager_mac.cc
//  mmhmm
//
//  Created by Beni Federer on 09.09.24.
//

#include "root_window_manager_mac.h"
#include "root_window.h"
#include "Airtime-Swift-Wrapper.h"

namespace mmhmm {
  void OnBrowserCreated(client::RootWindow* root_window, CefRefPtr<CefBrowser> browser) {
    ClientWindowHandle windowHandle = browser->GetHost()->GetWindowHandle();
    const WebAppType webAppType = root_window->GetWebAppType();
    const auto& config = root_window->GetConfig();
    std::string url;
    if (config) {
      url = config->url;
    }
    Airtime::SwiftBridge::onBrowserCreated(url, webAppType, windowHandle, browser->GetIdentifier());
  }
}
