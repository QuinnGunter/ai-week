//
//  HybridBridge.cc
//  mmhmm
//
//  Created by Beni Federer on 25.07.24.
//

#include "hybrid_bridge_callback_handler.h"
#include "Airtime-Swift-Wrapper.h"

namespace mmhmm::HybridBridgeCallbackHandler {
	void OnBridgeInitialized(CefRefPtr<CefBrowser> browser, CefString &build, CefString &theme, CefString& releaseTrack) {
		auto info = Airtime::SwiftBridgeHybridBridgeInitializedInfo::init(build, theme, releaseTrack, browser->GetIdentifier());
		Airtime::SwiftBridge::onBridgeInitialized(info);
	}

	void OnNativeCallbackRequest(CefRefPtr<CefBrowser> browser, CefString& context, CefString& jsonValues) {
		Airtime::SwiftBridge::onNativeCallbackRequest(context.ToString(), jsonValues.ToString(), browser->GetIdentifier());
	}

	void OnPropertyChange(CefRefPtr<CefBrowser> browser, CefString& key, CefRefPtr<CefValue> value) {
		const std::string keyString = key.ToString();
		const int browserID = browser->GetIdentifier();

		switch (value->GetType()) {
			case VTYPE_NULL:
				Airtime::SwiftBridge::onPropertyChangeWithNilValue(keyString, browserID);
				break;
			case VTYPE_BOOL:
				Airtime::SwiftBridge::onPropertyChange(keyString, value->GetBool(), browserID);
				break;
			case VTYPE_INT:
				Airtime::SwiftBridge::onPropertyChange(keyString, value->GetInt(), browserID);
				break;
			case VTYPE_DOUBLE:
				Airtime::SwiftBridge::onPropertyChange(keyString, value->GetDouble(), browserID);
				break;
			case VTYPE_STRING:
				Airtime::SwiftBridge::onPropertyChange(keyString, value->GetString().ToString(), browserID);
				break;
			case VTYPE_INVALID:
				Airtime::SwiftBridge::onPropertyChangeWithError(keyString, "Invalid data type", browserID);
				break;
			case VTYPE_BINARY:
			case VTYPE_DICTIONARY:
			case VTYPE_LIST:
			case VTYPE_NUM_VALUES:
				Airtime::SwiftBridge::onPropertyChangeWithError(keyString, "Unhandled data type", browserID);
				break;
		}
	}

	void OnShowMiniRemote(CefRefPtr<CefBrowser> browser) {
		Airtime::SwiftBridge::onShowMiniRemote(browser->GetIdentifier());
	}

	void OnHideMiniRemote(CefRefPtr<CefBrowser> browser) {
		Airtime::SwiftBridge::onHideMiniRemote(browser->GetIdentifier());
	}

	void OnEnterBroadcastMode(CefRefPtr<CefBrowser> browser) {
		Airtime::SwiftBridge::onEnterBroadcastMode(browser->GetIdentifier());
	}

	void OnExitBroadcastMode(CefRefPtr<CefBrowser> browser) {
		Airtime::SwiftBridge::onExitBroadcastMode(browser->GetIdentifier());
	}

	void OnStageRenderingStarted(CefRefPtr<CefBrowser> browser) {
		Airtime::SwiftBridge::onStageRenderingStarted(browser->GetIdentifier());
	}

	void OnStageRenderingStopped(CefRefPtr<CefBrowser> browser) {
		Airtime::SwiftBridge::onStageRenderingStopped(browser->GetIdentifier());
	}
}
