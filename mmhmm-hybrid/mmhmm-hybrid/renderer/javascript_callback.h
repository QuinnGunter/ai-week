#pragma once

#include "include/cef_v8.h"

namespace mmhmm {
  /// Describes a JavaScript function, callable in a V8 context.
  struct JavaScriptCallback {
    /// The function name as V8 clients see and call it.
    std::string name;

    /// The V8 function object.
    CefRefPtr<CefV8Value> function;

    /// The V8 context `function` was created in.
    CefRefPtr<CefV8Context> context;

    /// The V8 object to call the function on.
    CefRefPtr<CefV8Value> object;

    /// The arguments to execute the function with.
    CefV8ValueList arguments;

    /// Executes the function.
    CefRefPtr<CefV8Value> Execute();
  };
}
