#pragma once

#include "login_item_installer.h"
#include "include/cef_process_message.h"
#include "common/hybrid_object.h"

namespace mmhmm {
  class LoginItemInstaller: public HybridNativeObject {
  public:
    LoginItemInstallerStatus GetStatus() const;
    void Install();
    void Uninstall();

    void ReportStateUpdate() const override;

    bool HandleProcessMessage(CefRefPtr<CefBrowser> browser,
                              CefRefPtr<CefFrame> frame,
                              CefProcessId source_process,
                              CefRefPtr<CefProcessMessage> message) override;

    bool AddToDictionary(CefRefPtr<CefDictionaryValue> dictionary) const override;
  private:
    LoginItemInstallerStatus status_ = LoginItemInstallerStatus::NotInstalled;

    CefRefPtr<CefProcessMessage> CreateStatusUpdateMessage() const;
    CefRefPtr<CefDictionaryValue> ToCefDictionary() const;

    // Provide the reference counting implementation for this class.
    IMPLEMENT_REFCOUNTING(LoginItemInstaller);
  };
}
