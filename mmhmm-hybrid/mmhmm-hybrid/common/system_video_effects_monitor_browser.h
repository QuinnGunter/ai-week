#pragma once

#include "system_video_effects_monitor.h"
#include "include/cef_process_message.h"
#include "common/hybrid_object.h"

namespace mmhmm {
  class SystemVideoEffectsMonitor: public HybridNativeObject {
  public:
    SystemVideoEffectsStatus GetStatus() const;
    void SetStatus(SystemVideoEffectsStatus status) { status_ = status; }

    void ReportStateUpdate() const override;

    bool HandleProcessMessage(CefRefPtr<CefBrowser> browser,
                              CefRefPtr<CefFrame> frame,
                              CefProcessId source_process,
                              CefRefPtr<CefProcessMessage> message) override;

    bool AddToDictionary(CefRefPtr<CefDictionaryValue> dictionary) const override;
  private:
    SystemVideoEffectsStatus status_ = SystemVideoEffectsStatus();

    CefRefPtr<CefProcessMessage> CreateStatusUpdateMessage() const;
    CefRefPtr<CefDictionaryValue> ToCefDictionary() const;

    // Provide the reference counting implementation for this class.
    IMPLEMENT_REFCOUNTING(SystemVideoEffectsMonitor);
  };
}
