#pragma once
#include <string>
#include <vector>
#include "include/cef_values.h"

namespace mmhmm {
namespace feature {
extern const std::string WebMiniRemote;
}

class Features {

 public:
  Features() = default;
  ~Features() = default;

  bool IsFeatureSupported(std::string feature);
  static Features FromCefValueList(CefRefPtr<CefListValue> feature_list);

 private:
  std::vector<std::string> supported_features_;
};
}  // namespace mmhmm

