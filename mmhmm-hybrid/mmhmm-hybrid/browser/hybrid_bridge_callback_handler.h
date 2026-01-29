//
//  hybrid_bridge_callback_handler.h
//  mmhmm-hybrid
//
//  Created by Martin Pilkington on 15/06/2023.
//

#pragma once

#include "include/cef_v8.h"

namespace mmhmm {
	namespace HybridBridgeCallbackHandler {
		void OnBridgeInitialized(CefRefPtr<CefBrowser> browser, CefString& build, CefString& theme, CefString& releaseTrack);
		void OnNativeCallbackRequest(CefRefPtr<CefBrowser> browser, CefString& context, CefString& jsonValues);
		void OnPropertyChange(CefRefPtr<CefBrowser> browser, CefString& key, CefRefPtr<CefValue> value);
		void OnShowMiniRemote(CefRefPtr<CefBrowser> browser);
		void OnHideMiniRemote(CefRefPtr<CefBrowser> browser);
		void OnEnterBroadcastMode(CefRefPtr<CefBrowser> browser);
		void OnExitBroadcastMode(CefRefPtr<CefBrowser> browser);
		void OnStageRenderingStarted(CefRefPtr<CefBrowser> browser);
		void OnStageRenderingStopped(CefRefPtr<CefBrowser> browser);

		#if defined(OS_WIN)
		void SetPropertyCallback(void* obj);
		#endif
	};
}

