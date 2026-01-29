#include "features.h"

namespace mmhmm {
namespace feature {
extern const std::string WebMiniRemote = "web_mini_remote";
}

bool Features::IsFeatureSupported(std::string feature) {
  if (std::find(supported_features_.begin(), supported_features_.end(),
                feature) != supported_features_.end()) {
    return true;
  }
  return false;
}

Features Features::FromCefValueList(CefRefPtr<CefListValue> feature_list) {
  Features features;

  if (feature_list) {
    for (size_t i = 0; i < feature_list->GetSize(); i++) {
        features.supported_features_.push_back(feature_list->GetString(i));
    }
  }
  return features;
}
}  // namespace mmhmm
