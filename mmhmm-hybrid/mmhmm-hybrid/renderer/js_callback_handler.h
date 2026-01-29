//
//  js_callback_handler.h
//  mmhmm-hybrid
//
//  Created by Martin Pilkington on 15/06/2023.
//

#pragma once

#include "include/cef_v8.h"

namespace mmhmm
{
	class JSCallbackHandler: public CefV8Handler {
	public:
		JSCallbackHandler(){}

		virtual bool Execute(const CefString &name,
							 CefRefPtr<CefV8Value> object,
							 const CefV8ValueList &arguments,
							 CefRefPtr<CefV8Value> &retval,
							 CefString &exception) override;
	private:
		IMPLEMENT_REFCOUNTING(JSCallbackHandler);
	};
}
