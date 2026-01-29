// Copyright (c) 2015 The Chromium Embedded Framework Authors. All rights
// reserved. Use of this source code is governed by a BSD-style license that
// can be found in the LICENSE file.

#pragma once

#include <memory>
#include <mutex>

#include "include/base/cef_thread_checker.h"
#include "include/cef_app.h"
#include "include/cef_command_line.h"
#include "main_context.h"
#include "root_window_manager.h"
#include "../power-observer/power_observer.h"

#if defined (OS_WIN)
#include "IDriverNotifier.h"
#include "../../application_context.h"
#endif

#ifdef _MSC_VER
#pragma warning(push)
#pragma warning(disable : 4541)
#endif

namespace client {
  
#if defined (OS_WIN)
  enum class AnalyticsBehavior { sendEvent, ignoreEvent };
#endif

// Used to store global context in the browser process.
class MainContextImpl : public MainContext {
 public:
  MainContextImpl(CefRefPtr<CefCommandLine> command_line,
                  bool terminate_when_all_windows_closed, 
                  std::string short_version_number_string = "",
                  std::function<void(void)> initialized_callback = nullptr);

  // MainContext members.
  std::string GetConsoleLogPath() override;
  std::string GetDownloadPath(const std::string& file_name) override;
  std::string GetAppWorkingDirectory() override;
  std::string GetMainURL() override;
  std::string GetDefaultURL() const override;
  std::wstring GetUserAgent() const override;
  std::wstring GetServiceConfiguration() const override;
  cef_color_t GetBackgroundColor() override;
  cef_log_severity_t GetLogLevel() override;
  bool UseChromeRuntime() override;
  bool UseViews() override;
  bool UseDefaultPopup() override;
  bool PendingCommandLineProcessing() override;
  void SetPendingCommandLineProcessing(bool has_pending_processing) override;
  void SetWebAppVersion(std::string version_string) override;
  mmhmm::Features GetFeatures() override;
  void SetFeatures(mmhmm::Features features) override;
  std::string GetWebAppVersionString() override;
  void SetWebAppTrack(std::string track) override;
  std::string GetWebAppTrack() override;
  CefRefPtr<CefBrowser> GetWebAppBrowser() override;
  std::wstring GetCommandLineString() override;
  void PopulateSettings(CefSettings* settings) override;
  void PopulateBrowserSettings(CefBrowserSettings* settings) override;
  RootWindowManager* GetRootWindowManager() const override;
  void SetInitialLoadComplete(bool initial_load_complete) override;
  bool GetInitialLoadComplete() override;

  mmhmm::AppCapabilities GetAppCapabilities() const override;
  void SetAppCapabilities(mmhmm::AppCapabilities app_capabilities) override;

  mmhmm::AppWindows GetAppWindows() const override;
  void SetAppWindows(mmhmm::AppWindows app_windows) override;

  mmhmm::VirtualCamera GetVirtualCamera() const override;
  void SetVirtualCamera(mmhmm::VirtualCamera virtual_camera) override;

  mmhmm::PowerMonitor GetPowerMonitor() const override;
  void SetPowerMonitor(mmhmm::PowerMonitor power_monitor) override;

  mmhmm::SystemVideoEffectsStatus GetSystemVideoEffectsStatus() const override;
  void SetSystemVideoEffectsStatus(mmhmm::SystemVideoEffectsStatus status) override;

  mmhmm::AppMode GetAppMode() const override;
  void SetAppMode(mmhmm::AppMode app_mode) override;
  void RequestAppModeChange(mmhmm::AppMode app_mode) override;
  std::optional<mmhmm::AppMode> GetStartupRequestAppMode() const override;
  std::optional<WebAppType> GetStartupRequestWebApp() const override;

  CefRefPtr<mmhmm::LoginItemInstaller> GetLoginItemInstaller() const override;
  CefRefPtr<mmhmm::WindowOverlay> GetWindowOverlay() const override;
  CefRefPtr<mmhmm::SystemVideoEffectsMonitor> GetSystemVideoEffectsMonitor() const override;
  CefRefPtr<mmhmm::EventProxy> GetEventProxy() const override;

  CefRefPtr<CefDictionaryValue> GetGHybridDictionaryRepresentation() const override;

