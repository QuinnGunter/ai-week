//
//  browser_event_handler.h
//  mmhmm-hybrid
//
//  Created by Martin Pilkington on 07/02/2024.
//

#pragma once

#include "include/cef_v8.h"
#include "include/cef_load_handler.h"

namespace mmhmm {
	namespace BrowserEventHandler {
		void OnBeforeBrowse(CefRefPtr<CefBrowser> browser, CefRefPtr<CefFrame> frame, CefRefPtr<CefRequest> request, bool userGesture, bool isRedirect);
		void OnLoadError(CefRefPtr<CefBrowser> browser, CefRefPtr<CefFrame> frame, CefLoadHandler::ErrorCode errorCode, const CefString& errorText, const CefString& failedUrl);
		void OnLoadEnd(CefRefPtr<CefBrowser> browser, CefRefPtr<CefFrame> frame, int httpStatusCode);
	};
}

