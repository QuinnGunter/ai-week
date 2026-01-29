#pragma once

#include "include/internal/cef_ptr.h"
#include "include/cef_values.h"

#include <optional>
#include <string>

namespace mmhmm {
  struct SystemVideoEffectsStatus {
    bool isPortraitEffectEnabled;
    bool isCenterStageEnabled;
    bool isStudioLightEnabled;
    bool isBackgroundReplacementEnabled;
    bool reactionEffectGesturesEnabled;
  };

  uint8_t ToUInt8(SystemVideoEffectsStatus status);
  std::optional<SystemVideoEffectsStatus> FromUInt8(uint8_t value);

  CefRefPtr<CefDictionaryValue> ToCefDictionary(SystemVideoEffectsStatus status);
  std::optional<SystemVideoEffectsStatus> SystemVideoEffectsStatusFromCefDictionary(CefRefPtr<CefDictionaryValue> dictionary);

  struct SystemVideoEffectsMonitorKeys {
    static const std::string dictionary;
    static const std::string status;
    static const std::string isPortraitEffectEnabled;
    static const std::string isCenterStageEnabled;
    static const std::string isStudioLightEnabled;
    static const std::string isBackgroundReplacementEnabled;
    static const std::string reactionEffectGesturesEnabled;
  };

  struct SystemVideoEffectsMonitorMessageNames {
    static const std::string stateUpdate;
    static const std::string showSystemUI;
  };
}
