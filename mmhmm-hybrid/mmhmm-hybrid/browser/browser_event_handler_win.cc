//
//  browser_event_handler_win.cc
//  mmhmm-hybrid
//
//  Created by Martin Pilkington on 07/02/2024.
//

#include "browser_event_handler.h"

namespace mmhmm {
	void BrowserEventHandler::OnBeforeBrowse(CefRefPtr<CefBrowser> browser, CefRefPtr<CefFrame> frame, CefRefPtr<CefRequest> request, bool userGesture, bool isRedirect) {

	}

	void BrowserEventHandler::OnLoadEnd(CefRefPtr<CefBrowser> browser,
                                            CefRefPtr<CefFrame> frame,
                                            int httpStatusCode) {}

	void BrowserEventHandler::OnLoadError(CefRefPtr<CefBrowser> browser, CefRefPtr<CefFrame> frame, CefLoadHandler::ErrorCode errorCode, const CefString& errorText, const CefString& failedUrl) {

	}
}
