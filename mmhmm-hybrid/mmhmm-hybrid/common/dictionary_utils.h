#pragma once

#include "include/internal/cef_ptr.h"
#include "include/cef_values.h"
#include "std_typedefs.h"

namespace mmhmm {
  /// Converts a CefValue containing a dictionary into a StdDictionary.
  ///
  /// - Parameters:
  ///   - cefValue: The CefValue containing the dictionary to convert.
  StdDictionary ToStdDictionary(CefRefPtr<CefValue> cefValue);

  /// Converts a CefValue containing a dictionary into a JSON string.
  ///
  /// - Parameters:
  ///   - cefValue: The CefValue containing the dictionary to convert.
  std::string ToJsonDictionary(CefRefPtr<CefValue> cefValue);

  /// Converts a JSON string into a CefDictionaryValue.
  ///
  /// - Parameters:
  ///  - jsonString: The JSON string to convert.
  CefRefPtr<CefDictionaryValue> ToCefDictionaryValue(std::string jsonString);
}
