#pragma once

#include <string>
#include <vector>
#include <variant>
#include <map>
#include <memory>
#include <any>

#include "include/internal/cef_ptr.h"
#include "include/cef_values.h"

namespace mmhmm {
#ifdef OS_WIN
  using PlatformString = std::wstring;
#else
  using PlatformString = std::string;
#endif

  struct NativeDictionary;
  struct NativeList;

  using NativeType = std::variant<
    std::nullptr_t,
    bool,
    int,
    double,
    PlatformString,
    std::vector<uint8_t>,
    std::unique_ptr<NativeDictionary>,
    std::unique_ptr<NativeList>
  >;

  struct NativeDictionary {
    std::map<PlatformString, NativeType> data;
  };

  struct NativeList {
    std::vector<NativeType> data;
  };

  NativeType ToNativeType(CefRefPtr<CefValue> cefValue);
}
