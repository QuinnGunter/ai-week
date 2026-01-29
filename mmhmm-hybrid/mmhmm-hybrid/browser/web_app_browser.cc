//
//  web_app_browser.cc
//  mmhmm-hybrid
//
//  Created by Beni Federer on 29.04.24.
//

#include "web_app_browser.h"
#include "../common/string_util.h"

namespace mmhmm {

CefRefPtr<CefBrowser> GetWebAppBrowser() {
  client::MainContext* context = client::MainContext::Get();
  if (!context) {
    return nullptr;
  }  
  return context->GetWebAppBrowser();
}

const std::string cameraWebAppString = "camera";
const std::string creatorWebAppString = "creator";
const std::string screenRecorderWebAppString = "screenrecorder";
const std::string stacksWebAppString = "stacks";

std::optional<WebAppType> WebAppFromString(std::string webAppString) {
  if (client::ToLower(webAppString) == client::ToLower(cameraWebAppString)) {
    return WebAppType::camera;
  } else if (client::ToLower(webAppString) == client::ToLower(creatorWebAppString)) {
    return WebAppType::creator;
  } else if (client::ToLower(webAppString) == client::ToLower(screenRecorderWebAppString)) {
    return WebAppType::screen_recorder;
  } else if (client::ToLower(webAppString) == client::ToLower(stacksWebAppString)) {
    return WebAppType::stacks;
  } else {
    return std::nullopt;
  }
}

std::string WebAppToString(WebAppType app_type) {
  switch (app_type) {
    case WebAppType::creator:
    case WebAppType::mmhmm:
      return creatorWebAppString;
    case WebAppType::stacks:
      return stacksWebAppString;
    case WebAppType::camera:
      return cameraWebAppString;
    case WebAppType::screen_recorder:
      return screenRecorderWebAppString;
    default:
      return "";
  }
}

bool IsWebAppMalkType(WebAppType app_type) {
  return app_type == WebAppType::mmhmm || app_type == WebAppType::creator ||
         app_type == WebAppType::camera;
}

std::set<WebAppType> GetMainAppTypes() {
  return {WebAppType::camera, WebAppType::creator, WebAppType::mmhmm,
          WebAppType::stacks, WebAppType::screen_recorder};
}

} // namespace client
