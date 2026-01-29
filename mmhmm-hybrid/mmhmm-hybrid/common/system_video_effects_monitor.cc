#include "system_video_effects_monitor.h"

namespace mmhmm {
  struct SystemVideoEffectsStatusBinary {
    uint8_t flags;

    static SystemVideoEffectsStatusBinary FromStatus(const SystemVideoEffectsStatus& status) {
      uint8_t flags = 0;
      flags |= status.isPortraitEffectEnabled ? 1 : 0;
      flags |= status.isCenterStageEnabled ? 1 << 1 : 0;
      flags |= status.isStudioLightEnabled ? 1 << 2 : 0;
      flags |= status.isBackgroundReplacementEnabled ? 1 << 3 : 0;
      flags |= status.reactionEffectGesturesEnabled ? 1 << 4 : 0;
      return {flags};
    }

    SystemVideoEffectsStatus ToStatus() const {
      SystemVideoEffectsStatus status;
      status.isPortraitEffectEnabled = (flags & 1) != 0;
      status.isCenterStageEnabled = (flags & (1 << 1)) != 0;
      status.isStudioLightEnabled = (flags & (1 << 2)) != 0;
      status.isBackgroundReplacementEnabled = (flags & (1 << 3)) != 0;
      status.reactionEffectGesturesEnabled = (flags & (1 << 4)) != 0;
      return status;
    }
  };
}

namespace mmhmm {
  uint8_t ToUInt8(SystemVideoEffectsStatus status) {
    return SystemVideoEffectsStatusBinary::FromStatus(status).flags;
  }

  std::optional<SystemVideoEffectsStatus> FromUInt8(uint8_t value) {
    return SystemVideoEffectsStatusBinary{value}.ToStatus();
  }

  CefRefPtr<CefDictionaryValue> ToCefDictionary(SystemVideoEffectsStatus status) {
    auto dictionary = CefDictionaryValue::Create();
    dictionary->SetBool(SystemVideoEffectsMonitorKeys::isPortraitEffectEnabled, status.isPortraitEffectEnabled);
    dictionary->SetBool(SystemVideoEffectsMonitorKeys::isCenterStageEnabled, status.isCenterStageEnabled);
    dictionary->SetBool(SystemVideoEffectsMonitorKeys::isStudioLightEnabled, status.isStudioLightEnabled);
    dictionary->SetBool(SystemVideoEffectsMonitorKeys::isBackgroundReplacementEnabled, status.isBackgroundReplacementEnabled);
    dictionary->SetBool(SystemVideoEffectsMonitorKeys::reactionEffectGesturesEnabled, status.reactionEffectGesturesEnabled);
    return dictionary;
  }

  std::optional<SystemVideoEffectsStatus> SystemVideoEffectsStatusFromCefDictionary(CefRefPtr<CefDictionaryValue> dictionary) {
    if (!dictionary ||
        !dictionary->HasKey(SystemVideoEffectsMonitorKeys::isPortraitEffectEnabled) ||
        !dictionary->HasKey(SystemVideoEffectsMonitorKeys::isCenterStageEnabled) ||
        !dictionary->HasKey(SystemVideoEffectsMonitorKeys::isStudioLightEnabled) ||
        !dictionary->HasKey(SystemVideoEffectsMonitorKeys::isBackgroundReplacementEnabled) ||
        !dictionary->HasKey(SystemVideoEffectsMonitorKeys::reactionEffectGesturesEnabled)) {
      return std::nullopt;
    }

    SystemVideoEffectsStatus status;
    status.isPortraitEffectEnabled = dictionary->GetBool(SystemVideoEffectsMonitorKeys::isPortraitEffectEnabled);
    status.isCenterStageEnabled = dictionary->GetBool(SystemVideoEffectsMonitorKeys::isCenterStageEnabled);
    status.isStudioLightEnabled = dictionary->GetBool(SystemVideoEffectsMonitorKeys::isStudioLightEnabled);
    status.isBackgroundReplacementEnabled = dictionary->GetBool(SystemVideoEffectsMonitorKeys::isBackgroundReplacementEnabled);
    status.reactionEffectGesturesEnabled = dictionary->GetBool(SystemVideoEffectsMonitorKeys::reactionEffectGesturesEnabled);
    return status;
  }
}

namespace mmhmm {
  const std::string SystemVideoEffectsMonitorKeys::dictionary = "SystemVideoEffects.Key.State";
  const std::string SystemVideoEffectsMonitorKeys::status = "SystemVideoEffects.Key.Status";
  const std::string SystemVideoEffectsMonitorKeys::isPortraitEffectEnabled = "isPortraitEffectEnabled";
  const std::string SystemVideoEffectsMonitorKeys::isCenterStageEnabled = "isCenterStageEnabled";
  const std::string SystemVideoEffectsMonitorKeys::isStudioLightEnabled = "isStudioLightEnabled";
  const std::string SystemVideoEffectsMonitorKeys::isBackgroundReplacementEnabled = "isBackgroundReplacementEnabled";
  const std::string SystemVideoEffectsMonitorKeys::reactionEffectGesturesEnabled = "reactionEffectGesturesEnabled";
  const std::string SystemVideoEffectsMonitorMessageNames::stateUpdate = "SystemVideoEffects.Message.StateUpdate";
  const std::string SystemVideoEffectsMonitorMessageNames::showSystemUI = "SystemVideoEffects.Message.ShowSystemUI";
}
