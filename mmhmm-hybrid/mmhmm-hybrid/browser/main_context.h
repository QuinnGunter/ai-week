// Copyright (c) 2015 The Chromium Embedded Framework Authors. All rights
// reserved. Use of this source code is governed by a BSD-style license that
// can be found in the LICENSE file.

#pragma once

#include <set>
#include <string>

#include "include/base/cef_macros.h"
#include "include/base/cef_ref_counted.h"
#include "include/internal/cef_types_wrappers.h"
#include "../common/app_capabilities.h"
#include "../common/app_windows.h"
#include "../common/virtual_camera.h"
#include "../common/titlebar_button.h"
#include "../common/power_monitor.h"
#include "../mini-remote/shared_mini_remote_manager.h"
#include "../segmentation-panel/segmentation_panel_manager.h"
#include "../common/async_javascript_processor.h"
#include "../common/login_item_installer_browser.h"
#include "../common/window_overlay_browser.h"
#include "../common/system_video_effects_monitor_browser.h"
#include "../common/event_proxy_browser.h"
#include "../features.h"
#include "client_types.h"

#if defined (OS_WIN)
#include "../application_context.h"
#include <spdlog/spdlog.h>
#endif

namespace client {

class RootWindowManager;

// Used to store global context in the browser process. The methods of this
// class are thread-safe unless otherwise indicated.
class MainContext {
 public:
  // Returns the singleton instance of this object.
  static MainContext* Get();

  // Returns the full path to the console log file.
  virtual std::string GetConsoleLogPath() = 0;

  // Returns the full path to |file_name|.
  virtual std::string GetDownloadPath(const std::string& file_name) = 0;

  // Returns the app working directory including trailing path separator.
  virtual std::string GetAppWorkingDirectory() = 0;

  // Returns the main application URL.
  virtual std::string GetMainURL() = 0;

  // Returns the default main application URL.
  virtual std::string GetDefaultURL() const = 0;

  // Returns the user agent.
  virtual std::wstring GetUserAgent() const = 0;

  // Returns the service address.
  virtual std::wstring GetServiceConfiguration() const = 0;

  // Returns the log level for the application
  virtual cef_log_severity_t GetLogLevel() = 0;

  // Returns the background color.
  virtual cef_color_t GetBackgroundColor() = 0;
#if defined (OS_WIN)
  // Returns the logger for the application
  virtual std::shared_ptr<spdlog::logger> GetLogger() = 0;
  virtual std::shared_ptr<mmhmm::ApplicationContext> GetApplicationContext() = 0;
  virtual void OnAppClosing() = 0;
  virtual void RefreshWindowsConnectedStatus(RootWindow* window) = 0;
  virtual void CloseChildApps() = 0;
  virtual bool IsVirtualCameraInstalled() const = 0;
  virtual void InstallVirtualCamera(std::wstring application_folder) = 0;
  virtual void UninstallVirtualCamera(std::wstring application_folder) = 0;
  virtual void ReportVirtualCameraInstalled() = 0;
  virtual void ReportVirtualCameraNotInstalled() = 0;
  virtual void OnBridgeInitialized(CefRefPtr<CefBrowser> browser,
                                   CefString& build,
                                   CefString& theme,
                                   CefString& releaseTrack) = 0;
#endif

  // Returns true if the Chrome runtime will be used.
  virtual bool UseChromeRuntime() = 0;

  // Returns true if the Views framework will be used.
  virtual bool UseViews() = 0;

  // Returns true if the default popup implementation should be used.
  virtual bool UseDefaultPopup() = 0;

  virtual std::wstring GetCommandLineString() = 0;

  // Returns true if we have start up args that require processing after navigation.
  virtual bool PendingCommandLineProcessing() = 0;

  // Set the flag to indicate we have pending command line processing to do.
  virtual void SetPendingCommandLineProcessing(bool has_pending_processing) = 0;

  // Set the version string for the web app.
  virtual void SetWebAppVersion(std::string web_app_version_string) = 0;

  // Get the version string for the web app;
  virtual std::string GetWebAppVersionString() = 0;

  virtual void SetWebAppTrack(std::string track) = 0;
  virtual std::string GetWebAppTrack() = 0;
  
  virtual void SetFeatures(mmhmm::Features features) = 0;
  virtual mmhmm::Features GetFeatures() = 0;

  // Returns the browser hosting the web app. May return nullptr. Safe
  // to call from any thread.
  virtual CefRefPtr<CefBrowser> GetWebAppBrowser() = 0;

