// Copyright (c) 2013 The Chromium Embedded Framework Authors. All rights
// reserved. Use of this source code is governed by a BSD-style license that
// can be found in the LICENSE file.

#include "client_app_browser.h"

#include "include/base/cef_logging.h"
#include "include/cef_cookie.h"
#include "main_message_loop_external_pump.h"
#include "../common/client_switches.h"

namespace client {

ClientAppBrowser::ClientAppBrowser() {
  CreateDelegates(delegates_);
}

// static
void ClientAppBrowser::PopulateSettings(CefRefPtr<CefCommandLine> command_line,
                                        CefSettings& settings) {
  if (!settings.multi_threaded_message_loop) {
    settings.external_message_pump =
        command_line->HasSwitch(client::switches::kExternalMessagePump);
  }

  std::vector<std::string> cookieable_schemes;
  RegisterCookieableSchemes(cookieable_schemes);
  if (!cookieable_schemes.empty()) {
    std::string list_str;
    for (const auto& scheme : cookieable_schemes) {
      if (!list_str.empty())
        list_str += ",";
      list_str += scheme;
    }
    CefString(&settings.cookieable_schemes_list) = list_str;
  }
}

void ClientAppBrowser::OnBeforeCommandLineProcessing(
    const CefString& process_type,
    CefRefPtr<CefCommandLine> command_line) {

#if defined(OS_MAC)
    command_line->AppendSwitchWithValue("show-chrome-toolbar", "none");
#endif

  // Pass additional command-line flags to the browser process.
  if (process_type.empty()) {
    if (command_line->HasSwitch(switches::kUseViews) &&
        !command_line->HasSwitch("top-chrome-md")) {
      // Use non-material mode on all platforms by default. Among other things
      // this causes menu buttons to show hover state. See usage of
      // MaterialDesignController::IsModeMaterial() in Chromium code.
      command_line->AppendSwitchWithValue("top-chrome-md", "non-material");
    }

    // Disable popup blocking for the chrome runtime.
    command_line->AppendSwitch("disable-popup-blocking");

#if defined(OS_MAC) && !defined(NDEBUG)
    // Disable the toolchain prompt on macOS, only for Debug builds
    command_line->AppendSwitch("use-mock-keychain");
#endif

    // Turn off window occlusion detection.
    // WebRtcHideLocalIpsWithMdns is used to avoid nag screen of firewall rules.
    // However it can have some nuances about security impact, it's worth to plan
    // removing this flag and creating specialised Onboard Window where User
    // explicity can give us proper Firewall Permissions.
    command_line->AppendSwitchWithValue(
        "disable-features",
        "CalculateNativeWinOcclusion,IntensiveWakeUpThrottling, "
        "TimeoutHangingVideoCaptureStarts, IPH_DemoMode, "
        "UserEducationExperienceVersion2, WebRtcHideLocalIpsWithMdns");
    command_line->AppendSwitch("disable-backgrounding-occluded-windows");

    //prevent throttling of backgrounded app
    command_line->AppendSwitch("disable-background-timer-throttling");
    command_line->AppendSwitch("disable-ipc-flooding-protection");
    command_line->AppendSwitch("disable-renderer-backgrounding");
    command_line->AppendSwitch("disable-background-media-suspend");

    // enable media streaming
	  command_line->AppendSwitch("enable-media-stream");

    //enable screen capture
    command_line->AppendSwitch("enable-usermedia-screen-capturing");
    //https://bitbucket.org/chromiumembedded/cef/issues/2993
    command_line->AppendSwitch("use-fake-ui-for-media-stream");

    // enable accessibility for renderer process for Mac.
    // Windows seems to work out the box.
    command_line->AppendSwitch("force-renderer-accessibility");

    DelegateSet::iterator it = delegates_.begin();
    for (; it != delegates_.end(); ++it)
      (*it)->OnBeforeCommandLineProcessing(this, command_line);

    // Disable timer throttling, so the virtual camera works when the app is hidden
    command_line->AppendSwitch("disable-background-timer-throttling");
  }
}

void ClientAppBrowser::OnRegisterCustomPreferences(
     cef_preferences_type_t type,
     CefRawPtr<CefPreferenceRegistrar> registrar) {
   DelegateSet::iterator it = delegates_.begin();
   for (; it != delegates_.end(); ++it)
     (*it)->OnRegisterCustomPreferences(this, type, registrar);
}

void ClientAppBrowser::OnContextInitialized() {
  DelegateSet::iterator it = delegates_.begin();
  for (; it != delegates_.end(); ++it)
    (*it)->OnContextInitialized(this);
}

void ClientAppBrowser::OnBeforeChildProcessLaunch(
    CefRefPtr<CefCommandLine> command_line) {
  DelegateSet::iterator it = delegates_.begin();
  for (; it != delegates_.end(); ++it)
    (*it)->OnBeforeChildProcessLaunch(this, command_line);
}

void ClientAppBrowser::OnScheduleMessagePumpWork(int64_t delay) {
  // Only used when `--external-message-pump` is passed via the command-line.
  MainMessageLoopExternalPump* message_pump =
      MainMessageLoopExternalPump::Get();
  if (message_pump)
    message_pump->OnScheduleMessagePumpWork(delay);
}

}  // namespace client
