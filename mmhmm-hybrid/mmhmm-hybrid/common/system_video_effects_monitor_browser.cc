#include "system_video_effects_monitor_browser.h"

#if defined (OS_MAC)
#include "Airtime-Swift-Wrapper.h"
#endif

namespace mmhmm {
  CefRefPtr<CefProcessMessage> SystemVideoEffectsMonitor::CreateStatusUpdateMessage() const {
    CefRefPtr<CefProcessMessage> message = CefProcessMessage::Create(SystemVideoEffectsMonitorMessageNames::stateUpdate);
    auto args = message->GetArgumentList();
    args->SetDictionary(0, ToCefDictionary());
    return message;
  }

  SystemVideoEffectsStatus SystemVideoEffectsMonitor::GetStatus() const {
#if defined (OS_MAC)
    return {
      .isPortraitEffectEnabled = Airtime::SystemVideoEffectsMonitorBridge::isPortraitEffectEnabled(),
      .isCenterStageEnabled = Airtime::SystemVideoEffectsMonitorBridge::isCenterStageEnabled(),
      .isStudioLightEnabled = Airtime::SystemVideoEffectsMonitorBridge::isStudioLightEnabled(),
      .isBackgroundReplacementEnabled = Airtime::SystemVideoEffectsMonitorBridge::isBackgroundReplacementEnabled(),
      .reactionEffectGesturesEnabled = Airtime::SystemVideoEffectsMonitorBridge::getReactionEffectGesturesEnabled(),
    };
#else
    return status_;
#endif
  }

  void SystemVideoEffectsMonitor::ReportStateUpdate() const {
    auto message = CreateStatusUpdateMessage();
    SendProcessMessageToRendererProcess(message);
  }

  bool SystemVideoEffectsMonitor::AddToDictionary(CefRefPtr<CefDictionaryValue> dictionary) const {
    return dictionary->SetDictionary(SystemVideoEffectsMonitorKeys::dictionary, ToCefDictionary());
  }

  bool SystemVideoEffectsMonitor::HandleProcessMessage(CefRefPtr<CefBrowser> browser,
                            CefRefPtr<CefFrame> frame,
                            CefProcessId source_process,
                            CefRefPtr<CefProcessMessage> message) {
    if (message->GetName() == SystemVideoEffectsMonitorMessageNames::showSystemUI) {
#if defined (OS_MAC)
      Airtime::SystemVideoEffectsMonitorBridge::showSystemUI();
#else
      DCHECK(false);
#endif
      return true;
    }

    return false;
  }

  CefRefPtr<CefDictionaryValue> SystemVideoEffectsMonitor::ToCefDictionary() const {
    auto dictionary = CefDictionaryValue::Create();
    dictionary->SetDictionary(SystemVideoEffectsMonitorKeys::status, mmhmm::ToCefDictionary(GetStatus()));
    return dictionary;
  }
}