  void UpdateGHybridInFrame(CefRefPtr<CefFrame> frame) const override;
  void SendProcessMessageToRendererProcess(CefRefPtr<CefProcessMessage> message,
                                           std::set<WebAppType> webAppsToNotify = {}) const override;
  void SendProcessMessageToBrowser(CefRefPtr<CefProcessMessage> message, int browserID) const override;
  void ExecuteJavaScript(std::string javaScript, std::set<WebAppType> webAppsToExecuteIn) const override;
  void NotifyRenderProcessOfUpdate(CefRefPtr<CefDictionaryValue> dictionary,
                                   std::string messageName,
                                   std::set<WebAppType> webAppsToNotify = {}) const override;
  void NotifyHybridOfTitlebarButtonClicked() override;
  void NotifyHybridOfTitlebarToolboxButtonClicked() override;
  void NotifyHybridOfLoginItemStatusChange() const override;
  void NotifyHybridOfTitlebarModeSelectionChanged(mmhmm::AppMode mode) override;
  void NotifyHybridOfWebAppCallbackData(WebAppType webAppType, std::string dataString, std::string fragmentString) const override;
  void OpenHybridApiTester(CefRefPtr<CefBrowser> browser = nullptr) const override;
  void OpenSegmentationPanel(CefRefPtr<CefBrowser> browser = nullptr) const override;
  void OpenToolbox(CefRefPtr<CefBrowser> browser = nullptr) const override;

  std::shared_ptr<SharedMiniRemoteManager> GetMiniRemoteManager() override;
  std::shared_ptr<SegmentationPanelManager> GetSegmentationPanelManager() override;
  std::shared_ptr<mmhmm::AsyncJavascriptProcessor> GetAsyncJavascriptProcessor() override;

  // Initialize CEF and associated main context state. This method must be
  // called on the same thread that created this object.
  bool Initialize(const CefMainArgs& args,
                  const CefSettings& settings,
                  CefRefPtr<CefApp> application,
                  void* windows_sandbox_info);

#if defined (OS_WIN)
  std::shared_ptr<spdlog::logger> GetLogger() override;
  std::shared_ptr<mmhmm::ApplicationContext> GetApplicationContext() override;
  void OnAppClosing() override;
  bool IsVirtualCameraInstalled() const override;
  void InstallVirtualCamera(std::wstring application_folder) override;
  void UninstallVirtualCamera(std::wstring application_folder) override;
  void ReportVirtualCameraInstalled() override;
  void ReportVirtualCameraNotInstalled() override;
  void OnBridgeInitialized(CefRefPtr<CefBrowser> browser,
                           CefString& build,
                           CefString& theme,
                           CefString& releaseTrack) override;
#endif

  // Shut down CEF and associated context state. This method must be called on
  // the same thread that created this object.
  void Shutdown();

  std::string GetShortVersionString() override;
  std::string GetTheme() const override;
  void SetTheme(std::string theme) override;

 private:
  // Allow deletion via std::unique_ptr only.
  friend std::default_delete<MainContextImpl>;

  cef_log_severity_t ToCefLogSeverity(std::string level);
  void LockStateChanged(mmhmm::LockState state);
  void PowerMethodChanged(mmhmm::PowerMethod mode);
  void PowerStateChanged(mmhmm::PowerState state);
  
#if defined (OS_WIN)
  spdlog::level::level_enum ToSpdlogLevel(cef_log_severity_t level);

  std::shared_ptr<spdlog::logger> InitializeLogger(std::string location);
  void ShutdownLogger();
  void CameraConnected(mmhmmCamera::implementation::SessionParams session_params);
  void CameraActivated(mmhmmCamera::implementation::StreamParams stream_params);
  void CameraDisconnected(mmhmmCamera::implementation::SessionParams session_params);
  void CameraLog(char log[256]);
  void SendCameraDisconnect(AnalyticsBehavior analytics_behavior,
                            std::string session_id,
                            int duration_secs);
  void SendCameraConnectionMessage(std::string message_name,
                                   AnalyticsBehavior analytics_behavior,
                                   std::string client_name,
                                   std::string session_id,
                                   int duration_secs);
  mmhmmCamera::implementation::StreamParams GetCameraStreamParams();
  void RefreshWindowsConnectedStatus(RootWindow* window);
  void CloseChildApps() override;
  void AddClientToVirtualCamera(std::string client_name);
  void RemoveClientFromVirtualCamera(std::string client_name);
  void UpdateVirtualCameraState(mmhmm::VirtualCameraRawState state,
                                std::string message = "");
  void ReportVirtualCameraInstalling();
  void ReportVirtualCameraUninstalling();
  void ReportVirtualCameraDisconnected();
  void ReportVirtualCameraConnected(std::wstring client);
  void UpgradeVirtualCamera(std::wstring application_folder);
  void OnUpgradeVirtualCamera(std::wstring application_folder);
  void OnInstallVirtualCamera(std::wstring application_folder);
  void OnUninstallVirtualCamera(std::wstring application_folder);
  void OnInstallVirtualCameraComplete(
      mmhmmCamera::implementation::CameraInstallationResult result);
  void OnUninstallVirtualCameraComplete(mmhmmCamera::implementation::CameraUninstallationResult result);
#endif

