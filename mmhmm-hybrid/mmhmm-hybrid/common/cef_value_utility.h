#pragma once

#include <string>
#include <vector>
#include <variant>
#include <map>
#include <memory>

#include "include/cef_v8.h"
#include "include/internal/cef_ptr.h"
#include "include/cef_values.h"
#include "native_types.h"

namespace mmhmm {
  template <typename T>
  CefRefPtr<CefListValue> ToCefListValue(std::vector<T> vector);

  template <typename T>
  std::vector<T> ToVector(CefRefPtr<CefListValue> list);

  CefRefPtr<CefV8Value> ToCEFV8Value(CefRefPtr<CefValue> cefValue);
  CefRefPtr<CefV8Value> ToCEFV8Array(CefRefPtr<CefListValue> list);
  CefRefPtr<CefV8Value> ToCEFV8Buffer(CefRefPtr<CefBinaryValue> binary);
  CefRefPtr<CefV8Value> ToCEFV8Object(CefRefPtr<CefDictionaryValue> dictionary);
  std::string CefValueToString(const CefRefPtr<CefValue>& value, int indent = 0);

  /// Creates a `CefValue` from a `CefV8Value`.
  ///
  /// - Important: This function converts any V8 number type
  ///   to a double. To force conversion to an int, call
  ///   `ToIntCefValue` instead.
  ///
  /// - Parameter v8Value: A `CefV8Value`.
  /// - Returns: A `CefValue` representing the contents of `v8Value` or `nullptr`, if invalid.
  CefRefPtr<CefValue> ToCefValue(CefRefPtr<CefV8Value> v8Value);
  
  /// Converts between the integer representations of a `CefV8Value` and a `CefValue`.
  ///
  /// - Parameter v8Value: A `CefV8Value`.
  /// - Returns: A `CefValue` representing the contents of `v8Value` or `nullptr`, if invalid.
  CefRefPtr<CefValue> ToIntCefValue(CefRefPtr<CefV8Value> v8Value);

  std::string CEFV8ValueToString(const CefRefPtr<CefV8Value>& value, int indent = 0);
}