  // Populate |settings| based on command-line arguments.
  virtual void PopulateSettings(CefSettings* settings) = 0;
  virtual void PopulateBrowserSettings(CefBrowserSettings* settings) = 0;
  
  // Returns the object used to create/manage RootWindow instances.
  virtual RootWindowManager* GetRootWindowManager() const = 0;

  virtual std::string GetShortVersionString() = 0;
  virtual std::string GetTheme() const = 0;
  virtual void SetTheme(std::string theme) = 0;

  virtual void SetInitialLoadComplete(bool initial_load_complete) = 0;
  virtual bool GetInitialLoadComplete() = 0;

  virtual mmhmm::AppCapabilities GetAppCapabilities() const = 0;
  virtual void SetAppCapabilities(mmhmm::AppCapabilities app_capabilities) = 0;

  virtual mmhmm::AppWindows GetAppWindows() const = 0;
  virtual void SetAppWindows(mmhmm::AppWindows app_windows) = 0;

  virtual mmhmm::VirtualCamera GetVirtualCamera() const = 0;
  virtual void SetVirtualCamera(mmhmm::VirtualCamera virtual_camera) = 0;

  virtual mmhmm::PowerMonitor GetPowerMonitor() const = 0;
  virtual void SetPowerMonitor(mmhmm::PowerMonitor power_monitor) = 0;

  virtual mmhmm::SystemVideoEffectsStatus GetSystemVideoEffectsStatus() const = 0;
  virtual void SetSystemVideoEffectsStatus(mmhmm::SystemVideoEffectsStatus status) = 0;

  virtual mmhmm::AppMode GetAppMode() const = 0;
  virtual void SetAppMode(mmhmm::AppMode app_mode) = 0;
  virtual void RequestAppModeChange(mmhmm::AppMode app_mode) = 0;
  virtual std::optional<mmhmm::AppMode> GetStartupRequestAppMode() const = 0;
  virtual std::optional<WebAppType> GetStartupRequestWebApp() const = 0;
  virtual CefRefPtr<CefDictionaryValue> GetGHybridDictionaryRepresentation() const = 0;

  virtual CefRefPtr<mmhmm::LoginItemInstaller> GetLoginItemInstaller() const = 0;
  virtual CefRefPtr<mmhmm::WindowOverlay> GetWindowOverlay() const = 0;
  virtual CefRefPtr<mmhmm::SystemVideoEffectsMonitor> GetSystemVideoEffectsMonitor() const = 0;
  virtual CefRefPtr<mmhmm::EventProxy> GetEventProxy() const = 0;

  virtual void UpdateGHybridInFrame(CefRefPtr<CefFrame> frame) const = 0;
  virtual void SendProcessMessageToRendererProcess(CefRefPtr<CefProcessMessage> message,
                                                   std::set<WebAppType> webAppsToNotify = {}) const = 0;
  virtual void SendProcessMessageToBrowser(CefRefPtr<CefProcessMessage> message, int browserID) const = 0;
  virtual void ExecuteJavaScript(std::string javaScript, std::set<WebAppType> webAppsToExecuteIn) const = 0;
  virtual void NotifyRenderProcessOfUpdate(CefRefPtr<CefDictionaryValue> dictionary,
                                           std::string messageName,
                                           std::set<WebAppType> webAppsToNotify = {}) const = 0;
  virtual void NotifyHybridOfTitlebarButtonClicked() = 0;
  virtual void NotifyHybridOfTitlebarToolboxButtonClicked() = 0;
  virtual void NotifyHybridOfTitlebarModeSelectionChanged(mmhmm::AppMode mode) = 0;
  virtual void NotifyHybridOfLoginItemStatusChange() const = 0;
  virtual void NotifyHybridOfWebAppCallbackData(WebAppType webAppType, std::string dataString, std::string fragmentString) const = 0;
  virtual void OpenHybridApiTester(CefRefPtr<CefBrowser> browser = nullptr) const = 0;
  virtual void OpenSegmentationPanel(CefRefPtr<CefBrowser> browser = nullptr) const = 0;
  virtual void OpenToolbox(CefRefPtr<CefBrowser> browser = nullptr) const = 0;

  virtual std::shared_ptr<SharedMiniRemoteManager> GetMiniRemoteManager() = 0;
  virtual std::shared_ptr<SegmentationPanelManager> GetSegmentationPanelManager() = 0;
  virtual std::shared_ptr<mmhmm::AsyncJavascriptProcessor>
  GetAsyncJavascriptProcessor() = 0;

 protected:
  MainContext();
  virtual ~MainContext();

 private:
  DISALLOW_COPY_AND_ASSIGN(MainContext);
};

}  // namespace client
