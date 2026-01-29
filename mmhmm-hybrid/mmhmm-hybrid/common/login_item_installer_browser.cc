#include "login_item_installer_browser.h"

#if defined (OS_MAC)
#include "Airtime-Swift-Wrapper.h"
#endif

namespace mmhmm {
  CefRefPtr<CefProcessMessage> LoginItemInstaller::CreateStatusUpdateMessage() const {
    CefRefPtr<CefProcessMessage> message = CefProcessMessage::Create(LoginItemInstallerMessageNames::stateUpdate);
    auto args = message->GetArgumentList();
    args->SetDictionary(0, ToCefDictionary());
    return message;
  }

  LoginItemInstallerStatus LoginItemInstaller::GetStatus() const {
#if defined (OS_MAC)
    return Airtime::LoginItemInstallerBridge::getStatus();
#else
    return status_;
#endif
  }

  void LoginItemInstaller::Install() {
#if defined (OS_MAC)
    status_ = Airtime::LoginItemInstallerBridge::install();
    // Calling ReportStateUpdate() here would cause duplicate notifications.
#else
    DCHECK(false);
#endif
  }

  void LoginItemInstaller::Uninstall() {
#if defined (OS_MAC)
    status_ = Airtime::LoginItemInstallerBridge::uninstall();
    // Calling ReportStateUpdate() here would cause duplicate notifications.
#else
    DCHECK(false);
#endif
  }

  void LoginItemInstaller::ReportStateUpdate() const {
    auto message = CreateStatusUpdateMessage();
    SendProcessMessageToRendererProcess(message);
  }

  bool LoginItemInstaller::AddToDictionary(CefRefPtr<CefDictionaryValue> dictionary) const {
    return dictionary->SetDictionary(LoginItemInstallerKeys::dictionary, ToCefDictionary());
  }

  bool LoginItemInstaller::HandleProcessMessage(CefRefPtr<CefBrowser> browser,
                            CefRefPtr<CefFrame> frame,
                            CefProcessId source_process,
                            CefRefPtr<CefProcessMessage> message) {
    if (message->GetName() == LoginItemInstallerMessageNames::install) {
      Install();
      return true;
    } else if (message->GetName() == LoginItemInstallerMessageNames::uninstall) {
      Uninstall();
      return true;
    } else {
      return false;
    }
  }

  CefRefPtr<CefDictionaryValue> LoginItemInstaller::ToCefDictionary() const {
    CefRefPtr<CefDictionaryValue> dictionary = CefDictionaryValue::Create();
    dictionary->SetInt(LoginItemInstallerKeys::status, static_cast<int>(GetStatus()));
    return dictionary;
  }
}
