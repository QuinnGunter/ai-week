#pragma once

#include "window_overlay.h"
#include "include/cef_process_message.h"
#include "common/hybrid_object.h"

namespace mmhmm {
  /// Draws a window overlay.
  class WindowOverlay: public HybridNativeObject {
  public:
    void ReportStateUpdate() const override;

    bool HandleProcessMessage(CefRefPtr<CefBrowser> browser,
                              CefRefPtr<CefFrame> frame,
                              CefProcessId source_process,
                              CefRefPtr<CefProcessMessage> message) override;

    bool AddToDictionary(CefRefPtr<CefDictionaryValue> dictionary) const override;
  private:
    CefRefPtr<CefProcessMessage> CreateStatusUpdateMessage() const;
    CefRefPtr<CefDictionaryValue> ToCefDictionary() const;

    void DrawCursors(CefRefPtr<CefProcessMessage> message) const;
    void SetDebugIsEnabled(CefRefPtr<CefProcessMessage> message) const;

    // Provide the reference counting implementation for this class.
    IMPLEMENT_REFCOUNTING(WindowOverlay);
  };
}
