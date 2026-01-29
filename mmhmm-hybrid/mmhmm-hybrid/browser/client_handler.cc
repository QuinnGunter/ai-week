//
// mmhmm
// Copyright � 2020-2022 mmhmm, inc. All rights reserved.
//
#include "client_handler.h"

#include <stdio.h>
#include <algorithm>
#include <iomanip>
#include <sstream>
#include <string>

#include "../mini-remote/shared_mini_remote_manager.h"

#include "include/base/cef_callback.h"
#include "include/cef_browser.h"
#include "include/cef_command_ids.h"
#include "include/cef_frame.h"
#include "include/cef_parser.h"
#include "include/cef_ssl_status.h"
#include "include/cef_x509_certificate.h"
#include "include/wrapper/cef_closure_task.h"
#include "main_context.h"
#include "root_window_manager.h"
#include "resource_util.h"
#include "../common/client_switches.h"
#include "../browser/client_prefs.h"

#include "../browser/screen_share_manager.h"
#include "../browser/hybrid_bridge_callback_handler.h"
#include "../browser/browser_event_handler.h"
#include "../common/urls.h"
#include "../common/titlebar_button.h"
#include "../features.h"
#include "../messages/toolbox/ChangeAppMode.h"
#include "../messages/floating-nav/LaunchFloatingNav.h"

#if defined (OS_WIN)
#include <windows.h>
#include <shellapi.h>
#include "../win/url_constants_win.h"
#include "resource.h"
#include "../win/app_settings_service.h"
#include "../win/app_track.h"
#endif

#if defined (OS_MACOSX)
#include <CoreFoundation/CFBundle.h>
#include <ApplicationServices/ApplicationServices.h>
#include "LoggerTrampoline.h"
#include "Airtime-Swift-Wrapper.h"
#endif
#include "web_app_browser.h"

using namespace mmhmm;
using namespace Messages;

