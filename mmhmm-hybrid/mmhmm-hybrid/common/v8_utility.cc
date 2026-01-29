//
//  v8_utility.cc
//  mmhmm
//
//  Created by Beni Federer on 15.11.24.
//

#include "v8_utility.h"

namespace mmhmm {
  bool AddFunctionToObject(CefRefPtr<CefV8Value> object, const CefString& functionName, CefRefPtr<CefV8Handler> handler) {
    if (CefRefPtr<CefV8Value> function = CefV8Value::CreateFunction(functionName, handler); function != nullptr) {
      return object->SetValue(functionName, function, V8_PROPERTY_ATTRIBUTE_NONE);
    }
    return false;
  }

  void SendProcessMessageToCurrentV8ContextBrowser(CefRefPtr<CefProcessMessage> message) {
    auto context = CefV8Context::GetCurrentContext();
    if (context == nullptr) { return; }

    auto browser = context->GetBrowser();
    if (browser == nullptr) { return; }

    auto frame = browser->GetMainFrame();
    if (frame == nullptr) { return; }

    frame->SendProcessMessage(PID_BROWSER, message);
  }

  bool LogException(CefRefPtr<CefV8Value> function) {
    if (!function->IsFunction() || !function->HasException()) { return false; }

    CefRefPtr<CefV8Exception> exception = function->GetException();
    if (!exception) { return false; }

    std::string errorMessage = exception->GetMessage().ToString();
    std::string sourceLine = exception->GetSourceLine().ToString();
    std::string scriptResource = exception->GetScriptResourceName().ToString();
    int lineNumber = exception->GetLineNumber();
    int startColumn = exception->GetStartColumn();
    int endColumn = exception->GetEndColumn();

    LOG(ERROR) << "Exception: " << errorMessage
    << "\n  Script: " << scriptResource
    << "\n  Line " << lineNumber << ": " << sourceLine
    << "\n  Column: " << startColumn << "-" << endColumn;

    function->ClearException();

    return true;
  }

  bool GetBoolArgumentAtIndexOr(const CefV8ValueList& arguments, size_t index, bool fallback) {
    if (index >= arguments.size()) {
      return fallback;
    }
    
    CefRefPtr<CefV8Value> arg = arguments[index];
    if (!arg.get() || !arg->IsBool()) {
      return fallback;
    }
    
    return arg->GetBoolValue();
  }
}
