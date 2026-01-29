//
//  browser_event_handler_mac.cpp
//  mmhmm
//
//  Created by Martin Pilkington on 07/02/2024.
//

#include "browser_event_handler.h"
#include "urls.h"
#include "client_types.h"

#include "Airtime-Swift-Wrapper.h"

namespace mmhmm {
  void BrowserEventHandler::OnBeforeBrowse(CefRefPtr<CefBrowser> browser, CefRefPtr<CefFrame> frame, CefRefPtr<CefRequest> request, bool userGesture, bool isRedirect) {
    auto urlString = request->GetURL().ToString();
    auto webAppType = GetWebAppType(urlString);
    Airtime::SwiftBridge::onBeforeBrowse(urlString, webAppType, browser->GetIdentifier(), frame->IsMain(), frame->GetIdentifier());
  }

  void BrowserEventHandler::OnLoadEnd(CefRefPtr<CefBrowser> browser, CefRefPtr<CefFrame> frame, int httpStatusCode) {
    auto urlString = frame->GetURL().ToString();
    auto webAppType = GetWebAppType(urlString);
    Airtime::SwiftBridge::onLoadEnd(urlString, webAppType, httpStatusCode, browser->GetIdentifier(), frame->IsMain(), frame->GetIdentifier());
  }
  
  void BrowserEventHandler::OnLoadError(CefRefPtr<CefBrowser> browser, CefRefPtr<CefFrame> frame, CefLoadHandler::ErrorCode errorCode, const CefString &errorText, const CefString &failedUrl) {
    auto mainFrame = browser->GetMainFrame();
    if (!mainFrame) { return; }

    auto urlString = frame->GetURL().ToString();
    auto webAppType = GetWebAppType(urlString);
    auto errorString = errorText.ToString();
    Airtime::SwiftBridge::onLoadError(urlString, webAppType, errorString, errorCode, browser->GetIdentifier(), frame->IsMain(), frame->GetIdentifier());
  }
}