namespace client {

#if defined(OS_WIN)
#define NEWLINE "\r\n"
#else
#define NEWLINE "\n"
#endif

namespace {

// Custom menu command Ids.
enum client_menu_ids {
  CLIENT_ID_SHOW_DEVTOOLS = MENU_ID_USER_FIRST,
  CLIENT_ID_CLOSE_DEVTOOLS,
  CLIENT_ID_INSPECT_ELEMENT,
  CLIENT_ID_SHOW_SSL_INFO,
  CLIENT_ID_CURSOR_CHANGE_DISABLED,
  CLIENT_ID_MEDIA_HANDLING_DISABLED,
  CLIENT_ID_OFFLINE,
  CLIENT_ID_TESTMENU_SUBMENU,
  CLIENT_ID_TESTMENU_CHECKITEM,
  CLIENT_ID_TESTMENU_RADIOITEM1,
  CLIENT_ID_TESTMENU_RADIOITEM2,
  CLIENT_ID_TESTMENU_RADIOITEM3,
};

// Must match the value in client_renderer.cc.
const char kFocusedNodeChangedMessage[] = "ClientRenderer.FocusedNodeChanged";

std::string GetTimeString(const CefTime& value) {
  if (value.GetTimeT() == 0)
    return "Unspecified";

  static const char* kMonths[] = {
      "January", "February", "March",     "April",   "May",      "June",
      "July",    "August",   "September", "October", "November", "December"};
  std::string month;
  if (value.month >= 1 && value.month <= 12)
    month = kMonths[value.month - 1];
  else
    month = "Invalid";

  std::stringstream ss;
  ss << month << " " << value.day_of_month << ", " << value.year << " "
     << std::setfill('0') << std::setw(2) << value.hour << ":"
     << std::setfill('0') << std::setw(2) << value.minute << ":"
     << std::setfill('0') << std::setw(2) << value.second;
  return ss.str();
}

std::string GetTimeString(const CefBaseTime& value) {
  CefTime time;
  if (cef_time_from_basetime(value, &time)) {
    return GetTimeString(time);
  }
  else {
    return "Invalid";
  }
}

std::string GetBinaryString(CefRefPtr<CefBinaryValue> value) {
  if (!value.get())
    return "&nbsp;";

  // Retrieve the value.
  const size_t size = value->GetSize();
  std::string src;
  src.resize(size);
  value->GetData(const_cast<char*>(src.data()), size, 0);

  // Encode the value.
  return CefBase64Encode(src.data(), src.size());
}

#define FLAG(flag)                          \
  if (status & flag) {                      \
    result += std::string(#flag) + "<br/>"; \
  }

#define VALUE(val, def)       \
  if (val == def) {           \
    return std::string(#def); \
  }

std::string GetCertStatusString(cef_cert_status_t status) {
  std::string result;

  FLAG(CERT_STATUS_COMMON_NAME_INVALID);
  FLAG(CERT_STATUS_DATE_INVALID);
  FLAG(CERT_STATUS_AUTHORITY_INVALID);
  FLAG(CERT_STATUS_NO_REVOCATION_MECHANISM);
  FLAG(CERT_STATUS_UNABLE_TO_CHECK_REVOCATION);
  FLAG(CERT_STATUS_REVOKED);
  FLAG(CERT_STATUS_INVALID);
  FLAG(CERT_STATUS_WEAK_SIGNATURE_ALGORITHM);
  FLAG(CERT_STATUS_NON_UNIQUE_NAME);
  FLAG(CERT_STATUS_WEAK_KEY);
  FLAG(CERT_STATUS_PINNED_KEY_MISSING);
  FLAG(CERT_STATUS_NAME_CONSTRAINT_VIOLATION);
  FLAG(CERT_STATUS_VALIDITY_TOO_LONG);
  FLAG(CERT_STATUS_IS_EV);
  FLAG(CERT_STATUS_REV_CHECKING_ENABLED);
  FLAG(CERT_STATUS_SHA1_SIGNATURE_PRESENT);
  FLAG(CERT_STATUS_CT_COMPLIANCE_FAILED);

  if (result.empty())
    return "&nbsp;";
  return result;
}

std::string GetSSLVersionString(cef_ssl_version_t version) {
  VALUE(version, SSL_CONNECTION_VERSION_UNKNOWN);
  VALUE(version, SSL_CONNECTION_VERSION_SSL2);
  VALUE(version, SSL_CONNECTION_VERSION_SSL3);
  VALUE(version, SSL_CONNECTION_VERSION_TLS1);
  VALUE(version, SSL_CONNECTION_VERSION_TLS1_1);
  VALUE(version, SSL_CONNECTION_VERSION_TLS1_2);
  VALUE(version, SSL_CONNECTION_VERSION_TLS1_3);
  VALUE(version, SSL_CONNECTION_VERSION_QUIC);
  return std::string();
}

std::string GetContentStatusString(cef_ssl_content_status_t status) {
  std::string result;

  VALUE(status, SSL_CONTENT_NORMAL_CONTENT);
  FLAG(SSL_CONTENT_DISPLAYED_INSECURE_CONTENT);
  FLAG(SSL_CONTENT_RAN_INSECURE_CONTENT);

  if (result.empty())
    return "&nbsp;";
  return result;
}

// Load a data: URI containing the error message.
void LoadErrorPage(CefRefPtr<CefFrame> frame,
                   const std::string& failed_url,
                   cef_errorcode_t error_code,
                   const std::string& other_info) {
  auto offlineUrl = mmhmm::urls::OfflineUrl + failed_url;

#if defined (OS_WIN)
  auto theme = MainContext::Get()->GetApplicationContext()->GetThemeString();
  offlineUrl.append("&theme=" + client::ToNarrowString(theme));
#endif

  frame->LoadURL(offlineUrl);
}

// Return HTML string with information about a certificate.
std::string GetCertificateInformation(CefRefPtr<CefX509Certificate> cert,
                                      cef_cert_status_t certstatus) {
  CefRefPtr<CefX509CertPrincipal> subject = cert->GetSubject();
  CefRefPtr<CefX509CertPrincipal> issuer = cert->GetIssuer();

  // Build a table showing certificate information. Various types of invalid
  // certificates can be tested using https://badssl.com/.
  std::stringstream ss;
  ss << "<h3>X.509 Certificate Information:</h3>"
        "<table border=1><tr><th>Field</th><th>Value</th></tr>";

  if (certstatus != CERT_STATUS_NONE) {
    ss << "<tr><td>Status</td><td>" << GetCertStatusString(certstatus)
       << "</td></tr>";
  }

  ss << "<tr><td>Subject</td><td>"
     << (subject.get() ? subject->GetDisplayName().ToString() : "&nbsp;")
     << "</td></tr>"
        "<tr><td>Issuer</td><td>"
     << (issuer.get() ? issuer->GetDisplayName().ToString() : "&nbsp;")
     << "</td></tr>"
        "<tr><td>Serial #*</td><td>"
     << GetBinaryString(cert->GetSerialNumber()) << "</td></tr>"
     << "<tr><td>Valid Start</td><td>" << GetTimeString(cert->GetValidStart())
     << "</td></tr>"
        "<tr><td>Valid Expiry</td><td>"
     << GetTimeString(cert->GetValidExpiry()) << "</td></tr>";

  CefX509Certificate::IssuerChainBinaryList der_chain_list;
  CefX509Certificate::IssuerChainBinaryList pem_chain_list;
  cert->GetDEREncodedIssuerChain(der_chain_list);
  cert->GetPEMEncodedIssuerChain(pem_chain_list);
  DCHECK_EQ(der_chain_list.size(), pem_chain_list.size());

  der_chain_list.insert(der_chain_list.begin(), cert->GetDEREncoded());
  pem_chain_list.insert(pem_chain_list.begin(), cert->GetPEMEncoded());

  for (size_t i = 0U; i < der_chain_list.size(); ++i) {
    ss << "<tr><td>DER Encoded*</td>"
          "<td style=\"max-width:800px;overflow:scroll;\">"
       << GetBinaryString(der_chain_list[i])
       << "</td></tr>"
          "<tr><td>PEM Encoded*</td>"
          "<td style=\"max-width:800px;overflow:scroll;\">"
       << GetBinaryString(pem_chain_list[i]) << "</td></tr>";
  }

  ss << "</table> * Displayed value is base64 encoded.";
  return ss.str();
}

}  // namespace

class ClientDownloadImageCallback : public CefDownloadImageCallback {
 public:
  explicit ClientDownloadImageCallback(CefRefPtr<ClientHandler> client_handler)
      : client_handler_(client_handler) {}

  void OnDownloadImageFinished(const CefString& image_url,
                               int http_status_code,
                               CefRefPtr<CefImage> image) override {
    if (image)
      client_handler_->NotifyFavicon(image);
  }

 private:
  CefRefPtr<ClientHandler> client_handler_;

  IMPLEMENT_REFCOUNTING(ClientDownloadImageCallback);
  DISALLOW_COPY_AND_ASSIGN(ClientDownloadImageCallback);
};

ClientHandler::ClientHandler(Delegate* delegate,
                             bool with_controls,
                             const std::string& startup_url)
    : with_controls_(with_controls),
      startup_url_(startup_url),
      delegate_(delegate),
      console_log_file_(MainContext::Get()->GetConsoleLogPath()) {
  DCHECK(!console_log_file_.empty());

  resource_manager_ = new CefResourceManager();
  
  // Read command line settings.
  CefRefPtr<CefCommandLine> command_line =
      CefCommandLine::GetGlobalCommandLine();
  mouse_cursor_change_disabled_ =
      command_line->HasSwitch(switches::kMouseCursorChangeDisabled);
  offline_ = command_line->HasSwitch(switches::kOffline);
}

void ClientHandler::DetachDelegate() {
  if (!CURRENTLY_ON_MAIN_THREAD()) {
    // Execute this method on the main thread.
    MAIN_POST_CLOSURE(base::BindOnce(&ClientHandler::DetachDelegate, this));
    return;
  }

  DCHECK(delegate_);
  delegate_ = nullptr;
}

// static
CefRefPtr<ClientHandler> ClientHandler::GetForClient(
  CefRefPtr<CefClient> client) {
  return static_cast<ClientHandler*>(client.get());
}

bool ClientHandler::OnProcessMessageReceived(
    CefRefPtr<CefBrowser> browser,
    CefRefPtr<CefFrame> frame,
    CefProcessId source_process,
    CefRefPtr<CefProcessMessage> message) {
  CEF_REQUIRE_UI_THREAD();

  if (message_router_->OnProcessMessageReceived(browser, frame, source_process,
                                                message)) {
    return true;
  }

  // Check for messages from the client renderer.
  std::string message_name = message->GetName();
  if (message_name == kFocusedNodeChangedMessage) {
    // A message is sent from ClientRenderDelegate to tell us whether the
    // currently focused DOM node is editable. Use of |focus_on_editable_field_|
    // is redundant with CefKeyEvent.focus_on_editable_field in OnPreKeyEvent
    // but is useful for demonstration purposes.
    focus_on_editable_field_ = message->GetArgumentList()->GetBool(0);
    return true;
  }
  else if (message_name == "getAppCapabilities") {
    auto caps = MainContext::Get()->GetAppCapabilities().ToCefDictionary();
    
    auto msg = CefProcessMessage::Create("reportAppCapabilities");
    auto args = msg->GetArgumentList();
    args->SetDictionary(0, caps);

    browser->GetMainFrame()->SendProcessMessage(PID_RENDERER, msg);
    
  }
  else if (message_name == "getScreenshareMedia")
  {
    auto id = message->GetArgumentList()->GetInt(0);
    auto includeScreens = message->GetArgumentList()->GetBool(1);
    auto includeWindows = message->GetArgumentList()->GetBool(2);
#if defined (OS_MAC)
    auto activateSelectedTarget = message->GetArgumentList()->GetBool(3);
    auto presentPickerV2 = message->GetArgumentList()->GetBool(4);
#endif

#if defined (OS_WIN)
    //Launch a new browser instance to host the screenshare web page
    CefRefPtr<CefProcessMessage> msg = CefProcessMessage::Create("launch_url");
    CefRefPtr<CefListValue> args = msg->GetArgumentList();
    auto theme = MainContext::Get()->GetApplicationContext()->GetThemeString();
    std::string filter;
    if (includeScreens != includeWindows) {
      filter = "&filter=" + std::string(includeScreens ? "screens" : "windows");
    }

    args->SetString(0,mmhmm::urls::ScreenshareUrl + std::to_string(id)+"&theme=" + client::ToNarrowString(theme) + filter);
    args->SetString(1, "width=659,height=629");

    browser->GetMainFrame()->SendProcessMessage(PID_RENDERER, msg);
#elif defined (OS_MAC)
    Airtime::SwiftBridge::onGetScreenshareMediaRequest(includeScreens, includeWindows, id, browser->GetIdentifier(), activateSelectedTarget, presentPickerV2);
#endif
  }
  else if (message_name == "enumerateScreenshareMedia")
  {
#if defined (OS_WIN)
    auto id = message->GetArgumentList()->GetInt(0);
    auto includeScreens = message->GetArgumentList()->GetBool(1);
    auto includeWindows = message->GetArgumentList()->GetBool(2);

    mmhmm::ScreenShareManager::OnEnumerateScreenshareMediaRequest(browser, includeScreens, includeWindows, id);
#endif
  }
  else if (message_name == "screenshareMediaSelected")
  {
    auto destination_window =
        MainContext::Get()->GetRootWindowManager()->GetParentWindowForBrowser(
            browser->GetIdentifier());

    if (!destination_window)
      return false;

    auto destination_browser = destination_window->GetBrowser();

    CefRefPtr<CefProcessMessage> msg = CefProcessMessage::Create("getScreenshareMedia_success");
    CefRefPtr<CefListValue> args = msg->GetArgumentList();

    auto oldArgs = message->GetArgumentList();

    auto messageId = oldArgs->GetInt(0);
    auto id = oldArgs->GetString(1);
    auto title = oldArgs->GetString(2);
    auto processName = oldArgs->GetString(3);
    args->SetBool(0, true);
    args->SetInt(1, messageId);
    args->SetString(2, "desktop");
    args->SetString(3, id);
    args->SetString(4, title);
    args->SetString(5, processName);

    #if defined(OS_WIN)
    if (destination_window->GetWebAppType() != WebAppType::creator) {
      mmhmm::ScreenShareManager::FocusWindow(id);
    }
    #endif

    destination_browser->GetMainFrame()->SendProcessMessage(PID_RENDERER, msg);
  } else if (message_name == "nativeCallback") {
	  auto context = message->GetArgumentList()->GetString(0);
	  auto json = message->GetArgumentList()->GetString(1);
	  mmhmm::HybridBridgeCallbackHandler::OnNativeCallbackRequest(browser, context, json);

      auto mini_remote_manager = MainContext::Get()->GetMiniRemoteManager();
      if (!mini_remote_manager)
          return false;

      mini_remote_manager->OnNativeCallbackRequest(context, json);

      // TODO: Consolidate mini-remote and streamdeck callbacks
      auto async_javascript_processor =
          MainContext::Get()->GetAsyncJavascriptProcessor();
      if (!async_javascript_processor) {
        return false;
      }

      async_javascript_processor->ReturnTask(context, json);

  } else if (message_name == "propertyChanged") {
    auto key = message->GetArgumentList()->GetString(0);
    auto value = message->GetArgumentList()->GetValue(1);
    mmhmm::HybridBridgeCallbackHandler::OnPropertyChange(browser, key, value);

    auto mini_remote_manager = MainContext::Get()->GetMiniRemoteManager();
    if (!mini_remote_manager)
      return false;

    mini_remote_manager->OnPropertyChange(key, value);

    if (key == "theme" && value->GetType() == CefValueType::VTYPE_STRING) {
      MainContext::Get()->SetTheme(value->GetString());
    }

#if defined (OS_WIN)
    //TODO : Consolidate mini remote and stream deck 
    MainContext::Get()->GetApplicationContext()->AppPropertyChanged(key, value);
#endif 
    return true;

  } else if (message_name == "bridgeInitialized") {
    auto build = message->GetArgumentList()->GetString(0);
    MainContext::Get()->SetWebAppVersion(build);

    auto theme = message->GetArgumentList()->GetString(1);
    MainContext::Get()->SetTheme(theme);

    CefString release_track;
    if (message->GetArgumentList()->GetSize() >= 3) {
      release_track = message->GetArgumentList()->GetString(2);
      MainContext::Get()->SetWebAppTrack(release_track);
    }

    if (message->GetArgumentList()->GetSize() >= 4) {
      auto features_list = message->GetArgumentList()->GetList(3);
      MainContext::Get()->SetFeatures(
          Features::FromCefValueList(features_list));
    }
    mmhmm::HybridBridgeCallbackHandler::OnBridgeInitialized(browser, build, theme, release_track);

#if defined(OS_WIN)
    // TODO : Consolidate mini remote and stream deck
    MainContext::Get()->OnBridgeInitialized(
        browser, build, theme, release_track);
#endif 
  } else if (message_name == "sendMmhmmControlMessage") {
    auto mini_remote_manager = MainContext::Get()->GetMiniRemoteManager();
    if (!mini_remote_manager) 
        return false;

    auto javascript = message->GetArgumentList()->GetString(0);
    auto result = mini_remote_manager->ExecuteJavascriptOnWebApp(javascript);
    return result;
  } else if (message_name == "miniRemoteOpen") {
    auto mini_remote_manager = MainContext::Get()->GetMiniRemoteManager();
    if (!mini_remote_manager)
        return false;

    auto browser_id = message->GetArgumentList()->GetInt(0);
    mini_remote_manager->OnOpen(browser_id);
    return true;
  } else if (message_name == "miniRemoteClosed") {
    auto mini_remote_manager = MainContext::Get()->GetMiniRemoteManager();
    if (!mini_remote_manager)
      return false;
    mini_remote_manager->OnClose();
    return true;
  }
  else if (message_name == "miniRemoteSaveState") {
    auto mini_remote_manager = MainContext::Get()->GetMiniRemoteManager();
    if (!mini_remote_manager)
        return false;
    auto font_size = message->GetArgumentList()->GetInt(0);
    auto notes_expaned = message->GetArgumentList()->GetBool(1);
    mini_remote_manager->OnSaveState(font_size, notes_expaned);
    return true;
  }
  else if (message_name == "getSpeakerNotes") {
      auto mini_remote_manager = MainContext::Get()->GetMiniRemoteManager();
      if (!mini_remote_manager)
          return false;

      auto slide_id = message->GetArgumentList()->GetString(0);
      mini_remote_manager->GetSpeakerNotes(slide_id);
      return true;
  }
  else if (message_name == "setSpeakerNotes") {
      auto mini_remote_manager = MainContext::Get()->GetMiniRemoteManager();
      if (!mini_remote_manager)
          return false;

      auto slide_id = message->GetArgumentList()->GetString(0);
      auto note = message->GetArgumentList()->GetString(1);
      mini_remote_manager->SetSpeakerNotes(slide_id, note);
      return true;
  }
  else if (message_name == "setMinimumMiniRemoteSize") {
      auto mini_remote_manager = MainContext::Get()->GetMiniRemoteManager();
      if (!mini_remote_manager)
          return false;

      auto width = message->GetArgumentList()->GetInt(0);
      auto height = message->GetArgumentList()->GetInt(1);
      mini_remote_manager->SetMinimumMiniRemoteSize(width, height);
      return true;
  }
  else if (message_name == "adjustHeight") {
      auto mini_remote_manager = MainContext::Get()->GetMiniRemoteManager();
      if (!mini_remote_manager)
          return false;

      auto height = message->GetArgumentList()->GetInt(0);
      mini_remote_manager->AdjustHeight(height);
      return true;
  }
  else if (message_name == "toggleBroadcastMode") {
#if defined(OS_WIN)
    // TODO : Consolidate mini remote and stream deck
    MainContext::Get()->GetApplicationContext()->OnToggleBroadcastMode(browser);
#endif 
  }
  else if (message_name == "showMiniRemote") {
    mmhmm::HybridBridgeCallbackHandler::OnShowMiniRemote(browser);
    auto mini_remote_manager = MainContext::Get()->GetMiniRemoteManager();
    if (mini_remote_manager) {
      mini_remote_manager->OnShowMiniRemote();
    }
    return true;
  }
  else if (message_name == "hideMiniRemote") {
    mmhmm::HybridBridgeCallbackHandler::OnHideMiniRemote(browser);
    auto mini_remote_manager = MainContext::Get()->GetMiniRemoteManager();
    if (mini_remote_manager) {
      mini_remote_manager->OnHideMiniRemote();
    }
    return true;
  } else if (message_name == "enterBroadcastMode") {
    mmhmm::HybridBridgeCallbackHandler::OnEnterBroadcastMode(browser);
    return true;
  } else if (message_name == "exitBroadcastMode") {
    mmhmm::HybridBridgeCallbackHandler::OnExitBroadcastMode(browser);
    return true;
  } else if (message_name == "stageRenderingStarted") {
    mmhmm::HybridBridgeCallbackHandler::OnStageRenderingStarted(browser);
    return true;
  } else if (message_name == "stageRenderingStopped") {
    mmhmm::HybridBridgeCallbackHandler::OnStageRenderingStopped(browser);
    return true;
  }
  else if (message_name == "streamDeckPromptAskChanged") {
#if defined (OS_WIN)
    //TODO : Consolidate mini remote and stream deck 
    MainContext::Get()->GetApplicationContext()->StreamDeckPromptAskChanged(message->GetArgumentList()->GetBool(0));
#endif 
  } else if (message_name == "resizeTo") {
    auto window =
        MainContext::Get()->GetRootWindowManager()->GetWindowForBrowser(
            browser->GetIdentifier());
    if (window) {
      window->SetSize(message->GetArgumentList()->GetInt(0),
                      message->GetArgumentList()->GetInt(1));
    }
  } else if (message_name == "setMinimumSize") {
    auto window =
        MainContext::Get()->GetRootWindowManager()->GetWindowForBrowser(
            browser->GetIdentifier());
    if (window) {
      window->SetMinimumSize(message->GetArgumentList()->GetInt(0),
                      message->GetArgumentList()->GetInt(1));
    }
  } else if (message_name == "setMaximumSize") {
    auto window =
        MainContext::Get()->GetRootWindowManager()->GetWindowForBrowser(
            browser->GetIdentifier());
    if (window) {
      window->SetMaximumSize(message->GetArgumentList()->GetInt(0),
                      message->GetArgumentList()->GetInt(1));
    }
  } else if (message_name == "omitInScreenShares") {
#if defined (OS_MAC)
    auto window = MainContext::Get()->GetRootWindowManager()->GetWindowForBrowser(browser->GetIdentifier());
    if (window) {
      Airtime::SwiftBridge::onOmitInScreenShares(window->GetWindowHandle(), message->GetArgumentList()->GetBool(0));
    } else {
      DCHECK(0);
      NativeLogger::LogMessage("omitInScreenShares: No window for browser", LOGSEVERITY_ERROR, "ClientHandler");
    }
#elif defined (OS_WIN)
    auto application_context = MainContext::Get()->GetApplicationContext();
    if (application_context) {
      application_context->OnOmitInScreenShares(
          browser->GetIdentifier(), message->GetArgumentList()->GetBool(0));
    }
#endif
  } else if (message_name == "AppCapabilities.RequestRelaunch") {
#if defined (OS_MAC)
    Airtime::SwiftBridge::onAppCapabilitiesRequestRelaunch();
#elif defined (OS_WIN)
#endif
  } else if (message_name == "AppCapabilities.RequestReboot") {
#if defined (OS_MAC)
    Airtime::SwiftBridge::onAppCapabilitiesRequestReboot();
#elif defined (OS_WIN)
#endif
  } else if (message_name == "MainAppWindow.ResizeTo") {
#if defined (OS_MAC)
    Airtime::SwiftBridge::onMainAppWindowResizeTo(message->GetArgumentList()->GetInt(0),
                                                  message->GetArgumentList()->GetInt(1),
                                                  browser->GetIdentifier());
#elif defined (OS_WIN)
    MainContext::Get()
        ->GetApplicationContext()->ResizeMainWindow(
        message->GetArgumentList()->GetInt(0),
        message->GetArgumentList()->GetInt(1));
#endif
  } else if (message_name == MainAppWindow::setIsFloatingToIdentifier) {
#if defined (OS_MAC)
    Airtime::SwiftBridge::onSetIsFloatingTo(message->GetArgumentList()->GetBool(0),
                                            browser->GetIdentifier());
#elif defined (OS_WIN)
    MainContext::Get()->GetApplicationContext()->SetWindowIsFloating(
        message->GetArgumentList()->GetBool(0), browser->GetIdentifier());
#endif
  } else if (message_name == MainAppWindow::setIsHiddenToIdentifier) {
#if defined (OS_MAC)
    Airtime::SwiftBridge::onSetIsHiddenTo(message->GetArgumentList()->GetBool(0),
                                          browser->GetIdentifier());
#elif defined (OS_WIN)
    DCHECK(0);
#endif
  } else if (message_name == "Camera.Authorize") {
#if defined (OS_MAC)
    Airtime::SwiftBridge::onCameraAuthorize();
#elif defined(OS_WIN)
    // Not expected on Windows
    DCHECK(0);
#endif
  } else if (message_name == "Microphone.Authorize") {
#if defined (OS_MAC)
    Airtime::SwiftBridge::onMicrophoneAuthorize();
#elif defined(OS_WIN)
    // Not expected on Windows
    DCHECK(0);
#endif
  } else if (message_name == "VirtualCamera.Install") {
#if defined (OS_MAC)
    Airtime::SwiftBridge::onVirtualCameraInstall();
#elif defined (OS_WIN)
    MainContext::Get()->InstallVirtualCamera(
        mmhmm::AppSettingsService::GetApplicationDirectory());
#endif
  } else if (message_name == "VirtualCamera.Uninstall") {
#if defined (OS_MAC)
    Airtime::SwiftBridge::onVirtualCameraUninstall();
#elif defined (OS_WIN)
    MainContext::Get()->UninstallVirtualCamera(
        mmhmm::AppSettingsService::GetApplicationDirectory());
#endif
  } else if (message_name == "VirtualCamera.Authorize") {
#if defined (OS_MAC)
    Airtime::SwiftBridge::onVirtualCameraAuthorize();
#elif defined(OS_WIN)
    // Not expected on Windows
    DCHECK(0);
#endif
  } else if (message_name == TitlebarButton::VirtualCameraSupportViewDidAppearIdentifier) {
#if defined (OS_MAC)
    Airtime::SwiftBridge::onVirtualCameraSupportViewDidAppear();
#elif defined(OS_WIN)
    MainContext::Get()
        ->GetApplicationContext()
        ->OnVirtualCameraSupportViewDidAppear();
#endif
  } else if (message_name == TitlebarButton::VirtualCameraSupportViewWillDisappearIdentifier) {
#if defined (OS_MAC)
    Airtime::SwiftBridge::onVirtualCameraSupportViewWillDisappear();
#elif defined(OS_WIN)
    MainContext::Get()
        ->GetApplicationContext()
        ->OnVirtualCameraSupportViewWillDisappear();
#endif
  } else if (message_name == "segmentationPanelCreated") {
    auto segmentation_panel_manager = MainContext::Get()->GetSegmentationPanelManager();
    if (!segmentation_panel_manager)
        return false;

    auto browser_id = message->GetArgumentList()->GetInt(0);
    segmentation_panel_manager->OnOpen(browser_id);
    return true;
  } else if (message_name == "segmentationPanelDataChanged") {
    auto segmentation_panel_manager = MainContext::Get()->GetSegmentationPanelManager();
    if (!segmentation_panel_manager)
        return false;

    auto json_config = message->GetArgumentList()->GetString(0);
    segmentation_panel_manager->OnDataChanged(json_config);
    return true;
  } else if (message_name == Titlebar::appModeChangedIdentifier) {
#if defined (OS_MAC)
    NativeLogger::LogMessage("Ignoring app mode change", LOGSEVERITY_INFO, "ClientHandler");
#elif defined(OS_WIN)
    auto logger = MainContext::Get()->GetLogger();
    if (logger) {
      logger->info("Ignoring app mode change");
    }
#endif
  } else if (message_name == Titlebar::updateIdentifier) {
#if defined (OS_MAC)
    auto titlebar = mmhmm::Titlebar(message->GetArgumentList()->GetDictionary(0));
    Airtime::SwiftBridge::onTitlebarUpdate(titlebar, browser->GetIdentifier());
#elif defined(OS_WIN)
    auto titlebar =
        mmhmm::Titlebar(message->GetArgumentList()->GetDictionary(0));
#endif
  } else if (message_name == ChangeAppMode::ID) {
      // TODO : Get from factory
      std::string errorMessage;
      auto changeAppModeMessage = ChangeAppMode::Make(message, errorMessage);
      // TODO : Get strategy
      if (changeAppModeMessage.has_value()) {
        auto handler = ChangeAppModeHandler();
        return handler.Execute(changeAppModeMessage.value());
      } else {
        DCHECK(0);
      }
  } else if (message_name == LaunchFloatingNav::ID) {
      std::string errorMessage;
      auto launchFloatingNavMessage = LaunchFloatingNav::Make(message, errorMessage);
      if (launchFloatingNavMessage.has_value()) {
        auto handler = LaunchFloatingNavHandler();
        return handler.Execute(launchFloatingNavMessage.value());
      }
  } else if (message_name == "floatingNavReady") {
      // Floating nav is ready - currently just logging
      DLOG(INFO) << "Floating camera nav is ready";
      return true;
  } else if (message_name == "launchScreenRecorder") {
      // Launch the screen recorder window
      auto root_window_manager = MainContext::Get()->GetRootWindowManager();
      auto existing_window = root_window_manager->GetWindowByWebAppType(
          WebAppType::screen_recorder);
      if (existing_window) {
        existing_window->Show(RootWindow::ShowNormal);
      }
      // If no existing window, the screen recorder would need to be launched
      // through the appropriate mechanism (URL navigation or window creation)
      return true;
  } else {
    if (MainContext::Get()->GetLoginItemInstaller()->HandleProcessMessage(browser, frame, source_process, message)) {
      return true;
    }
    if (MainContext::Get()->GetWindowOverlay()->HandleProcessMessage(browser, frame, source_process, message)) {
      return true;
    }
    if (MainContext::Get()->GetSystemVideoEffectsMonitor()->HandleProcessMessage(browser, frame, source_process, message)) {
      return true;
    }
    if (MainContext::Get()->GetEventProxy()->HandleProcessMessage(browser, frame, source_process, message)) {
      return true;
    }
  }

  return false;
}

bool ClientHandler::OnChromeCommand(CefRefPtr<CefBrowser> browser,
                                    int command_id,
                                    cef_window_open_disposition_t disposition) {
  CEF_REQUIRE_UI_THREAD();
  DCHECK(MainContext::Get()->UseChromeRuntime());

  if (!with_controls_ &&
      (disposition != CEF_WOD_CURRENT_TAB || !IsAllowedCommandId(command_id))) {
    // Block everything that doesn't target the current tab or isn't an
    // allowed command ID.
    LOG(INFO) << "Blocking command " << command_id << " with disposition "
              << disposition;
    return true;
  }

  // Default handling.
  return false;
}

void ClientHandler::OnBeforeContextMenu(CefRefPtr<CefBrowser> browser,
                                        CefRefPtr<CefFrame> frame,
                                        CefRefPtr<CefContextMenuParams> params,
                                        CefRefPtr<CefMenuModel> model) {
  CEF_REQUIRE_UI_THREAD();

  const bool use_chrome_runtime = MainContext::Get()->UseChromeRuntime();
  if (use_chrome_runtime) {
    // Remove all items
    if (model != nullptr)
    {
      model->Clear();
    }
  }
  else
  {
    if ((params->GetTypeFlags() & (CM_TYPEFLAG_PAGE | CM_TYPEFLAG_FRAME)) != 0) {
      // Add a separator if the menu already has items.
      if (model->GetCount() > 0)
        model->AddSeparator();

      if (!use_chrome_runtime) {
        // TODO(chrome-runtime): Add support for this.
        // Add DevTools items to all context menus.
        model->AddItem(CLIENT_ID_SHOW_DEVTOOLS, "&Show DevTools");
        model->AddItem(CLIENT_ID_CLOSE_DEVTOOLS, "Close DevTools");
        model->AddSeparator();
        model->AddItem(CLIENT_ID_INSPECT_ELEMENT, "Inspect Element");
      }

      if (HasSSLInformation(browser)) {
        model->AddSeparator();
        model->AddItem(CLIENT_ID_SHOW_SSL_INFO, "Show SSL information");
      }
    }
  }

  if (delegate_)
    delegate_->OnBeforeContextMenu(model);
}

bool ClientHandler::OnContextMenuCommand(CefRefPtr<CefBrowser> browser,
                                         CefRefPtr<CefFrame> frame,
                                         CefRefPtr<CefContextMenuParams> params,
                                         int command_id,
                                         EventFlags event_flags) {
  CEF_REQUIRE_UI_THREAD();

  switch (command_id) {
    case CLIENT_ID_SHOW_DEVTOOLS:
      ShowDevTools(browser, CefPoint());
      return true;
    case CLIENT_ID_CLOSE_DEVTOOLS:
      CloseDevTools(browser);
      return true;
    case CLIENT_ID_INSPECT_ELEMENT:
      ShowDevTools(browser, CefPoint(params->GetXCoord(), params->GetYCoord()));
      return true;
    case CLIENT_ID_SHOW_SSL_INFO:
      ShowSSLInformation(browser);
      return true;
    case CLIENT_ID_CURSOR_CHANGE_DISABLED:
      mouse_cursor_change_disabled_ = !mouse_cursor_change_disabled_;
      return true;
    case CLIENT_ID_OFFLINE:
      offline_ = !offline_;
      SetOfflineState(browser, offline_);
      return true;
    default:  // Allow default handling, if any.
      return ExecuteTestMenu(command_id);
  }
}

void ClientHandler::OnAddressChange(CefRefPtr<CefBrowser> browser,
                                    CefRefPtr<CefFrame> frame,
                                    const CefString& url) {
  CEF_REQUIRE_UI_THREAD();

  // Only update the address for the main (top-level) frame.
  if (frame->IsMain())
    NotifyAddress(url);
}

void ClientHandler::OnTitleChange(CefRefPtr<CefBrowser> browser,
                                  const CefString& title) {
  CEF_REQUIRE_UI_THREAD();

  NotifyTitle(title);
}

void ClientHandler::OnFaviconURLChange(
    CefRefPtr<CefBrowser> browser,
    const std::vector<CefString>& icon_urls) {
  CEF_REQUIRE_UI_THREAD();

  if (!icon_urls.empty() && download_favicon_images_) {
    browser->GetHost()->DownloadImage(icon_urls[0], true, 16, false,
                                      new ClientDownloadImageCallback(this));
  }
}

void ClientHandler::OnFullscreenModeChange(CefRefPtr<CefBrowser> browser,
                                           bool fullscreen) {
  CEF_REQUIRE_UI_THREAD();

  NotifyFullscreen(fullscreen);
}

bool ClientHandler::OnConsoleMessage(CefRefPtr<CefBrowser> browser,
                                     cef_log_severity_t level,
                                     const CefString& message,
                                     const CefString& source,
                                     int line) {
  CEF_REQUIRE_UI_THREAD();

#if defined (OS_MACOSX)
  std::stringstream ss;
  ss << source.ToString() << ":" << line;
  NativeLogger::LogMessage(message.ToString(), level, ss.str());
#else
  auto logger = MainContext::Get()->GetLogger();
  // exit early if log level is lower than we want to log
  if (level < MainContext::Get()->GetLogLevel() || logger == nullptr) {
    return false;
  }

  std::stringstream ss;
  ss << "Console Message: " << message.ToString() << " Source: " << source.ToString() << " Line: " << line;

  switch (level) {
    case LOGSEVERITY_DEBUG:
      logger->debug(ss.str());
      break;
    case LOGSEVERITY_DEFAULT:
    case LOGSEVERITY_INFO:
      logger->info(ss.str());
      break;
    case LOGSEVERITY_WARNING:
      logger->warn(ss.str());
      break;
    case LOGSEVERITY_ERROR:
      logger->error(ss.str());
      break;
    case LOGSEVERITY_FATAL:
    case LOGSEVERITY_DISABLE:
      logger->error(ss.str());
      break;
  }
#endif
  return true;
}

bool ClientHandler::OnAutoResize(CefRefPtr<CefBrowser> browser,
                                 const CefSize& new_size) {
  CEF_REQUIRE_UI_THREAD();

  NotifyAutoResize(new_size);
  return true;
}

bool ClientHandler::OnCursorChange(CefRefPtr<CefBrowser> browser,
                                   CefCursorHandle cursor,
                                   cef_cursor_type_t type,
                                   const CefCursorInfo& custom_cursor_info) {
  CEF_REQUIRE_UI_THREAD();

  // Return true to disable default handling of cursor changes.
  return mouse_cursor_change_disabled_;
}

bool ClientHandler::CanDownload(CefRefPtr<CefBrowser> browser,
                                const CefString& url,
                                const CefString& request_method) {
  CEF_REQUIRE_UI_THREAD();

  // Allow the download.
  return true;
}

bool ClientHandler::OnBeforeDownload(
    CefRefPtr<CefBrowser> browser,
    CefRefPtr<CefDownloadItem> download_item,
    const CefString& suggested_name,
    CefRefPtr<CefBeforeDownloadCallback> callback) {
  CEF_REQUIRE_UI_THREAD();

  // Continue the download and show the "Save As" dialog.
  callback->Continue(MainContext::Get()->GetDownloadPath(suggested_name), true);
  return true;
}

void ClientHandler::OnDownloadUpdated(
    CefRefPtr<CefBrowser> browser,
    CefRefPtr<CefDownloadItem> download_item,
    CefRefPtr<CefDownloadItemCallback> callback) {
  CEF_REQUIRE_UI_THREAD();
}

bool ClientHandler::OnDragEnter(CefRefPtr<CefBrowser> browser,
                                CefRefPtr<CefDragData> dragData,
                                CefDragHandler::DragOperationsMask mask) {
  CEF_REQUIRE_UI_THREAD();

  return false;
}

void ClientHandler::OnDraggableRegionsChanged(
    CefRefPtr<CefBrowser> browser,
    CefRefPtr<CefFrame> frame,
    const std::vector<CefDraggableRegion>& regions) {
  CEF_REQUIRE_UI_THREAD();

  NotifyDraggableRegions(regions);
}

void ClientHandler::OnFrameCreated(CefRefPtr<CefBrowser> browser,
                                   CefRefPtr<CefFrame> frame) {
  DLOG(INFO) << "Created browser " << browser->GetIdentifier() << " frame " << frame->GetIdentifier() << " " << frame->GetURL();
}

void ClientHandler::OnFrameDestroyed(CefRefPtr<CefBrowser> browser,
                                     CefRefPtr<CefFrame> frame) {
  DLOG(INFO) << "Destroyed browser " << browser->GetIdentifier() << " frame " << frame->GetIdentifier() << " " << frame->GetURL();
}

void ClientHandler::OnFrameAttached(CefRefPtr<CefBrowser> browser,
                                    CefRefPtr<CefFrame> frame,
                                    bool reattached) {
  DLOG(INFO) << (reattached ? "Rea" : "A") << "ttached browser " << browser->GetIdentifier() << " frame " << frame->GetIdentifier() << " " << frame->GetURL();

  // Blanket update every attaching frame, which can be identified as mmhmm, to ensure freshly spawned render processes
  // taking over from other render processes due to cross-origin site isolation are always up to date. Technically this could
  // be restricted to frames going through `OnMainFrameChanged` with a non-`nullptr` `old_frame` first, but that would require
  // additional state and book keeping, since multiple in-flight browsers can exist simultaneously.
  if (auto url = frame->GetURL(); mmhmm::GetWebAppType(url) == WebAppType::mmhmm || mmhmm::urls::IsAirtimeAuthUrl(url)) {
    auto context = MainContext::Get();
    if (!context) {
      DCHECK(false);
      return;
    }
    context->UpdateGHybridInFrame(frame);
  }
}

void ClientHandler::OnFrameDetached(CefRefPtr<CefBrowser> browser,
                                    CefRefPtr<CefFrame> frame) {
  DLOG(INFO) << "Detached browser " << browser->GetIdentifier() << " frame " << frame->GetIdentifier() << " " << frame->GetURL();
}

void ClientHandler::OnMainFrameChanged(CefRefPtr<CefBrowser> browser,
                                       CefRefPtr<CefFrame> old_frame,
                                       CefRefPtr<CefFrame> new_frame) {
  DLOG(INFO) << "Browser " << browser->GetIdentifier() << " changed main frame " << (old_frame ? old_frame->GetIdentifier() : "-") << " " << (old_frame ? old_frame->GetURL() : "-") << " to " << (new_frame ? new_frame->GetIdentifier() : "-") << " " << (new_frame ? new_frame->GetURL() : "-");
}

void ClientHandler::OnTakeFocus(CefRefPtr<CefBrowser> browser, bool next) {
  CEF_REQUIRE_UI_THREAD();

  NotifyTakeFocus(next);
}

bool ClientHandler::OnSetFocus(CefRefPtr<CefBrowser> browser,
                               FocusSource source) {
  CEF_REQUIRE_UI_THREAD();

  if (initial_navigation_) {
    CefRefPtr<CefCommandLine> command_line =
        CefCommandLine::GetGlobalCommandLine();
    if (command_line->HasSwitch(switches::kNoActivate)) {
      // Don't give focus to the browser on creation.
      return true;
    }
  }

  return false;
}

bool ClientHandler::OnPreKeyEvent(CefRefPtr<CefBrowser> browser,
                                  const CefKeyEvent& event,
                                  CefEventHandle os_event,
                                  bool* is_keyboard_shortcut) {
  CEF_REQUIRE_UI_THREAD();
	
#if defined (OS_WIN)

  if (os_event != nullptr) {
    if (os_event->message == WM_KEYDOWN && os_event->wParam == VK_F5)
      return true;

    if (os_event->message == WM_KEYDOWN && 
        os_event->wParam == 0x52 &&  //R character
        event.modifiers & EVENTFLAG_CONTROL_DOWN) {  // Ctrl+R.
      return true;
    }

    if (os_event->message == WM_KEYDOWN &&
        os_event->wParam == 0x5A &&  //Z character
        event.modifiers & EVENTFLAG_CONTROL_DOWN) {  // Ctrl+Z (Undo).
        Undo();
        return true;
    }

    if (os_event->message == WM_KEYDOWN &&
        os_event->wParam == 0x59 &&  //Y character
        event.modifiers & EVENTFLAG_CONTROL_DOWN) {  // Ctrl+Y (Redo).
        Redo();
        return true;
    }

    if (os_event->message == WM_KEYDOWN &&
        os_event->wParam == VK_F4) {  // F4 (Redo).
        Redo();
        return true;
    }

    if (os_event->message == WM_KEYDOWN &&
        os_event->wParam == 0x49 &&
        event.modifiers & EVENTFLAG_CONTROL_DOWN &&
        event.modifiers & EVENTFLAG_SHIFT_DOWN) {  // Ctrl+Shift+I (DevTools).
      if (mmhmm::AppTrackService::get_app_updater_track().compare(
              mmhmm::TrackConstants::QA) == 0 ||
          mmhmm::AppTrackService::get_app_updater_track().compare(
              mmhmm::TrackConstants::Alpha) == 0) {
        ShowDevTools(browser, {0, 0});
        return true;
      }
    }

    if (os_event->message == WM_KEYDOWN &&
      os_event->wParam == 0x42 &&  //B character
      event.modifiers & EVENTFLAG_CONTROL_DOWN) {  // Ctrl+B (Show Broadcast).

      auto app_context = MainContext::Get()->GetApplicationContext();
      if (app_context) {
        app_context->OnToggleBroadcastMode(browser);
      }
      return true;
    }
  }
#endif
  /*
  if (!event.focus_on_editable_field && event.windows_key_code == 0x20) {
    // Special handling for the space character when an input element does not
    // have focus. Handling the event in OnPreKeyEvent() keeps the event from
    // being processed in the renderer. If we instead handled the event in the
    // OnKeyEvent() method the space key would cause the window to scroll in
    // addition to showing the alert box.
    if (event.type == KEYEVENT_RAWKEYDOWN)
      test_runner::Alert(browser, "You pressed the space bar!");
    return true;
  }
  */

  return false;
}

bool ClientHandler::OnBeforePopup(
    CefRefPtr<CefBrowser> browser,
    CefRefPtr<CefFrame> frame,
    int popup_id,
    const CefString& target_url,
    const CefString& target_frame_name,
    CefLifeSpanHandler::WindowOpenDisposition target_disposition,
    bool user_gesture,
    const CefPopupFeatures& popupFeatures,
    CefWindowInfo& windowInfo,
    CefRefPtr<CefClient>& client,
    CefBrowserSettings& settings,
    CefRefPtr<CefDictionaryValue>& extra_info,
    bool* no_javascript_access) {
  CEF_REQUIRE_UI_THREAD();

  if (target_disposition == CEF_WOD_NEW_PICTURE_IN_PICTURE) {
      // Use default handling for document picture-in-picture popups.
      client = nullptr;
      return false;
  }

  if (NavigateToURLExternal(target_url, target_frame_name) == false) {
      // Return true to cancel the popup window.
    return !CreatePopupWindow(browser, GetWebAppType(target_url), false,
                              ShouldShowAsModal(target_url), popupFeatures,
                              windowInfo,
                              client, settings, extra_info);
  }

  return true;
}

WebAppType ClientHandler::GetWebAppType(const CefString& target_url) {
  return mmhmm::GetWebAppType(target_url);
}

bool ClientHandler::ShouldShowAsModal(const CefString& target_url) {
  auto app_type = GetWebAppType(target_url);
  return app_type != WebAppType::mini_remote &&
         app_type != WebAppType::broadcast &&
         app_type != WebAppType::hybrid_api_tester &&
         app_type != WebAppType::stacks;
}

bool ClientHandler::NavigateToURLExternal(const CefString& target_url,
                                          const CefString& target_frame_name) {
  // If the target isn't a known local page, then launch in the external
  // browser
  auto app_type = GetWebAppType(target_url);
  if (app_type == WebAppType::external || target_frame_name == "_external") {
#if defined(OS_WIN)
    return ShellExecute(0, 0, target_url.ToWString().c_str(), 0, 0, SW_SHOW);
#elif defined(OS_MACOSX)
    Airtime::SwiftBridge::navigateToExternalURL(target_url.ToString());
    return true;
#endif
  }

  return false;
}

void ClientHandler::OnAfterCreated(CefRefPtr<CefBrowser> browser) {
  CEF_REQUIRE_UI_THREAD();

  browser_count_++;

  if (!message_router_) {
    // Create the browser-side router for query handling.
    CefMessageRouterConfig config;
    message_router_ = CefMessageRouterBrowserSide::Create(config);

    // Register handlers with the router.
    MessageHandlerSet::const_iterator it = message_handler_set_.begin();
    for (; it != message_handler_set_.end(); ++it)
      message_router_->AddHandler(*(it), false);
  }

  // Set offline mode if requested via the command-line flag.
  if (offline_)
    SetOfflineState(browser, true);

  NotifyBrowserCreated(browser);
}

bool ClientHandler::DoClose(CefRefPtr<CefBrowser> browser) {
  CEF_REQUIRE_UI_THREAD();

  NotifyBrowserClosing(browser);

  // Allow the close. For windowed browsers this will result in the OS close
  // event being sent.
  return false;
}

void ClientHandler::OnBeforeClose(CefRefPtr<CefBrowser> browser) {
  CEF_REQUIRE_UI_THREAD();

  if (--browser_count_ == 0) {
    // Remove and delete message router handlers.
    MessageHandlerSet::const_iterator it = message_handler_set_.begin();
    for (; it != message_handler_set_.end(); ++it) {
      message_router_->RemoveHandler(*(it));
      delete *(it);
    }
    message_handler_set_.clear();
    message_router_ = nullptr;
  }

  NotifyBrowserClosed(browser);
}

void ClientHandler::OnLoadingStateChange(CefRefPtr<CefBrowser> browser,
                                         bool isLoading,
                                         bool canGoBack,
                                         bool canGoForward) {
  CEF_REQUIRE_UI_THREAD();

  if (!isLoading && initial_navigation_) {
    initial_navigation_ = false;
  }
  NotifyLoadingState(isLoading, canGoBack, canGoForward);
}

void ClientHandler::OnLoadEnd(CefRefPtr<CefBrowser> browser,
                                CefRefPtr<CefFrame> frame,
                                int statusCode) {
  CEF_REQUIRE_UI_THREAD();

  mmhmm::BrowserEventHandler::OnLoadEnd(browser, frame, statusCode);
}

void ClientHandler::OnLoadError(CefRefPtr<CefBrowser> browser,
                                CefRefPtr<CefFrame> frame,
                                ErrorCode errorCode,
                                const CefString& errorText,
                                const CefString& failedUrl) {
  CEF_REQUIRE_UI_THREAD();

  // Don't display an error for downloaded files.
  if (errorCode == ERR_ABORTED)
    return;

  // Don't display an error for external protocols that we allow the OS to
  // handle. See OnProtocolExecution().
  if (errorCode == ERR_UNKNOWN_URL_SCHEME) {
    std::string urlStr = frame->GetURL();
    if (urlStr.find("chrome:") == 0)
      return;

    if (urlStr.find(mmhmm::urls::HybridProtocol) == 0)
      return;
  }

  mmhmm::BrowserEventHandler::OnLoadError(browser, frame, errorCode, errorText, failedUrl);

  // Load the error page.
  LoadErrorPage(frame, failedUrl, errorCode, errorText);
}

bool ClientHandler::OnRequestMediaAccessPermission(
  CefRefPtr<CefBrowser> browser,
  CefRefPtr<CefFrame> frame,
  const CefString& requesting_origin,
  uint32_t requested_permissions,
  CefRefPtr<CefMediaAccessCallback> callback) {
  callback->Continue(requested_permissions);
  return true;
}

bool ClientHandler::OnShowPermissionPrompt(
    CefRefPtr<CefBrowser> browser,
    uint64_t prompt_id,
    const CefString& requesting_origin,
    uint32_t requested_permissions,
    CefRefPtr<CefPermissionPromptCallback> callback) {
  callback->Continue(CEF_PERMISSION_RESULT_ACCEPT);
  return true;
}

bool ClientHandler::OnBeforeBrowse(CefRefPtr<CefBrowser> browser,
                                   CefRefPtr<CefFrame> frame,
                                   CefRefPtr<CefRequest> request,
                                   bool user_gesture,
                                   bool is_redirect) {
  CEF_REQUIRE_UI_THREAD();

  #if defined (OS_WIN)
  auto window =
      MainContext::Get()->GetRootWindowManager()->GetWindowForBrowser(browser->GetIdentifier());
  if (frame->IsMain() && window && IsWebAppMalkType(window->GetWebAppType())) {
    MainContext::Get()->CloseChildApps();
  }
  #endif  // defined (OS_WIN)

  message_router_->OnBeforeBrowse(browser, frame);
  mmhmm::BrowserEventHandler::OnBeforeBrowse(browser, frame, request, user_gesture, is_redirect);


  std::string urlStr = request->GetURL();
  if (urlStr.find(mmhmm::urls::HybridProtocol) == 0) {
    // Don't navigate to the hybrid protocol URL,
    // which is handled by native code.
#if defined(OS_WIN)
    // On Windows push the request out to the OS.
    // Allowing it to flow through CEF results in a failed navigation
    // Or if it reaches OnProtocolExecution it will prompt the user with the Chrome
    // Permissions dialog.
    ShellExecute(NULL, L"open", request->GetURL().ToWString().c_str(), NULL,
                 NULL, SW_HIDE);
#endif

    return true;
  }

  return false;
}

bool ClientHandler::OnOpenURLFromTab(
    CefRefPtr<CefBrowser> browser,
    CefRefPtr<CefFrame> frame,
    const CefString& target_url,
    CefRequestHandler::WindowOpenDisposition target_disposition,
    bool user_gesture) {
    
    return NavigateToURLExternal(target_url);
}

CefRefPtr<CefResourceRequestHandler> ClientHandler::GetResourceRequestHandler(
    CefRefPtr<CefBrowser> browser,
    CefRefPtr<CefFrame> frame,
    CefRefPtr<CefRequest> request,
    bool is_navigation,
    bool is_download,
    const CefString& request_initiator,
    bool& disable_default_handling) {
  CEF_REQUIRE_IO_THREAD();
  return this;
}

bool ClientHandler::GetAuthCredentials(CefRefPtr<CefBrowser> browser,
                                       const CefString& origin_url,
                                       bool isProxy,
                                       const CefString& host,
                                       int port,
                                       const CefString& realm,
                                       const CefString& scheme,
                                       CefRefPtr<CefAuthCallback> callback) {
  CEF_REQUIRE_IO_THREAD();

  // Used for testing authentication with a proxy server.
  // For example, CCProxy on Windows.
  if (isProxy) {
    callback->Continue("guest", "guest");
    return true;
  }

  // Used for testing authentication with https://jigsaw.w3.org/HTTP/.
  if (host == "jigsaw.w3.org") {
    callback->Continue("guest", "guest");
    return true;
  }

  return false;
}

bool ClientHandler::OnCertificateError(CefRefPtr<CefBrowser> browser,
                                       ErrorCode cert_error,
                                       const CefString& request_url,
                                       CefRefPtr<CefSSLInfo> ssl_info,
                                       CefRefPtr<CefCallback> callback) {
  CEF_REQUIRE_UI_THREAD();

  if (cert_error == ERR_CERT_COMMON_NAME_INVALID &&
    request_url.ToString().find("https://www.magpcss.com/") == 0U) {
    // Allow magpcss.com to load despite having a certificate common name of
    // magpcss.org.
    callback->Continue();
    return true;
  }

  CefRefPtr<CefX509Certificate> cert = ssl_info->GetX509Certificate();
  if (cert.get()) {
    // Load the error page.
    LoadErrorPage(browser->GetMainFrame(), request_url, cert_error,
                  GetCertificateInformation(cert, ssl_info->GetCertStatus()));
  }

  return false;  // Cancel the request.
}

bool ClientHandler::OnSelectClientCertificate(
    CefRefPtr<CefBrowser> browser,
    bool isProxy,
    const CefString& host,
    int port,
    const X509CertificateList& certificates,
    CefRefPtr<CefSelectClientCertificateCallback> callback) {
  CEF_REQUIRE_UI_THREAD();

  CefRefPtr<CefCommandLine> command_line =
      CefCommandLine::GetGlobalCommandLine();
  if (!command_line->HasSwitch(switches::kSslClientCertificate)) {
    return false;
  }

  const std::string& cert_name =
      command_line->GetSwitchValue(switches::kSslClientCertificate);

  if (cert_name.empty()) {
    callback->Select(nullptr);
    return true;
  }

  std::vector<CefRefPtr<CefX509Certificate>>::const_iterator it =
      certificates.begin();
  for (; it != certificates.end(); ++it) {
    CefString subject((*it)->GetSubject()->GetDisplayName());
    if (subject == cert_name) {
      callback->Select(*it);
      return true;
    }
  }

  return true;
}

void ClientHandler::OnRenderProcessTerminated(CefRefPtr<CefBrowser> browser,
                                              TerminationStatus status,
                                              int error_code,
                                              const CefString& error_string) {
  CEF_REQUIRE_UI_THREAD();
  std::stringstream ss;
  ss << "Render process terminated with status: " << status << ", code:" << error_code << ", description:" << error_string.ToString();
#if defined (OS_MACOSX)
  NativeLogger::LogMessage(ss.str(), LOGSEVERITY_FATAL, "");
#else
  auto logger = MainContext::Get()->GetLogger();
  if (logger) {
    logger->error(ss.str());
  }
#endif

  message_router_->OnRenderProcessTerminated(browser);

  // Don't reload if there's no start URL, or if the crash URL was specified.
  if (startup_url_.empty() || startup_url_ == "chrome://crash")
    return;

  CefRefPtr<CefFrame> frame = browser->GetMainFrame();
  std::string url = frame->GetURL();

  frame->LoadURL(url);
}

bool ClientHandler::OnRenderProcessUnresponsive(
  CefRefPtr<CefBrowser> browser,
  CefRefPtr<CefUnresponsiveProcessCallback> callback) {
  switch (hang_action_) {
  case HangAction::kDefault:
    return false;
  case HangAction::kWait:
    callback->Wait();
    break;
  case HangAction::kTerminate:
    callback->Terminate();
    break;
  }
  return true;
}

void ClientHandler::SetHangAction(HangAction action) {
  CEF_REQUIRE_UI_THREAD();
  hang_action_ = action;
}

ClientHandler::HangAction ClientHandler::GetHangAction() const {
  CEF_REQUIRE_UI_THREAD();
  return hang_action_;
}

void ClientHandler::OnDocumentAvailableInMainFrame(
    CefRefPtr<CefBrowser> browser) {
  CEF_REQUIRE_UI_THREAD();

  // Restore offline mode after main frame navigation. Otherwise, offline state
  // (e.g. `navigator.onLine`) might be wrong in the renderer process.
  if (offline_)
    SetOfflineState(browser, true);
}

cef_return_value_t ClientHandler::OnBeforeResourceLoad(
    CefRefPtr<CefBrowser> browser,
    CefRefPtr<CefFrame> frame,
    CefRefPtr<CefRequest> request,
    CefRefPtr<CefCallback> callback) {
  CEF_REQUIRE_IO_THREAD();

  return resource_manager_->OnBeforeResourceLoad(browser, frame, request,
                                                 callback);
}

CefRefPtr<CefResourceHandler> ClientHandler::GetResourceHandler(
    CefRefPtr<CefBrowser> browser,
    CefRefPtr<CefFrame> frame,
    CefRefPtr<CefRequest> request) {
  CEF_REQUIRE_IO_THREAD();

  return resource_manager_->GetResourceHandler(browser, frame, request);
}

void ClientHandler::OnProtocolExecution(CefRefPtr<CefBrowser> browser,
                                        CefRefPtr<CefFrame> frame,
                                        CefRefPtr<CefRequest> request,
                                        bool& allow_os_execution) {
  CEF_REQUIRE_IO_THREAD();

  std::string urlStr = request->GetURL();

  if (urlStr.find(mmhmm::urls::HybridProtocol) == 0) {
    // This does not propagate through to the OS, so our custom scheme
    // needs to be handled manually when the URL is seen by other handlers.
    // Explicitly disallow OS execution to avoid duplicate behavior, in
    // case macOS suddenly starts receiving this through its scheme handlers.
    allow_os_execution = false;
  }
}

int ClientHandler::GetBrowserCount() const {
  CEF_REQUIRE_UI_THREAD();
  return browser_count_;
}

void ClientHandler::ShowDevTools(CefRefPtr<CefBrowser> browser,
                                 const CefPoint& inspect_element_at) {
  if (!CefCurrentlyOn(TID_UI)) {
    // Execute this method on the UI thread.
    CefPostTask(TID_UI, base::BindOnce(&ClientHandler::ShowDevTools, this,
                                       browser, inspect_element_at));
    return;
  }

  CefWindowInfo windowInfo;
  CefRefPtr<CefClient> client;
  CefBrowserSettings settings;
  CefRefPtr<CefDictionaryValue> extra_infoPtr;

  MainContext::Get()->PopulateBrowserSettings(&settings);

  CefRefPtr<CefBrowserHost> host = browser->GetHost();

  // Test if the DevTools browser already exists.
  bool has_devtools = host->HasDevTools();
  if (!has_devtools) {
    // Create a new RootWindow for the DevTools browser that will be created
    // by ShowDevTools().
    has_devtools = CreatePopupWindow(browser,WebAppType::prompt, true, false, CefPopupFeatures(),
                                     windowInfo, client, settings, extra_infoPtr);
  }

  if (has_devtools) {
    // Create the DevTools browser if it doesn't already exist.
    // Otherwise, focus the existing DevTools browser and inspect the element
    // at |inspect_element_at| if non-empty.
    host->ShowDevTools(windowInfo, client, settings, inspect_element_at);
  }
}

void ClientHandler::CloseDevTools(CefRefPtr<CefBrowser> browser) {
  browser->GetHost()->CloseDevTools();
}

bool ClientHandler::HasSSLInformation(CefRefPtr<CefBrowser> browser) {
  CefRefPtr<CefNavigationEntry> nav =
      browser->GetHost()->GetVisibleNavigationEntry();

  return (nav && nav->GetSSLStatus() &&
          nav->GetSSLStatus()->IsSecureConnection());
}

void ClientHandler::ShowSSLInformation(CefRefPtr<CefBrowser> browser) {
  std::stringstream ss;
  CefRefPtr<CefNavigationEntry> nav =
      browser->GetHost()->GetVisibleNavigationEntry();
  if (!nav)
    return;

  CefRefPtr<CefSSLStatus> ssl = nav->GetSSLStatus();
  if (!ssl)
    return;

  ss << "<html><head><title>SSL Information</title></head>"
        "<body bgcolor=\"white\">"
        "<h3>SSL Connection</h3>"
     << "<table border=1><tr><th>Field</th><th>Value</th></tr>";

  CefURLParts urlparts;
  if (CefParseURL(nav->GetURL(), urlparts)) {
    CefString port(&urlparts.port);
    ss << "<tr><td>Server</td><td>" << CefString(&urlparts.host).ToString();
    if (!port.empty())
      ss << ":" << port.ToString();
    ss << "</td></tr>";
  }

  ss << "<tr><td>SSL Version</td><td>"
     << GetSSLVersionString(ssl->GetSSLVersion()) << "</td></tr>";
  ss << "<tr><td>Content Status</td><td>"
     << GetContentStatusString(ssl->GetContentStatus()) << "</td></tr>";

  ss << "</table>";

  CefRefPtr<CefX509Certificate> cert = ssl->GetX509Certificate();
  if (cert.get())
    ss << GetCertificateInformation(cert, ssl->GetCertStatus());

  ss << "</body></html>";

  auto config = std::make_unique<RootWindowConfig>();
  config->with_controls = false;
  MainContext::Get()->GetRootWindowManager()->CreateRootWindow(
      std::move(config), nullptr);
}

void ClientHandler::SetStringResource(const std::string& page,
                                      const std::string& data) {
  if (!CefCurrentlyOn(TID_IO)) {
    CefPostTask(TID_IO, base::BindOnce(&ClientHandler::SetStringResource, this,
                                       page, data));
    return;
  }
}

bool ClientHandler::CreatePopupWindow(CefRefPtr<CefBrowser> browser,
                                      WebAppType app_type,
                                      bool is_devtools,
                                      bool is_modal,
                                      const CefPopupFeatures& popupFeatures,
                                      CefWindowInfo& windowInfo,
                                      CefRefPtr<CefClient>& client,
                                      CefBrowserSettings& settings,
                                      CefRefPtr<CefDictionaryValue>& extra_info) {
  CEF_REQUIRE_UI_THREAD();


  auto newFeatures = popupFeatures;
  newFeatures.isPopup = true;
  // The popup browser will be parented to a new native window.
  // Don't show URL bar and navigation buttons on DevTools windows.

  // Capture the RootWindow handle associated with the browser that requested the popup
  // This allows that RootWindow to be set as the parent for the resulting popup RootWindow
  cef_window_handle_t parent_window_handle = nullptr;
  auto parent_window = MainContext::Get()->GetRootWindowManager()->GetWindowForBrowser(browser->GetIdentifier());
  if (parent_window) {
    parent_window_handle = parent_window->GetWindowHandle();
  }
  MainContext::Get()->GetRootWindowManager()->CreateRootWindowAsPopup(
      app_type, with_controls_ && !is_devtools, is_modal, parent_window_handle,
      newFeatures, windowInfo, client, settings, extra_info);

  return true;
}

void ClientHandler::NotifyBrowserCreated(CefRefPtr<CefBrowser> browser) {
  if (!CURRENTLY_ON_MAIN_THREAD()) {
    // Execute this method on the main thread.
    MAIN_POST_CLOSURE(
        base::BindOnce(&ClientHandler::NotifyBrowserCreated, this, browser));
    return;
  }

  if (delegate_)
    delegate_->OnBrowserCreated(browser);
}

void ClientHandler::NotifyBrowserClosing(CefRefPtr<CefBrowser> browser) {
  if (!CURRENTLY_ON_MAIN_THREAD()) {
    // Execute this method on the main thread.
    MAIN_POST_CLOSURE(
        base::BindOnce(&ClientHandler::NotifyBrowserClosing, this, browser));
    return;
  }

  if (delegate_)
    delegate_->OnBrowserClosing(browser);
}

void ClientHandler::NotifyBrowserClosed(CefRefPtr<CefBrowser> browser) {
  if (!CURRENTLY_ON_MAIN_THREAD()) {
    // Execute this method on the main thread.
    MAIN_POST_CLOSURE(
        base::BindOnce(&ClientHandler::NotifyBrowserClosed, this, browser));
    return;
  }

  if (delegate_)
    delegate_->OnBrowserClosed(browser);
}

void ClientHandler::NotifyAddress(const CefString& url) {
  if (!CURRENTLY_ON_MAIN_THREAD()) {
    // Execute this method on the main thread.
    MAIN_POST_CLOSURE(base::BindOnce(&ClientHandler::NotifyAddress, this, url));
    return;
  }

  if (delegate_)
    delegate_->OnSetAddress(url);
}

void ClientHandler::NotifyTitle(const CefString& title) {
  if (!CURRENTLY_ON_MAIN_THREAD()) {
    // Execute this method on the main thread.
    MAIN_POST_CLOSURE(base::BindOnce(&ClientHandler::NotifyTitle, this, title));
    return;
  }

  if (delegate_)
    delegate_->OnSetTitle(title);
}

void ClientHandler::NotifyFavicon(CefRefPtr<CefImage> image) {
  if (!CURRENTLY_ON_MAIN_THREAD()) {
    // Execute this method on the main thread.
    MAIN_POST_CLOSURE(
        base::BindOnce(&ClientHandler::NotifyFavicon, this, image));
    return;
  }

  if (delegate_)
    delegate_->OnSetFavicon(image);
}

void ClientHandler::NotifyFullscreen(bool fullscreen) {
  if (!CURRENTLY_ON_MAIN_THREAD()) {
    // Execute this method on the main thread.
    MAIN_POST_CLOSURE(
        base::BindOnce(&ClientHandler::NotifyFullscreen, this, fullscreen));
    return;
  }

  if (delegate_)
    delegate_->OnSetFullscreen(fullscreen);
}

void ClientHandler::NotifyAutoResize(const CefSize& new_size) {
  if (!CURRENTLY_ON_MAIN_THREAD()) {
    // Execute this method on the main thread.
    MAIN_POST_CLOSURE(
        base::BindOnce(&ClientHandler::NotifyAutoResize, this, new_size));
    return;
  }

  if (delegate_)
    delegate_->OnAutoResize(new_size);
}

void ClientHandler::NotifyLoadingState(bool isLoading,
                                       bool canGoBack,
                                       bool canGoForward) {
  if (!CURRENTLY_ON_MAIN_THREAD()) {
    // Execute this method on the main thread.
    MAIN_POST_CLOSURE(base::BindOnce(&ClientHandler::NotifyLoadingState, this,
                                     isLoading, canGoBack, canGoForward));
    return;
  }

  if (delegate_)
    delegate_->OnSetLoadingState(isLoading, canGoBack, canGoForward);
}

void ClientHandler::NotifyDraggableRegions(
    const std::vector<CefDraggableRegion>& regions) {
  if (!CURRENTLY_ON_MAIN_THREAD()) {
    // Execute this method on the main thread.
    MAIN_POST_CLOSURE(
        base::BindOnce(&ClientHandler::NotifyDraggableRegions, this, regions));
    return;
  }

  if (delegate_)
    delegate_->OnSetDraggableRegions(regions);
}

void ClientHandler::NotifyTakeFocus(bool next) {
  if (!CURRENTLY_ON_MAIN_THREAD()) {
    // Execute this method on the main thread.
    MAIN_POST_CLOSURE(
        base::BindOnce(&ClientHandler::NotifyTakeFocus, this, next));
    return;
  }

  if (delegate_)
    delegate_->OnTakeFocus(next);
}

void ClientHandler::BuildTestMenu(CefRefPtr<CefMenuModel> model) {
  if (model->GetCount() > 0)
    model->AddSeparator();

  // Build the sub menu.
  CefRefPtr<CefMenuModel> submenu =
      model->AddSubMenu(CLIENT_ID_TESTMENU_SUBMENU, "Context Menu Test");
  submenu->AddCheckItem(CLIENT_ID_TESTMENU_CHECKITEM, "Check Item");
  submenu->AddRadioItem(CLIENT_ID_TESTMENU_RADIOITEM1, "Radio Item 1", 0);
  submenu->AddRadioItem(CLIENT_ID_TESTMENU_RADIOITEM2, "Radio Item 2", 0);
  submenu->AddRadioItem(CLIENT_ID_TESTMENU_RADIOITEM3, "Radio Item 3", 0);

  // Check the check item.
  if (test_menu_state_.check_item)
    submenu->SetChecked(CLIENT_ID_TESTMENU_CHECKITEM, true);

  // Check the selected radio item.
  submenu->SetChecked(
      CLIENT_ID_TESTMENU_RADIOITEM1 + test_menu_state_.radio_item, true);
}

bool ClientHandler::ExecuteTestMenu(int command_id) {
  if (command_id == CLIENT_ID_TESTMENU_CHECKITEM) {
    // Toggle the check item.
    test_menu_state_.check_item ^= 1;
    return true;
  } else if (command_id >= CLIENT_ID_TESTMENU_RADIOITEM1 &&
             command_id <= CLIENT_ID_TESTMENU_RADIOITEM3) {
    // Store the selected radio item.
    test_menu_state_.radio_item = (command_id - CLIENT_ID_TESTMENU_RADIOITEM1);
    return true;
  }

  // Allow default handling to proceed.
  return false;
}

void ClientHandler::SetOfflineState(CefRefPtr<CefBrowser> browser,
                                    bool offline) {
  // See DevTools protocol docs for message format specification.
  CefRefPtr<CefDictionaryValue> params = CefDictionaryValue::Create();
  params->SetBool("offline", offline);
  params->SetDouble("latency", 0);
  params->SetDouble("downloadThroughput", 0);
  params->SetDouble("uploadThroughput", 0);
  browser->GetHost()->ExecuteDevToolsMethod(
      /*message_id=*/0, "Network.emulateNetworkConditions", params);
}

void ClientHandler::FilterMenuModel(CefRefPtr<CefMenuModel> model) {
  // Evaluate from the bottom to the top because we'll be removing menu items.
  for (size_t x = model->GetCount(); x > 0; --x) {
    const auto i = x - 1;
    const auto type = model->GetTypeAt(i);
    if (type == MENUITEMTYPE_SUBMENU) {
      // Filter sub-menu and remove if empty.
      auto sub_model = model->GetSubMenuAt(i);
      FilterMenuModel(sub_model);
      if (sub_model->GetCount() == 0) {
        model->RemoveAt(i);
      }
    } else if (type == MENUITEMTYPE_SEPARATOR) {
      // A separator shouldn't be the first or last element in the menu, and
      // there shouldn't be multiple in a row.
      if (i == 0 || i == model->GetCount() - 1 ||
          model->GetTypeAt(i + 1) == MENUITEMTYPE_SEPARATOR) {
        model->RemoveAt(i);
      }
    } else if (!IsAllowedCommandId(model->GetCommandIdAt(i))) {
      model->RemoveAt(i);
    }
  }
}

bool ClientHandler::IsAllowedCommandId(int command_id) {
  // Only the commands in this array will be allowed.
  static const int kAllowedCommandIds[] = {
      // Page navigation.
      IDC_BACK,
      IDC_FORWARD,
      IDC_RELOAD,
      IDC_RELOAD_BYPASSING_CACHE,
      IDC_RELOAD_CLEARING_CACHE,
      IDC_STOP,

      // Printing.
      IDC_PRINT,

      // Edit controls.
      IDC_CONTENT_CONTEXT_CUT,
      IDC_CONTENT_CONTEXT_COPY,
      IDC_CONTENT_CONTEXT_PASTE,
      IDC_CONTENT_CONTEXT_PASTE_AND_MATCH_STYLE,
      IDC_CONTENT_CONTEXT_DELETE,
      IDC_CONTENT_CONTEXT_SELECTALL,
      IDC_CONTENT_CONTEXT_UNDO,
      IDC_CONTENT_CONTEXT_REDO,
  };
  for (size_t i = 0; i < std::size(kAllowedCommandIds); ++i) {
    if (command_id == kAllowedCommandIds[i])
      return true;
  }
  return false;
}

void ClientHandler::Undo(CefRefPtr<CefBrowser> browser) {
  auto undoBbrowser = browser ? browser : MainContext::Get()->GetWebAppBrowser();
  if (undoBbrowser) {
    auto undo_message = CefProcessMessage::Create("execute_javascript");
    auto args = undo_message->GetArgumentList();

    std::stringstream ss;
    ss << "{ let target = document.activeElement;"
       << "let targetTagName = target.tagName.toLowerCase();"
       << "if (!['input', 'textarea'].includes(targetTagName) && "
          "!target.isContentEditable) {"
       << "  gApp.stage.undoManager.undo();"
       << "}}";
    args->SetString(0, ss.str());

    undoBbrowser->GetMainFrame()->SendProcessMessage(PID_RENDERER, undo_message);

    undoBbrowser->GetFocusedFrame()->Undo();
  }
}

void ClientHandler::Redo(CefRefPtr<CefBrowser> browser) {
  auto redoBrowser = browser ? browser : MainContext::Get()->GetWebAppBrowser();
  if (redoBrowser) {
    auto redo_message = CefProcessMessage::Create("execute_javascript");
    auto args = redo_message->GetArgumentList();

    std::stringstream ss;
    ss << "{ let target = document.activeElement;"
       << "let targetTagName = target.tagName.toLowerCase();"
       << "if (!['input', 'textarea'].includes(targetTagName)  && "
          "!target.isContentEditable) {"
       << "  gApp.stage.undoManager.redo();"
       << "}}";
    args->SetString(0, ss.str());

    redoBrowser->GetMainFrame()->SendProcessMessage(PID_RENDERER, redo_message);

    redoBrowser->GetFocusedFrame()->Redo();
  }
}
}  // namespace client
