#include "v8_callback_executor.h"
#include "cef_value_utility.h"

namespace mmhmm {
  void RemoveJavaScriptCallbacksForFunctionIdentifier(std::string functionIdentifier, std::vector<JavaScriptCallback>& callbacks) {
    callbacks.erase(
                     std::remove_if(callbacks.begin(), callbacks.end(), [&functionIdentifier](auto callback) {
                       return callback.name == functionIdentifier;
                     }),
                     callbacks.end());
  }

  void RemoveJavaScriptCallbacksForContext(CefRefPtr<CefV8Context> context, std::vector<JavaScriptCallback>& callbacks) {
    callbacks.erase(
                     std::remove_if(callbacks.begin(), callbacks.end(), [&context](auto callback) {
                       return callback.context->IsSame(context);
                     }),
                     callbacks.end());
  }

  bool V8CallbackExecutor::SetCallbackFunction(const CefString& name,
                                               CefRefPtr<CefV8Value> object,
                                               const CefV8ValueList& arguments,
                                               CefRefPtr<CefV8Value>& retval,
                                               CefString& exception) {
    if (arguments.empty()) {
      exception = "Missing argument. Pass a value.";
      return true;
    }

    CefRefPtr<CefV8Value> callback = arguments[0];

    if (callback->IsFunction()) {
      JavaScriptCallback jsCallback { name, callback, CefV8Context::GetCurrentContext(), object, {} };
      callbacks_.emplace_back(jsCallback);
    } else if (callback->IsNull()) {
      RemoveJavaScriptCallbacksForFunctionIdentifier(name, callbacks_);
    } else {
      exception = "Invalid argument. Pass a function or null.";
    }

    return true;
  }

  std::vector<JavaScriptCallback> JavaScriptCallbacksForFunctionName(std::string name, std::vector<JavaScriptCallback>& callbacks) {
    std::vector<JavaScriptCallback> filteredCallbacks;
    std::copy_if (callbacks.begin(), callbacks.end(), std::back_inserter(filteredCallbacks), [&name](JavaScriptCallback callback) {
      return callback.name == name;
    });
    return filteredCallbacks;
  }

  void V8CallbackExecutor::ExecuteCallbacksWithArgumentsForFunctionName(std::string name, CefRefPtr<CefListValue> arguments) {
    if (auto registeredCallbacks = JavaScriptCallbacksForFunctionName(name, callbacks_); registeredCallbacks.empty() == false) {
      for (auto callback : registeredCallbacks) {
        callback.context->Enter();

        if (arguments) {
          size_t argumentsCount = arguments->GetSize();
          for (std::size_t index = 0; index < argumentsCount; ++index) {
            auto argument = arguments->GetValue(index);
            auto v8_value = ToCEFV8Value(argument);
            callback.arguments.push_back(v8_value);
          }
        }

        callback.context->Exit();
        callback.Execute();
      }
    }
  }
}
