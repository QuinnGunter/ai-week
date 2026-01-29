//
//  javascript_callback.cc
//  mmhmm
//
//  Created by Beni Federer on 13.11.24.
//

#include "javascript_callback.h"
#include "common/v8_utility.h"

namespace mmhmm {
  CefRefPtr<CefV8Value> JavaScriptCallback::Execute() {
    context->Enter();
    auto result = function->ExecuteFunctionWithContext(context, object, arguments);
    if (!result) {
      LogException(function);
    }
    context->Exit();
    return result;
  }
}
