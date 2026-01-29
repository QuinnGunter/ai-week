// Copyright (c) 2015 The Chromium Embedded Framework Authors. All rights
// reserved. Use of this source code is governed by a BSD-style license that
// can be found in the LICENSE file.

#include <windows.h>

#include <memory>
#include <ShlObj.h>
#include <filesystem>
#include "../win/third-party/sentry/include/sentry.h"

#include "include/cef_command_line.h"
#include "include/cef_sandbox_win.h"
#include "browser/main_context_impl.h"
#include "browser/root_window_manager.h"
#include "browser/client_app_browser.h"
#include "browser/main_message_loop_external_pump.h"
#include "browser/main_message_loop_std.h"
#include "common/client_app_other.h"
#include "common/client_switches.h"
#include "renderer/client_app_renderer.h"

#include "win/app_settings_service.h"
#include "win/app_config.h"
#include "win/singleton_win.h"

#include "segmentation-warmup/SplashScreen.h"

inline constexpr char SentryDSN[] = "https://de77b03c5f534ee19bfcc88647152bf5@o405401.ingest.sentry.io/6731868";


using namespace mmhmm::segmentation::warmup;

namespace client {
namespace {
  std::unique_ptr<SplashScreen> splash_screen_;

  void OnInitialized() {
  if (splash_screen_)
    splash_screen_->Close();
  }

  // Although CEF has a command line class that has functions that can check
  // for the presence of flags, using that would cause libcef.dll to load.
  // That dll can take a long time on older machines, so we delay load it after
  // the splash screen is shown to prevent confusion for users.
  bool DoesCommandLineContainFlag(std::wstring flag) {
    LPWSTR cmd_line_ptr = GetCommandLineW();
    std::wstring args(cmd_line_ptr);
    return args.find(flag) != std::string::npos;
  }

  bool IsSilentLaunch() {
    return DoesCommandLineContainFlag(
        client::ToWideString("--"+std::string(switches::kSilent)));
  }

  bool IsBrowserProcess() {
    // Non-browser processes contain the type flag.
    return !DoesCommandLineContainFlag(L"--type");
  }

  void InitializeSentry(const std::wstring& database_path)
  {
    sentry_options_t* options = sentry_options_new();
    sentry_options_set_dsn(options, SentryDSN);
    std::string release = "mmhmm-hybrid-win@" + mmhmm::AppSettingsService::GetShortVersionString();
    sentry_options_set_release(options, release.c_str());
    sentry_options_set_environment(options, MMHMM_WIN_TRACK);
    if (not database_path.empty()) {
      sentry_options_set_database_pathw(options, database_path.c_str());
    }
    auto res = sentry_init(options);

    if (res != 0) {
      LOG(ERROR) << "Unable to initialize sentry. error code=" << res;
    }
  }
											  
