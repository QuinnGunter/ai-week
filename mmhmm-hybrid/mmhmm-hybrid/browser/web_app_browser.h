//
//  web_app_browser.hpp
//  mmhmm-hybrid
//
//  Created by Beni Federer on 29.04.24.
//

#pragma once

#include "main_context.h"
#include "include/base/cef_ref_counted.h"
#include "include/cef_browser.h"

namespace mmhmm {

CefRefPtr<CefBrowser> GetWebAppBrowser();

std::optional<WebAppType> WebAppFromString(std::string webAppString);
std::string WebAppToString(WebAppType app_type);
bool IsWebAppMalkType(WebAppType app_type);
std::set<WebAppType> GetMainAppTypes();
}