  ~MainContextImpl();

  // Returns true if the context is in a valid state (initialized and not yet
  // shut down).
  bool InValidState() const { return initialized_ && !shutdown_; }

  void NotifyRenderProcessOfAppCapabilitiesUpdate();
  void NotifyRenderProcessOfVirtualCameraUpdate();

  CefRefPtr<CefCommandLine> command_line_;
  const bool terminate_when_all_windows_closed_;

  // Track context state. Accessing these variables from multiple threads is
  // safe because only a single thread will exist at the time that they're set
  // (during context initialization and shutdown).
  bool initialized_ = false;
  bool shutdown_ = false;

  std::string main_url_;
  CefString user_agent_;
  CefString service_configuration_ = "production";
  cef_color_t background_color_ = 0;
  cef_color_t browser_background_color_ = 0;
  bool has_pending_cmd_args_processing = false;
  bool use_chrome_runtime_;
  bool use_views_;
  bool initial_load_complete_ = false;
  cef_log_severity_t log_level_;
  mmhmm::AppCapabilities app_capabilities_;
  mmhmm::AppWindows app_windows_;
  mmhmm::VirtualCamera virtual_camera_;
  mmhmm::AppMode app_mode_;
  std::optional<mmhmm::AppMode> startup_request_app_mode_;
  std::optional<WebAppType> startup_request_web_app_;
  mmhmm::PowerMonitor power_monitor_;
  CefRefPtr<mmhmm::LoginItemInstaller> login_item_installer = new mmhmm::LoginItemInstaller;
  CefRefPtr<mmhmm::WindowOverlay> window_overlay = new mmhmm::WindowOverlay;
  CefRefPtr<mmhmm::SystemVideoEffectsMonitor> system_video_effects_status_monitor_ = new mmhmm::SystemVideoEffectsMonitor;
  CefRefPtr<mmhmm::EventProxy> event_proxy_ = new mmhmm::EventProxy;

  std::unique_ptr<RootWindowManager> root_window_manager_;
  std::shared_ptr<SharedMiniRemoteManager> mini_remote_manager_;
  std::shared_ptr<SegmentationPanelManager> segmentation_panel_manager_;
  std::shared_ptr<mmhmm::AsyncJavascriptProcessor> async_javascript_processor_;

#if defined(OS_WIN)
  std::shared_ptr<mmhmm::ApplicationContext> application_context_;
  std::shared_ptr<mmhmmCamera::implementation::IDriverNotifier> driver_;
  std::atomic<bool> camera_connected_ = false;
  mmhmmCamera::implementation::StreamParams camera_stream_params_;
  std::mutex connection_mutex_;
  mmhmmCamera::implementation::SessionParams camera_session_params_;
  std::chrono::system_clock::time_point session_connect_time_;
  std::shared_ptr<spdlog::logger> logger_;
#endif
  std::string console_log_path_;

  // Used to verify that methods are called on the correct thread.
  base::ThreadChecker thread_checker_;

  std::string short_version_number_string_ = "";

  std::string web_app_version_string_ = "";
  std::string web_app_track_ = "";
  mmhmm::Features supported_features_;

  mutable std::mutex capabilities_mutex_;
  mutable std::mutex virtual_camera_mutex_;
  mutable std::mutex app_mode_mutex_;
  mutable std::mutex power_monitor_mutex_;
  mutable std::mutex system_video_effects_mutex_;

  std::atomic_bool install_in_progress_ = false;
  std::function<void(void)> initialized_callback_ = nullptr;

  std::string theme_ = "light";
  std::shared_ptr<mmhmm::PowerObserver> power_observer_;

  DISALLOW_COPY_AND_ASSIGN(MainContextImpl);
};

}  // namespace client