  int RunMain(HINSTANCE hInstance, int nCmdShow, void* sandbox_info) {

    // libcef.dll can take up to 30secs to load.
    // Show splash screen so users are aware the app has launched and is doing something.
    // This is the entry point for all processes so only show the splash screen for the browser process.
    bool show_splash_screen = IsBrowserProcess() &&
                              !mmhmm::Singleton::IsInstanceAlreadyRunning() &&
                              !IsSilentLaunch();
    auto app_path = mmhmm::AppSettingsService::GetApplicationDirectory();
    if (show_splash_screen) {
      splash_screen_ = std::make_unique<SplashScreen>(
          (app_path + L"\\Assets\\splash.png").c_str(),
          (app_path + L"\\Assets\\waiting.gif").c_str(), nullptr);

      splash_screen_->Show();
    }

    // This is the line that causes libcef to be first loaded.
    // Anything after this point will have to wait for the full dll to load.
    CefMainArgs main_args(hInstance);

    // Parse command-line arguments.
    CefRefPtr<CefCommandLine> command_line = CefCommandLine::CreateCommandLine();
    command_line->InitFromString(::GetCommandLineW());

    if (!command_line->HasSwitch(switches::kDisableSentry)) {
      InitializeSentry(mmhmm::AppSettingsService::GetSentryDatabasePath());
      if (command_line->HasSwitch(switches::kSendTestSentryError)) {
        sentry_capture_event(sentry_value_new_message_event(
            SENTRY_LEVEL_INFO, "mmhmm", "Test event from Windows hybrid"));
      }
    }

#if defined(OS_WIN)
    command_line->AppendSwitch(switches::kUseNative);
#endif

    auto log_file_path = mmhmm::AppSettingsService::GetLogFilePath();
    if (not log_file_path.empty()) {

      if (!command_line->HasSwitch(switches::kLogFile)) {
        command_line->AppendSwitchWithValue(switches::kLogFile, log_file_path);
      }
    }

    if (!command_line->HasSwitch(switches::kLogSeverity)) {
      // default app loggin to info
      command_line->AppendSwitchWithValue(switches::kLogSeverity, L"info");
    }

    // Create a ClientApp of the correct type.
    CefRefPtr<CefApp> app;
    ClientApp::ProcessType process_type = ClientApp::GetProcessType(command_line);
    if (process_type == ClientApp::BrowserProcess)
      app = new ClientAppBrowser();
    else if (process_type == ClientApp::RendererProcess)
      app = new ClientAppRenderer();
    else if (process_type == ClientApp::OtherProcess)
      app = new ClientAppOther();

    // Execute the secondary process, if any.
    int exit_code = CefExecuteProcess(main_args, app, sandbox_info);
    if (exit_code >= 0)

      return exit_code;

    // Create the main context object.
    auto context = std::make_unique<MainContextImpl>(
        command_line, false,
        mmhmm::AppSettingsService::GetShortVersionString(),
        &OnInitialized);

    CefSettings settings;

    if (!sandbox_info) {
      settings.no_sandbox = true;
    }

    settings.log_severity = LOGSEVERITY_WARNING;
    // Populate the settings based on command line arguments.
    context->PopulateSettings(&settings);

      // Set the ID for the ICON resource that will be loaded from the main
    // executable and used when creating default Chrome windows such as DevTools
    // and Task Manager. Only used with the Chrome runtime.
#if defined(CEF_USE_BOOTSTRAP)
    // Use the default icon from bootstrap.exe.
    settings.chrome_app_icon_id = 32512;  // IDI_APPLICATION
#else
    // Use the default icon from cefclient.exe.
    settings.chrome_app_icon_id = IDR_MAINFRAME;
#endif

    auto cache_path = mmhmm::AppSettingsService::GetCachePath();
    if (not cache_path.empty())
    {
      //store cache on hdd
      CefString(&settings.cache_path).FromWString(cache_path.c_str());
    }

    // Create the main message loop object.
    std::unique_ptr<MainMessageLoop> message_loop;
    if (settings.external_message_pump)
      message_loop = MainMessageLoopExternalPump::Create();
    else
      message_loop.reset(new MainMessageLoopStd);

    // Initialize CEF.
    if (!context->Initialize(main_args, settings, app, sandbox_info))
    {
      // Release objects in reverse order of creation.
      message_loop.reset();
      context.reset();
      return CefGetExitCode();
    }

    // Run the message loop. This will block until Quit() is called by the
    // RootWindowManager after all windows have been destroyed.
    int result = message_loop->Run();

    // Shut down CEF.
    context->Shutdown();

    sentry_close();

    // Release objects in reverse order of creation.
    message_loop.reset();
    context.reset();

    return result;
  }

}  // namespace
}  // namespace client

#if defined(CEF_USE_BOOTSTRAP)

// Entry point called by bootstrap.exe when built as a DLL.
CEF_BOOTSTRAP_EXPORT int RunWinMain(HINSTANCE hInstance,
                                    LPTSTR lpCmdLine,
                                    int nCmdShow,
                                    void* sandbox_info,
                                    cef_version_info_t* version_info) {
  return client::RunMain(hInstance, nCmdShow, sandbox_info);
}

#else  // !defined(CEF_USE_BOOTSTRAP)

// Program entry point function.
int APIENTRY wWinMain(HINSTANCE hInstance,
                      HINSTANCE hPrevInstance,
                      LPTSTR lpCmdLine,
                      int nCmdShow) {
  UNREFERENCED_PARAMETER(hPrevInstance);
  UNREFERENCED_PARAMETER(lpCmdLine);
  void* sandbox_info = nullptr;

#if defined(CEF_USE_SANDBOX)
  // Manage the life span of the sandbox information object. This is necessary
  // for sandbox support on Windows. See cef_sandbox_win.h for complete details.
  CefScopedSandboxInfo scoped_sandbox;
  sandbox_info = scoped_sandbox.sandbox_info();
#endif

  return client::RunMain(hInstance, nCmdShow, sandbox_info);
}

#endif  // !defined(CEF_USE_BOOTSTRAP)
