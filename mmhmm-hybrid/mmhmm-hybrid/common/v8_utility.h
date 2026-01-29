#pragma once

#include "include/cef_v8.h"

namespace mmhmm {
  bool AddFunctionToObject(CefRefPtr<CefV8Value> object, const CefString& functionName, CefRefPtr<CefV8Handler> handler);
  void SendProcessMessageToCurrentV8ContextBrowser(CefRefPtr<CefProcessMessage> message);
  bool LogException(CefRefPtr<CefV8Value> function);

  /// Safely gets a boolean value from a V8 argument list with a fallback value.
  ///
  /// - Parameter arguments: The V8 argument list.
  /// - Parameter index: The index of the argument to retrieve.
  /// - Parameter fallback: The fallback value to return if the argument doesn't exist or is not a boolean.
  /// - Returns: The boolean value at the specified index, or the fallback value.
  bool GetBoolArgumentAtIndexOr(const CefV8ValueList& arguments, size_t index, bool fallback = false);
}
