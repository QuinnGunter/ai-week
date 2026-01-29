#pragma once

#include "renderer/javascript_callback.h"

namespace mmhmm {
  class V8CallbackExecutor {
  public:
    /// Registers a JavaScript function as a callback in the current context.
    ///
    /// - Parameters:
    ///   - name: The name of the callback.
    ///   - object: The receiver of the function. If `nullptr`, the current context's global object.
    ///   - arguments: First argument is expected to be a JS function to add as a callback
    ///                or `null`, which removes the callback.
    ///   - retval: Return value of the callback set operation. Currently left untouched.
    ///   - exception: An exception describing a failure. Logged to the JS console.
    bool SetCallbackFunction(const CefString& name,
                             CefRefPtr<CefV8Value> object,
                             const CefV8ValueList& arguments,
                             CefRefPtr<CefV8Value>& retval,
                             CefString& exception);

    /// Executes all registered callbacks with the specified arguments.
    ///
    /// - Parameters:
    ///   - name: The name of the callback to execute.
    ///   - arguments: The arguments to pass to the callback. May be empty or `nullptr`.
    void ExecuteCallbacksWithArgumentsForFunctionName(std::string name, CefRefPtr<CefListValue> arguments);
  private:
    /// JavaScript callbacks registered by V8 clients.
    std::vector<JavaScriptCallback> callbacks_;
  };
}
