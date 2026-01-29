// Copyright (c) 2015 The Chromium Embedded Framework Authors. All rights
// reserved. Use of this source code is governed by a BSD-style license that
// can be found in the LICENSE file.

#include "main_context_impl.h"

#include <algorithm>
#include <codecvt>
#include <filesystem>

#include "include/cef_parser.h"
#include "include/base/cef_bind.h"
#include "include/cef_version.h"
#include "../common/client_switches.h"
#include "../common/urls.h"
#include "client_app_browser.h"
#include "web_app_browser.h"

#if defined(OS_WIN)
#include <spdlog/sinks/rotating_file_sink.h>
#include <spdlog/sinks/msvc_sink.h>
#include <spdlog/fmt/ostr.h>
#include "../win/app_track.h"
#include "../win/app_settings_service.h"
#include "../mini-remote/shared_mini_remote_manager_impl.h"
#include "../segmentation-warmup/WarmupManager.h"
#include "../win/deep_link_info.h"
#elif defined (OS_MAC)
#include "Airtime-Swift-Wrapper.h"
#endif

inline const char* mmhmm_desktop_logger = "mmhmmdesktoplogger";
inline const char* mmhmm_log_name = "ActivityLog.log";
inline const char* mmhmm_log_pattern =
    "[%Y-%m-%d %T.%e] [%l] [%P/%t] [%s:%#] %v";
inline constexpr std::size_t mmhmm_log_max_size = 1048576 * 5;
inline constexpr std::size_t mmhmm_log_max_files = 3;

namespace client {

namespace {

// The default URL to load in a browser window.
// For testing the webApp locally
// const char kDefaultUrl[] = "http://localhost:8000";
// For testing with the camera canvas test app
// const char kDefaultUrl[] =
// "file:///C:/Code/mmhmmHybrid/test_site/camera_canvas_cef/index.html"; const
// char kDefaultUrl[] =
// "file:///Users/mark/git/mmhmm-hybrid/test_site/camera_canvas_cef/index.html";
const char kDefaultUrl[] = "https://app.airtimetools.com/talk";
const char kBenchmarkUrl[] = "https://web.basemark.com/";

std::wstring kTrack = L"beta";

// Returns the ARGB value for |color|.
cef_color_t ParseColor(const std::string& color) {
  std::string colorToLower;
  colorToLower.resize(color.size());
  std::transform(color.begin(), color.end(), colorToLower.begin(), ::tolower);

  if (colorToLower == "black")
    return CefColorSetARGB(255, 0, 0, 0);
  else if (colorToLower == "blue")
    return CefColorSetARGB(255, 0, 0, 255);
  else if (colorToLower == "green")
    return CefColorSetARGB(255, 0, 255, 0);
  else if (colorToLower == "red")
    return CefColorSetARGB(255, 255, 0, 0);
  else if (colorToLower == "white")
    return CefColorSetARGB(255, 255, 255, 255);

  // Use the default color.
  return 0;
}

}  // namespace

MainContextImpl::MainContextImpl(CefRefPtr<CefCommandLine> command_line,
                                 bool terminate_when_all_windows_closed,
                                 std::string short_version_number_string,
                                 std::function<void(void)> initialized_callback)
    : command_line_(command_line),
      terminate_when_all_windows_closed_(terminate_when_all_windows_closed),
      log_level_(LOGSEVERITY_INFO),
      short_version_number_string_(std::move(short_version_number_string)),
      initialized_callback_(initialized_callback) {
  DCHECK(command_line_.get());

#if defined(OS_WIN)
  application_context_ = std::make_shared<mmhmm::ApplicationContext>(
      this, mmhmm::AppTrackService::get_app_updater_track());
  mini_remote_manager_ = std::make_shared<SharedMiniRemoteManagerImpl>();

  if (command_line_->HasSwitch(switches::kAllowMiniRemoteCapture))
    application_context_->SetAllowMiniRemoteCapture(true);
#endif

  segmentation_panel_manager_ = std::make_shared<SegmentationPanelManager>();
  // Set the main URL.
  if (command_line_->HasSwitch(switches::kUrl)) {
    main_url_ = command_line_->GetSwitchValue(switches::kUrl);
  } else if (command_line_->HasSwitch(switches::kBenchmark)) {
    main_url_ = kBenchmarkUrl;
  }
  if (main_url_.empty()) {
    main_url_ = kDefaultUrl;
  }
  
  // Enable experimental Chrome runtime. See issue #2969 for details.
#ifdef CEF_ENABLE_CHROME_RUNTIME
  use_chrome_runtime_ = true;
#else
  use_chrome_runtime_ =
      !command_line_->HasSwitch(switches::kDisableChromeRuntime);
#endif

  // Whether the Views framework will be used.
  use_views_ = command_line_->HasSwitch(switches::kUseViews);

#if defined(OS_WIN) || defined(OS_LINUX)
  if (use_chrome_runtime_ && !use_views_ &&
      !command_line->HasSwitch(switches::kUseNative)) {
    LOG(WARNING) << "Chrome runtime defaults to the Views framework.";
    use_views_ = true;
  }
#else   // !(defined(OS_WIN) || defined(OS_LINUX))
  if (use_chrome_runtime_ && !use_views_) {
    // TODO(chrome): Add support for this runtime configuration (e.g. a fully
    // styled Chrome window with cefclient menu customizations). In the mean
    // time this can be demo'd with "cefsimple --enable-chrome-runtime".
    LOG(WARNING) << "Chrome runtime requires the Views framework.";
    use_views_ = true;
  }
#endif  // !(defined(OS_WIN) || defined(OS_LINUX))

  if (use_views_ && command_line->HasSwitch(switches::kHideFrame) &&
      !command_line_->HasSwitch(switches::kUrl)) {
    // Use the draggable regions test as the default URL for frameless windows.
    main_url_ = "http://tests/draggable";
  }

  if (command_line_->HasSwitch(switches::kBackgroundColor)) {
    // Parse the background color value.
    background_color_ =
        ParseColor(command_line_->GetSwitchValue(switches::kBackgroundColor));
  }

  if (background_color_ == 0 && !use_views_) {
    // Set an explicit background color.
    background_color_ = CefColorSetARGB(255, 255, 255, 255);
#if defined(OS_WIN)
    background_color_ = application_context_->GetTheme() == WindowTheme::Light
                            ? CefColorSetARGB(255, 255, 255, 255)
                            : CefColorSetARGB(255, 22, 22, 26);
#endif
  }

  if (command_line_->HasSwitch(switches::kDisableNativeSegmentation)) {
    app_capabilities_.nativeSeg = false;
  }

  if (command_line_->HasSwitch(switches::kAppMode)) {
    startup_request_app_mode_ = mmhmm::AppModeFromString(
        command_line_->GetSwitchValue(switches::kAppMode));
  }

  if (command_line_->HasSwitch(switches::kWebApp)) {
    startup_request_web_app_ = mmhmm::WebAppFromString(
        command_line_->GetSwitchValue(switches::kWebApp));
  }

  async_javascript_processor_ =
      std::make_shared<mmhmm::AsyncJavascriptProcessor>();

  power_observer_ = mmhmm::PowerObserver::Create(std::bind(&MainContextImpl::PowerStateChanged,
                                             this, std::placeholders::_1),
                                   std::bind(&MainContextImpl::PowerMethodChanged,
                                             this, std::placeholders::_1),
                                   std::bind(&MainContextImpl::LockStateChanged,
                                             this, std::placeholders::_1));
}

MainContextImpl::~MainContextImpl() {
  // The context must either not have been initialized, or it must have also
  // been shut down.
  DCHECK(!initialized_ || shutdown_);
#if defined(OS_WIN)
  MainContext::Get()->OnAppClosing();
#endif
}

std::string MainContextImpl::GetConsoleLogPath() {
  if (!console_log_path_.empty())
    return console_log_path_;
  else
    return GetAppWorkingDirectory() + "console.log";
}

std::string MainContextImpl::GetMainURL() {
  return main_url_;
}

std::string MainContextImpl::GetDefaultURL() const {
  return kDefaultUrl;
}

std::wstring MainContextImpl::GetUserAgent() const {
  return user_agent_.ToWString();
}

std::wstring MainContextImpl::GetServiceConfiguration() const {
  return service_configuration_.ToWString();
}

#if defined(OS_WIN)
std::shared_ptr<mmhmm::ApplicationContext>
MainContextImpl::GetApplicationContext() {
  return application_context_;
}
#endif

cef_color_t MainContextImpl::GetBackgroundColor() {
  return background_color_;
}

bool MainContextImpl::UseChromeRuntime() {
  return use_chrome_runtime_;
}

bool MainContextImpl::UseViews() {
  return use_views_;
}

bool MainContextImpl::UseDefaultPopup() {
  return command_line_->HasSwitch(switches::kUseDefaultPopup);
}

bool MainContextImpl::PendingCommandLineProcessing() {
  return has_pending_cmd_args_processing;
}

void MainContextImpl::SetPendingCommandLineProcessing(
    bool has_pending_processing) {
  has_pending_cmd_args_processing = has_pending_processing;
}

void MainContextImpl::SetWebAppVersion(std::string web_app_version_string) {
  web_app_version_string_ = web_app_version_string;
}

std::string MainContextImpl::GetWebAppVersionString() {
  return web_app_version_string_;
}

void MainContextImpl::SetWebAppTrack(std::string track) {
  web_app_track_ = track;
}

std::string MainContextImpl::GetWebAppTrack() {
  return web_app_track_;
}

CefRefPtr<CefBrowser> MainContextImpl::GetWebAppBrowser() {
  auto* rootWindowManager = GetRootWindowManager();
  if (!rootWindowManager) {
    return nullptr;
  }

  return rootWindowManager->GetWebAppBrowser();
}

void MainContextImpl::SetInitialLoadComplete(bool initial_load_complete) {
  initial_load_complete_ = initial_load_complete;

#if defined(OS_WIN)
  if (IsVirtualCameraInstalled()) {

    if (driver_->DriverNeedsUpdate(
            mmhmm::AppSettingsService::GetApplicationDirectory()) ==
        mmhmmCamera::implementation::DriverNeedsUpdateResult::yes) {
      UpgradeVirtualCamera(
          mmhmm::AppSettingsService::GetApplicationDirectory());
      GetLogger()->info("Updating virtual camera driver.");
    } else {
      GetLogger()->info("Virtual camera driver does not require an update.");
    }
  } else {
    ReportVirtualCameraNotInstalled();
  }

    if (camera_connected_) {
      auto camera_stream_params = GetCameraStreamParams();
      CameraActivated(camera_stream_params);
    } else {
      SendCameraDisconnect(AnalyticsBehavior::ignoreEvent, std::string(), 0);
    }
#endif
}

bool MainContextImpl::GetInitialLoadComplete() {
  return initial_load_complete_;
}

std::wstring MainContextImpl::GetCommandLineString() {
  return command_line_->GetCommandLineString().ToWString();
}

void MainContextImpl::PopulateSettings(CefSettings* settings) {
  client::ClientAppBrowser::PopulateSettings(command_line_, *settings);

  CefString(&settings->cache_path) =
      command_line_->GetSwitchValue(switches::kCachePath);

  if (browser_background_color_ != 0)
    settings->background_color = browser_background_color_;

  if (command_line_->HasSwitch("lang")) {
    // Use the same locale for the Accept-Language HTTP request header.
    CefString(&settings->accept_language_list) =
        command_line_->GetSwitchValue("lang");
  }

  if (command_line_->HasSwitch(switches::kLogFile)) {
    CefString(&settings->log_file) =
        command_line_->GetSwitchValue(switches::kLogFile);
  }

  if (command_line_->HasSwitch(switches::kLogSeverity)) {
    settings->log_severity =
        ToCefLogSeverity(command_line_->GetSwitchValue(switches::kLogSeverity));
    log_level_ = settings->log_severity;
  }

  user_agent_ = "Chrome/" + std::to_string(CHROME_VERSION_MAJOR) + ".0.0.0 " +
                "Airtime/" + GetShortVersionString();
  CefString(&settings->user_agent_product) = user_agent_;

  if (command_line_->HasSwitch(switches::kServiceConfiguration)) {
    service_configuration_ = command_line_->GetSwitchValue(switches::kServiceConfiguration);
  }
}

void MainContextImpl::PopulateBrowserSettings(CefBrowserSettings* settings) {
  if (browser_background_color_ != 0) {
    settings->background_color = browser_background_color_;
  }

  settings->chrome_status_bubble = STATE_DISABLED;
  settings->chrome_zoom_bubble = STATE_DISABLED;
}

cef_log_severity_t MainContextImpl::GetLogLevel() {
  return log_level_;
}

RootWindowManager* MainContextImpl::GetRootWindowManager() const {
  DCHECK(InValidState());
  return root_window_manager_.get();
}

bool MainContextImpl::Initialize(const CefMainArgs& args,
                                 const CefSettings& settings,
                                 CefRefPtr<CefApp> application,
                                 void* windows_sandbox_info) {
  DCHECK(thread_checker_.CalledOnValidThread());
  DCHECK(!initialized_);
  DCHECK(!shutdown_);

  log_level_ = settings.log_severity;

#if defined(OS_WIN)
  if (settings.log_file.length > 0) {
    logger_ = InitializeLogger(CefString(&settings.log_file).ToString());
    console_log_path_ = CefString(&settings.log_file).ToString();
  }
  
  application_context_->CreateMixpanelService();

  const bool should_activate = !command_line_->HasSwitch(switches::kNoActivate);
  if(!application_context_->StartProcess(command_line_, should_activate)) {
    return false;
  }

  driver_ =
      mmhmmCamera::implementation::IDriverNotifier::CreateDriverNotifier();
  driver_->SetConnectedCallback(std::bind(&MainContextImpl::CameraConnected,
                                          this, std::placeholders::_1));
  driver_->SetStreamActiveCallback(std::bind(&MainContextImpl::CameraActivated,
                                             this, std::placeholders::_1));
  driver_->SetDisconnectedCallback(std::bind(
      &MainContextImpl::CameraDisconnected, this, std::placeholders::_1));
  driver_->SetLogCallback(
      std::bind(&MainContextImpl::CameraLog, this, std::placeholders::_1));

  // Initialize empty camera params.
  camera_session_params_ =
      mmhmmCamera::implementation::SessionParams::CreateSessionParams();
  camera_stream_params_ =
      mmhmmCamera::implementation::StreamParams::CreateStreamParams();

    auto main_window = mmhmm::MainAppWindow(false, false);
    auto app_windows = mmhmm::AppWindows(main_window);
    SetAppWindows(app_windows);

    auto power_monitor = mmhmm::PowerMonitor();
    power_monitor.lockState = power_observer_->GetLockState();
    power_monitor.powerMethod = power_observer_->GetPowerMethod();
    power_monitor.powerState = power_observer_->GetPowerState();
    SetPowerMonitor(power_monitor);

    auto virtual_camera = GetVirtualCamera();
    virtual_camera.state = IsVirtualCameraInstalled()
                                 ? mmhmm::VirtualCameraState(mmhmm::VirtualCameraRawState::installed, "")
                                 : mmhmm::VirtualCameraState(mmhmm::VirtualCameraRawState::notInstalled, "");
    SetVirtualCamera(virtual_camera);

  auto app_capabilities = GetAppCapabilities();
  app_capabilities.camera.state =
      mmhmm::CaptureDeviceState(mmhmm::CaptureDeviceRawState::authorized, "");
  app_capabilities.microphone.state =
      mmhmm::CaptureDeviceState(mmhmm::CaptureDeviceRawState::authorized, "");
  SetAppCapabilities(app_capabilities);

  mmhmm::AppSettingsService::SetLog(logger_);
  mmhmm::AppSettingsService::LoadSettings();

      

  // Warm up model cache and evaluate best segmentation engine.
  // It's better do to that before assembling main_url as segmentation is a part
  // of tracked statistic.
  mmhmm::segmentation::warmup::WarmupManager warmupManager(logger_);

  warmupManager.WarmModels();

  // Load stored settings if they exist
  mmhmm::AppSettingsService::LoadSettings();
  AppSettingsService::FetchUrls(AppTrackService::get_web_client_urls_key(),
                                GetUserAgent());

  // Build final url only if url switch was not passed as start up command
  if (main_url_ == kDefaultUrl) {

    startup_request_web_app_ = AppSettingsService::GetLaunchWebAppType(
        startup_request_web_app_, should_activate ? AppLaunchTrigger::user : AppLaunchTrigger::virtual_camera);

    auto service_provided_url_str =
        AppSettingsService::GetUrlByAppType(startup_request_web_app_.value());

    if (!service_provided_url_str.empty()) {
      main_url_ = client::ToNarrowString(service_provided_url_str);
    } else {
      main_url_ = kDefaultUrl;
    }
  }
#endif

  initialized_ =
      CefInitialize(args, settings, application, windows_sandbox_info);

#if defined(OS_WIN)
  // This has to happen after CefInitialize is called.
  // During CefInitialize DoSchemeModificationPreamble is called and locks the scheme registry. 
  // If the CefUrlParser has been used before this the registry has already been locked and a crash happens in debug. 
  DeepLinkInfo deep_link(command_line_->GetCommandLineString().ToString());

  if (deep_link.IsValid()) {
    SetPendingCommandLineProcessing(true);
  }

  if (deep_link.GetTargetApp() == TargetApp::camera) {
    SetAppMode(AppMode::Mini);
  } else if (deep_link.GetTargetApp() == TargetApp::creator) {
    SetAppMode(AppMode::Full);
  }
#endif

  // Need to create the RootWindowManager after calling CefInitialize because
  // TempWindowX11 uses cef_get_xdisplay().
  if (initialized_) {
    root_window_manager_.reset(
        new RootWindowManager(terminate_when_all_windows_closed_));
  }

  if (initialized_callback_) {
    initialized_callback_();
  }

  #if defined(OS_WIN)
  if (!command_line_->HasSwitch(switches::kSilent)) {
    application_context_->LaunchWebApp(startup_request_web_app_.value());
  }
  #endif

  return initialized_;
}

mmhmm::AppCapabilities MainContextImpl::GetAppCapabilities() const {
  std::lock_guard<std::mutex> lock(capabilities_mutex_);
  return app_capabilities_;
}

void MainContextImpl::SetAppCapabilities(
    mmhmm::AppCapabilities app_capabilities) {
  std::lock_guard<std::mutex> lock(capabilities_mutex_);
  app_capabilities_ = app_capabilities;
  NotifyRenderProcessOfUpdate(app_capabilities.ToCefDictionary(),
                              "reportAppCapabilities");
}

mmhmm::AppWindows MainContextImpl::GetAppWindows() const {
  std::lock_guard<std::mutex> lock(capabilities_mutex_);
  return app_windows_;
}

void MainContextImpl::SetAppWindows(mmhmm::AppWindows app_windows) {
  std::lock_guard<std::mutex> lock(capabilities_mutex_);
  app_windows_ = app_windows;
  NotifyRenderProcessOfUpdate(app_windows_.ToCefDictionary(),
                              "reportAppWindows");
}

mmhmm::VirtualCamera MainContextImpl::GetVirtualCamera() const {
  std::lock_guard<std::mutex> lock(virtual_camera_mutex_);
  return virtual_camera_;
}

mmhmm::PowerMonitor MainContextImpl::GetPowerMonitor() const {
  std::lock_guard<std::mutex> lock(power_monitor_mutex_);
  return power_monitor_;
}

mmhmm::AppMode MainContextImpl::GetAppMode() const {
  std::lock_guard<std::mutex> lock(app_mode_mutex_);
  return app_mode_;
}

void MainContextImpl::SetAppMode(mmhmm::AppMode app_mode) {
  std::lock_guard<std::mutex> lock(app_mode_mutex_);
  app_mode_ = app_mode;
}

void MainContextImpl::RequestAppModeChange(mmhmm::AppMode app_mode) {
  if (!CURRENTLY_ON_MAIN_THREAD()) {
    MAIN_POST_CLOSURE(base::BindOnce(&MainContextImpl::RequestAppModeChange,
                                     base::Unretained(this), app_mode));
    return;
  }
  NotifyHybridOfTitlebarModeSelectionChanged(app_mode);
  DCHECK(0);
}

std::optional<mmhmm::AppMode> MainContextImpl::GetStartupRequestAppMode() const {
  return startup_request_app_mode_;
}

std::optional<WebAppType> MainContextImpl::GetStartupRequestWebApp() const {
  return startup_request_web_app_;
}

void MainContextImpl::SetVirtualCamera(mmhmm::VirtualCamera virtual_camera) {
  std::lock_guard<std::mutex> lock(virtual_camera_mutex_);
  virtual_camera_ = virtual_camera;
  NotifyRenderProcessOfUpdate(virtual_camera.ToCefDictionary(),
                              "reportVirtualCamera");
}

CefRefPtr<CefDictionaryValue> MainContextImpl::GetGHybridDictionaryRepresentation() const {
  CefRefPtr<CefDictionaryValue> dictionary = CefDictionaryValue::Create();
  dictionary->SetDictionary(mmhmm::AppCapabilities::dictionaryKey, GetAppCapabilities().ToCefDictionary());
  dictionary->SetDictionary(mmhmm::AppWindows::dictionaryKey, GetAppWindows().ToCefDictionary());
  dictionary->SetDictionary(mmhmm::VirtualCamera::dictionaryKey, GetVirtualCamera().ToCefDictionary());
  dictionary->SetDictionary(mmhmm::Titlebar::dictionaryKey, mmhmm::Titlebar(GetAppMode()).ToCefDictionary());
  dictionary->SetDictionary(mmhmm::PowerMonitor::dictionaryKey,
                            GetPowerMonitor().ToCefDictionary());
  GetLoginItemInstaller()->AddToDictionary(dictionary);
  GetWindowOverlay()->AddToDictionary(dictionary);
  GetSystemVideoEffectsMonitor()->AddToDictionary(dictionary);
  GetEventProxy()->AddToDictionary(dictionary);
  return dictionary;
}

void MainContextImpl::UpdateGHybridInFrame(CefRefPtr<CefFrame> frame) const {
  if (!CURRENTLY_ON_MAIN_THREAD()) {
    MAIN_POST_CLOSURE(
        base::BindOnce(&MainContextImpl::UpdateGHybridInFrame,
                       base::Unretained(this), frame));
    return;
  }

  auto gHybridDictionary = GetGHybridDictionaryRepresentation();
  auto message = CefProcessMessage::Create("updateGHybrid");
  auto arguments = message->GetArgumentList();
  arguments->SetDictionary(0, gHybridDictionary);

  frame->SendProcessMessage(PID_RENDERER, message->Copy());
}

void MainContextImpl::SetPowerMonitor(mmhmm::PowerMonitor power_monitor) {
  std::lock_guard<std::mutex> lock(power_monitor_mutex_);
  power_monitor_ = power_monitor;
  NotifyRenderProcessOfUpdate(power_monitor.ToCefDictionary(),
                              "reportPowerMonitor");
}

mmhmm::SystemVideoEffectsStatus MainContextImpl::GetSystemVideoEffectsStatus() const {
  std::lock_guard<std::mutex> lock(system_video_effects_mutex_);
  return system_video_effects_status_monitor_->GetStatus();
}

void MainContextImpl::SetSystemVideoEffectsStatus(mmhmm::SystemVideoEffectsStatus status) {
  std::lock_guard<std::mutex> lock(system_video_effects_mutex_);
  system_video_effects_status_monitor_->SetStatus(status);
  system_video_effects_status_monitor_->ReportStateUpdate();
}

CefRefPtr<mmhmm::LoginItemInstaller> MainContextImpl::GetLoginItemInstaller() const {
  return login_item_installer;
}

CefRefPtr<mmhmm::WindowOverlay> MainContextImpl::GetWindowOverlay() const {
  return window_overlay;
}

CefRefPtr<mmhmm::SystemVideoEffectsMonitor> MainContextImpl::GetSystemVideoEffectsMonitor() const {
  std::lock_guard<std::mutex> lock(system_video_effects_mutex_);
  return system_video_effects_status_monitor_;
}

CefRefPtr<mmhmm::EventProxy> MainContextImpl::GetEventProxy() const {
  return event_proxy_;
}

void MainContextImpl::NotifyHybridOfTitlebarButtonClicked() {
  NotifyRenderProcessOfUpdate(nullptr, "reportTitlebarButtonClicked");
}

void MainContextImpl::NotifyHybridOfTitlebarToolboxButtonClicked() {
  NotifyRenderProcessOfUpdate(nullptr, "reportTitlebarToolboxButtonClicked");
}

void MainContextImpl::NotifyHybridOfTitlebarModeSelectionChanged(mmhmm::AppMode mode) {
  auto dictionary = mmhmm::AppModeToCefDictionary(mode);
  NotifyRenderProcessOfUpdate(dictionary, "reportTitlebarModeSelectionChanged");
}

void MainContextImpl::NotifyHybridOfLoginItemStatusChange() const {
  login_item_installer->ReportStateUpdate();
}

void MainContextImpl::NotifyHybridOfWebAppCallbackData(WebAppType webAppType, std::string dataString, std::string fragmentString) const {
  CefRefPtr<CefDictionaryValue> dictionary = CefDictionaryValue::Create();
  dictionary->SetString("callbackData", dataString);
  dictionary->SetString("fragmentData", fragmentString);
  NotifyRenderProcessOfUpdate(dictionary, "reportWebAppCallbackData", std::set{webAppType});
}

void MainContextImpl::NotifyRenderProcessOfUpdate(CefRefPtr<CefDictionaryValue> dictionary,
                                                  std::string messageName,
                                                  std::set<WebAppType> webAppsToNotify) const {
      auto message = CefProcessMessage::Create(messageName);
      if (dictionary != nullptr) {
        auto arguments = message->GetArgumentList();
        arguments->SetDictionary(0, dictionary);
      }
      SendProcessMessageToRendererProcess(message, webAppsToNotify);
}

void MainContextImpl::SendProcessMessageToRendererProcess(CefRefPtr<CefProcessMessage> message, std::set<WebAppType> webAppsToNotify) const {
  if (!CURRENTLY_ON_MAIN_THREAD()) {
    MAIN_POST_CLOSURE(
        base::BindOnce(&MainContextImpl::SendProcessMessageToRendererProcess,
                       base::Unretained(this), message, webAppsToNotify));
    return;
  }

  auto* rootWindowManager = GetRootWindowManager();
  if (!rootWindowManager) {
    return;
  }

  // If no specific web apps were specified, notify all web apps
  // expecting general updates, e.g. for `gHybrid`.
  if (webAppsToNotify.empty()) {
    webAppsToNotify = std::set{
      WebAppType::camera,
      WebAppType::creator,
      WebAppType::hybrid_api_tester,
      WebAppType::local_host,
      WebAppType::mmhmm,
      WebAppType::screen_recorder,
      WebAppType::stacks,
    };
  }

  for (auto webApp : webAppsToNotify) {
    if (auto window = rootWindowManager->GetWindowByWebAppType(webApp);
        window != nullptr) {
      if (auto browser = window->GetBrowser(); browser != nullptr) {
        if (auto mainFrame = browser->GetMainFrame(); mainFrame != nullptr) {
          // Sending a message consumes it, thus requiring a copy when sending a
          // message more than once.
          mainFrame->SendProcessMessage(PID_RENDERER, message->Copy());
        }
      }
    }
  }
}

void MainContextImpl::SendProcessMessageToBrowser(CefRefPtr<CefProcessMessage> message, int browserID) const {
  if (!CURRENTLY_ON_MAIN_THREAD()) {
    MAIN_POST_CLOSURE(
        base::BindOnce(&MainContextImpl::SendProcessMessageToBrowser,
                       base::Unretained(this), message, browserID));
    return;
  }

  auto* rootWindowManager = GetRootWindowManager();
  if (!rootWindowManager) {
    return;
  }

  if (auto window = rootWindowManager->GetWindowForBrowser(browserID); window != nullptr) {
    if (auto browser = window->GetBrowser(); browser != nullptr) {
      if (auto mainFrame = browser->GetMainFrame(); mainFrame != nullptr) {
        mainFrame->SendProcessMessage(PID_RENDERER, message->Copy());
      }
    }
  }
}

void MainContextImpl::ExecuteJavaScript(std::string javaScript, std::set<WebAppType> webAppsToExecuteIn) const {
  if (!CURRENTLY_ON_MAIN_THREAD()) {
    MAIN_POST_CLOSURE(
        base::BindOnce(&MainContextImpl::ExecuteJavaScript,
                       base::Unretained(this), javaScript, webAppsToExecuteIn));
    return;
  }
  auto* rootWindowManager = GetRootWindowManager();
  if (!rootWindowManager) {
    return;
  }
  for (auto webApp : webAppsToExecuteIn) {
    if (auto window = rootWindowManager->GetWindowByWebAppType(webApp); window != nullptr) {
      if (auto browser = window->GetBrowser(); browser != nullptr) {
        if (auto mainFrame = browser->GetMainFrame(); mainFrame != nullptr) {
          mainFrame->ExecuteJavaScript(javaScript, mainFrame->GetURL(), 0);
        }
      }
    }
  }
}

cef_log_severity_t MainContextImpl::ToCefLogSeverity(std::string level) {
  if (level == "default")
    return LOGSEVERITY_DEFAULT;
  else if (level == "verbose")
    return LOGSEVERITY_VERBOSE;
  else if (level == "debug")
    return LOGSEVERITY_DEBUG;
  else if (level == "info")
    return LOGSEVERITY_INFO;
  else if (level == "warning")
    return LOGSEVERITY_WARNING;
  else if (level == "error")
    return LOGSEVERITY_ERROR;
  else if (level == "fatal")
    return LOGSEVERITY_FATAL;
  else
    return LOGSEVERITY_DISABLE;
}
void MainContextImpl::Shutdown() {
  DCHECK(thread_checker_.CalledOnValidThread());
  DCHECK(initialized_);
  DCHECK(!shutdown_);

#if defined(OS_WIN)
  ShutdownLogger();
#endif

  root_window_manager_.reset();

  CefShutdown();

  shutdown_ = true;
}

std::string MainContextImpl::GetShortVersionString() {
  return short_version_number_string_;
}

std::string MainContextImpl::GetTheme() const{
  return theme_;
}

void MainContextImpl::SetTheme(std::string theme) {
  theme_ = theme;
}

std::shared_ptr<SharedMiniRemoteManager>
MainContextImpl::GetMiniRemoteManager() {
  return mini_remote_manager_;
}

std::shared_ptr<SegmentationPanelManager>
MainContextImpl::GetSegmentationPanelManager() {
  return segmentation_panel_manager_;
}

std::shared_ptr<mmhmm::AsyncJavascriptProcessor>
MainContextImpl::GetAsyncJavascriptProcessor() {
  return async_javascript_processor_;
}

mmhmm::Features MainContextImpl::GetFeatures() {
  return supported_features_;
}

void MainContextImpl::SetFeatures(mmhmm::Features features) {
  supported_features_ = features;
}

void MainContextImpl::OpenHybridApiTester(CefRefPtr<CefBrowser> browser) const {
  auto context = client::MainContext::Get();
  if (!context)
    return;

  auto message = CefProcessMessage::Create("launch_url");
  auto args = message->GetArgumentList();
  args->SetString(0, mmhmm::urls::HybridApiTesterUrl);
  args->SetString(1, "width=600,height=800");

  if (!browser) {
    browser = root_window_manager_->GetWebAppBrowser();
  }

  if (browser && browser->GetMainFrame()) {
    browser->GetMainFrame()->SendProcessMessage(PID_RENDERER, message);
  }
}

void MainContextImpl::OpenSegmentationPanel(
    CefRefPtr<CefBrowser> browser) const {
  auto context = client::MainContext::Get();
  if (!context)
    return;

  auto message = CefProcessMessage::Create("launch_url");
  auto args = message->GetArgumentList();
  args->SetString(0, mmhmm::urls::SegmentationPanelUrl);
  args->SetString(1, "width=800,height=900");

  if (!browser) {
    browser = root_window_manager_->GetWebAppBrowser();
  }

  if (browser && browser->GetMainFrame()) {
    browser->GetMainFrame()->SendProcessMessage(PID_RENDERER, message);
  }
}

void MainContextImpl::OpenToolbox(CefRefPtr<CefBrowser> browser) const {
  auto context = client::MainContext::Get();
  if (!context)
    return;

  if (root_window_manager_->GetWindowByWebAppType(WebAppType::toolbox) !=
      nullptr)
    return;

  auto message = CefProcessMessage::Create("launch_url");
  auto args = message->GetArgumentList();

#if defined(OS_WIN)
  std::string url = client::ToNarrowString(AppSettingsService::GetUrlByAppType(WebAppType::toolbox));
#elif defined(OS_MAC)
  std::string url = mmhmm::urls::ToolboxUrl + "?theme=" + GetTheme();
#endif
  args->SetString(0, url);
  args->SetString(1, "width=500,height=450");

  if (!browser) {
    browser = root_window_manager_->GetWebAppBrowser();
  }

  if (browser && browser->GetMainFrame()) {
    browser->GetMainFrame()->SendProcessMessage(PID_RENDERER, message);
  }
}

void MainContextImpl::LockStateChanged(mmhmm::LockState state) {
  auto power_monitor = GetPowerMonitor();
  power_monitor.lockState = state;
  SetPowerMonitor(power_monitor);
}

void MainContextImpl::PowerMethodChanged(mmhmm::PowerMethod method) {
  auto power_monitor = GetPowerMonitor();
  power_monitor.powerMethod = method;
  SetPowerMonitor(power_monitor);
}

void MainContextImpl::PowerStateChanged(mmhmm::PowerState state) {
  auto power_monitor = GetPowerMonitor();
  power_monitor.powerState = state;
  SetPowerMonitor(power_monitor);
}

#if defined(OS_WIN)
void MainContextImpl::CameraConnected(
    mmhmmCamera::implementation::SessionParams session_params) {
  {
    std::scoped_lock lock(connection_mutex_);
    camera_session_params_ = session_params;
  }
}

void MainContextImpl::CameraActivated(
    mmhmmCamera::implementation::StreamParams stream_params) {
  mmhmmCamera::implementation::SessionParams camera_session_params;
  {
    std::scoped_lock lock(connection_mutex_);
    camera_connected_.store(true);
    camera_stream_params_ = stream_params;
    camera_session_params = camera_session_params_;
    session_connect_time_ = std::chrono::system_clock::now();
  }
  SendCameraConnectionMessage("camera_app_connected",
                              AnalyticsBehavior::ignoreEvent,
                              std::string(stream_params.clientName),
                              camera_session_params.sessionId, 0);

  AddClientToVirtualCamera(std::string(stream_params.clientName));

  application_context_->SendCameraConnectMessage(
      client::ToWideString(stream_params.clientName),
      client::ToWideString(camera_session_params.sessionId), 0,
      client::ToWideString(GetWebAppVersionString()),
      client::ToWideString(GetWebAppTrack()));

  ReportVirtualCameraConnected(client::ToWideString(stream_params.clientName));
}

void MainContextImpl::CameraDisconnected(
    mmhmmCamera::implementation::SessionParams session_params) {
  mmhmmCamera::implementation::StreamParams stream_params;
  {
    std::scoped_lock lock(connection_mutex_);
    stream_params = camera_stream_params_;
    camera_connected_.store(false);
  }
  std::string sessionId = std::string(session_params.sessionId);
  auto session_ms = std::chrono::milliseconds(session_params.sessionDuration);
  auto session_secs =
      std::chrono::duration_cast<std::chrono::seconds>(session_ms);

  RemoveClientFromVirtualCamera(std::string(stream_params.clientName));

  SendCameraDisconnect(AnalyticsBehavior::ignoreEvent, sessionId,
                       session_secs.count());
  application_context_->SendCameraDisconnectMessage(
      client::ToWideString(stream_params.clientName),
      client::ToWideString(sessionId), session_secs.count(),
      client::ToWideString(GetWebAppVersionString()),
      client::ToWideString(GetWebAppTrack()));

  ReportVirtualCameraDisconnected();
}

void MainContextImpl::CameraLog(char log[256]) {
  std::string cameraLog(log);
  cameraLog = std::string("[camera driver] ") + cameraLog;
  logger_->info(cameraLog);
}
void MainContextImpl::SendCameraDisconnect(AnalyticsBehavior analytics_behavior,
                                           std::string session_id,
                                           int duration_secs) {
  camera_connected_.store(false);
  SendCameraConnectionMessage("camera_app_disconnected", analytics_behavior,
                              std::string(), session_id, duration_secs);
}

void MainContextImpl::SendCameraConnectionMessage(
    std::string message_name,
    AnalyticsBehavior analytics_behavior,
    std::string client_name,
    std::string session_id,
    int duration_secs) {
  // Camera connection messages from IDriverNotifier are comming from separate
  // thread. Considering we are making operations on RootWindow it's better to
  // redirect this call into main thread.
  if (!CefCurrentlyOn(TID_UI)) {
    CefPostTask(
        TID_UI,
        base::BindOnce(&MainContextImpl::SendCameraConnectionMessage,
                       base::Unretained(this), message_name, analytics_behavior,
                       std::move(client_name), session_id, duration_secs));
    return;
  }
  auto window_manager = GetRootWindowManager();
  if (not window_manager)
    return;

  auto root_window = window_manager->GetWindowByWebAppType(WebAppType::mmhmm);
  if (not root_window)
    return;

  auto web_app = root_window->GetBrowser();

  if (not web_app)
    return;

  nlohmann::json json;
  json["appID"] = client_name;
  json["appName"] = "windows.hybrid.app";

  const auto connected_message = CefProcessMessage::Create(message_name);
  const auto args = connected_message->GetArgumentList();
  args->SetString(0, json.dump());
  args->SetBool(1, true);  // first
  args->SetBool(2, analytics_behavior ==
                       AnalyticsBehavior::sendEvent);  // should send analytics

  web_app->GetMainFrame()->SendProcessMessage(PID_RENDERER, connected_message);
}

void MainContextImpl::OnAppClosing() {
  if (!camera_connected_ || !application_context_) {
    return;
  }

  mmhmmCamera::implementation::SessionParams session_params;
  mmhmmCamera::implementation::StreamParams stream_params;

  {
    std::scoped_lock lock(connection_mutex_);
    session_params = camera_session_params_;
    session_params.sessionDuration =
        std::chrono::duration_cast<std::chrono::milliseconds>(
            std::chrono::system_clock::now() - session_connect_time_)
            .count();

    stream_params = camera_stream_params_;
    camera_connected_.store(false);
  }

  const std::string sessionId(session_params.sessionId);
  const auto session_ms =
      std::chrono::milliseconds(session_params.sessionDuration);
  const auto session_secs =
      std::chrono::duration_cast<std::chrono::seconds>(session_ms);

  application_context_->SendCameraDisconnectMessage(
      client::ToWideString(stream_params.clientName),
      client::ToWideString(sessionId), session_secs.count(),
      client::ToWideString(GetWebAppVersionString()),
      client::ToWideString(GetWebAppTrack()));
}

bool MainContextImpl::IsVirtualCameraInstalled() const {
  if (driver_) {
    return driver_->CameraInstalled();
  }
  return false;
}

void MainContextImpl::InstallVirtualCamera(std::wstring application_folder) {
  if (install_in_progress_.exchange(true))
    return;

  ReportVirtualCameraInstalling();

  application_context_->SendCameraInstallationEvent(
      mmhmm::MixPanelEventType::cameraInstallationAttempted,
      client::ToWideString(GetWebAppVersionString()),
      client::ToWideString(GetWebAppTrack()), L"");

  CefPostTask(TID_FILE_USER_BLOCKING,
              base::BindOnce(&MainContextImpl::OnInstallVirtualCamera,
                             base::Unretained(this), application_folder));
}

void MainContextImpl::UninstallVirtualCamera(std::wstring application_folder) {
  if (install_in_progress_.exchange(true))
    return;

  ReportVirtualCameraUninstalling();

  CefPostTask(TID_FILE_USER_BLOCKING,
              base::BindOnce(&MainContextImpl::OnUninstallVirtualCamera,
                             base::Unretained(this), application_folder));
}

void MainContextImpl::UpgradeVirtualCamera(std::wstring application_folder) {
  if (install_in_progress_.exchange(true))
    return;

  ReportVirtualCameraInstalling();

  CefPostTask(TID_FILE_USER_BLOCKING,
              base::BindOnce(&MainContextImpl::OnUpgradeVirtualCamera,
                             base::Unretained(this), application_folder));
}

mmhmmCamera::implementation::StreamParams MainContextImpl::GetCameraStreamParams() {
  std::scoped_lock lock(connection_mutex_);
  return camera_stream_params_;
}

void MainContextImpl::RefreshWindowsConnectedStatus(RootWindow* window) {
  auto stream_params = GetCameraStreamParams();
  if (application_context_) {
    if (camera_connected_) {
      application_context_->SetCameraConnectionStatusIndicator(
          {mmhmm::CameraIndicatorRawStatus::connected,
           client::ToWideString(stream_params.clientName)});
    } else {
      if (IsVirtualCameraInstalled()) {
        application_context_->SetCameraConnectionStatusIndicator(
            {mmhmm::CameraIndicatorRawStatus::disconnected});
      } else {
        application_context_->SetCameraConnectionStatusIndicator(
            {mmhmm::CameraIndicatorRawStatus::installRequired});
      }
    }
  }
}

void MainContextImpl::CloseChildApps() {
  if (not root_window_manager_)
    return;

  auto mini_remote =
      root_window_manager_->GetWindowByWebAppType(WebAppType::mini_remote);
  if (mini_remote)
    mini_remote->Close(false);

  auto broadcast =
      root_window_manager_->GetWindowByWebAppType(WebAppType::broadcast);
  if (broadcast)
    broadcast->Close(false);
}



void MainContextImpl::AddClientToVirtualCamera(std::string client_name) {
  auto virtual_camera = GetVirtualCamera();
  if (std::find(virtual_camera.clients.begin(), virtual_camera.clients.end(),
                client_name) == virtual_camera.clients.end()) {
    virtual_camera.clients.push_back(client_name);
  }
  SetVirtualCamera(virtual_camera);
}

void MainContextImpl::RemoveClientFromVirtualCamera(std::string client_name) {
  auto virtual_camera = GetVirtualCamera();
  auto iterator = std::find(virtual_camera.clients.begin(),
                            virtual_camera.clients.end(), client_name);
  if (iterator != virtual_camera.clients.end()) {
    virtual_camera.clients.erase(iterator);
  }
  SetVirtualCamera(virtual_camera);
}

void MainContextImpl::UpdateVirtualCameraState(
    mmhmm::VirtualCameraRawState state,
    std::string message) {
  auto virtual_camera = GetVirtualCamera();
  virtual_camera.state = mmhmm::VirtualCameraState(state, message);
  SetVirtualCamera(virtual_camera);
}

void MainContextImpl::ReportVirtualCameraInstalling() {
  UpdateVirtualCameraState(mmhmm::VirtualCameraRawState::installing);
  application_context_->SetCameraConnectionStatusIndicator(
      {mmhmm::CameraIndicatorRawStatus::installing});
}

void MainContextImpl::ReportVirtualCameraUninstalling() {
  UpdateVirtualCameraState(mmhmm::VirtualCameraRawState::uninstalling);
  application_context_->SetCameraConnectionStatusIndicator(
      {mmhmm::CameraIndicatorRawStatus::uninstalling});
}

void MainContextImpl::ReportVirtualCameraInstalled() {
  UpdateVirtualCameraState(mmhmm::VirtualCameraRawState::installed);
  application_context_->SetCameraConnectionStatusIndicator(
      {mmhmm::CameraIndicatorRawStatus::disconnected});
}
void MainContextImpl::ReportVirtualCameraNotInstalled() {
  UpdateVirtualCameraState(mmhmm::VirtualCameraRawState::notInstalled);
  application_context_->SetCameraConnectionStatusIndicator(
      {mmhmm::CameraIndicatorRawStatus::installRequired});
}

void MainContextImpl::ReportVirtualCameraDisconnected() {
  if (not InValidState()) {
    return;
  }
  if (!CefCurrentlyOn(TID_UI)) {
    CefPostTask(TID_UI, base::BindOnce(
                            &MainContextImpl::ReportVirtualCameraDisconnected,
                            base::Unretained(this)));
    return;
  } else {
    if (IsVirtualCameraInstalled()) {
      application_context_->SetCameraConnectionStatusIndicator(
          {mmhmm::CameraIndicatorRawStatus::disconnected});
    } else {
      application_context_->SetCameraConnectionStatusIndicator(
          {mmhmm::CameraIndicatorRawStatus::installRequired});
    }
  }
}

void MainContextImpl::ReportVirtualCameraConnected(std::wstring client) {
  if (!CefCurrentlyOn(TID_UI)) {
    CefPostTask(TID_UI,
                base::BindOnce(&MainContextImpl::ReportVirtualCameraConnected,
                               base::Unretained(this), client));
  } else {
    application_context_->SetCameraConnectionStatusIndicator(
        {mmhmm::CameraIndicatorRawStatus::connected, client});
  }
}

void MainContextImpl::OnInstallVirtualCamera(std::wstring application_folder) {
  auto result = mmhmmCamera::implementation::CameraInstallationResult::
      failedToStartProcess;
  if (driver_) {
    result = driver_->InstallCamera(application_folder);
  }

  CefPostTask(TID_UI,
              base::BindOnce(&MainContextImpl::OnInstallVirtualCameraComplete,
                             base::Unretained(this), result));
}

void MainContextImpl::OnUninstallVirtualCamera(
    std::wstring application_folder) {
  auto result = mmhmmCamera::implementation::CameraUninstallationResult::
      serviceDetectionFail;
  if (driver_) {
    result = driver_->UninstallCamera(application_folder);
  }

  CefPostTask(TID_UI,
              base::BindOnce(&MainContextImpl::OnUninstallVirtualCameraComplete,
                             base::Unretained(this), result));
}

void MainContextImpl::OnUpgradeVirtualCamera(
    std::wstring application_folder) {
  auto result = mmhmmCamera::implementation::CameraInstallationResult::failedToStartProcess;
  if (driver_) {
    result = (mmhmmCamera::implementation::CameraInstallationResult)
                 driver_->UpdateDriver(application_folder);
  }

  CefPostTask(TID_UI,
              base::BindOnce(&MainContextImpl::OnInstallVirtualCameraComplete,
                             base::Unretained(this), result));
}

void MainContextImpl::OnInstallVirtualCameraComplete(
    mmhmmCamera::implementation::CameraInstallationResult result) {
  install_in_progress_.store(false);

  std::string message = "Unknown reason of failure";
  switch (result) {
    case mmhmmCamera::implementation::CameraInstallationResult::success:
      ReportVirtualCameraInstalled();
      application_context_->SendCameraInstallationEvent(
          mmhmm::MixPanelEventType::cameraInstallationSucceed,
          client::ToWideString(GetWebAppVersionString()),
          client::ToWideString(GetWebAppTrack()), L"");
      return;

    case mmhmmCamera::implementation::CameraInstallationResult::canceledByUser:
      ReportVirtualCameraNotInstalled();
      application_context_->SendCameraInstallationEvent(
          mmhmm::MixPanelEventType::cameraInstallationCanceled,
          client::ToWideString(GetWebAppVersionString()),
          client::ToWideString(GetWebAppTrack()), L"");
      return;
    case mmhmmCamera::implementation::CameraInstallationResult::
        failedToStartProcess:
      message = "Unable to start Driver Manager.";
      break;
    case mmhmmCamera::implementation::CameraInstallationResult::
        errorDuringInstallation:
      message = "Error during installation.";
      break;
    default:
      message = "Driver unavailable";
  }

  UpdateVirtualCameraState(mmhmm::VirtualCameraRawState::error, message);
  GetLogger()->error("Install virtual camera - " + message);
  application_context_->SendCameraInstallationEvent(
      mmhmm::MixPanelEventType::cameraInstallationFailed,
      client::ToWideString(GetWebAppVersionString()),
      client::ToWideString(GetWebAppTrack()), client::ToWideString(message));
}

void MainContextImpl::OnUninstallVirtualCameraComplete(
    mmhmmCamera::implementation::CameraUninstallationResult result) {
  install_in_progress_.store(false);
  std::string message = "Unknown reason of failure";
  switch (result) {
    case mmhmmCamera::implementation::CameraUninstallationResult::success:
      ReportVirtualCameraNotInstalled();
      application_context_->SendCameraInstallationEvent(
          mmhmm::MixPanelEventType::cameraUninstallationSucceed,
          client::ToWideString(GetWebAppVersionString()),
          client::ToWideString(GetWebAppTrack()), L"");
      return;

    case mmhmmCamera::implementation::CameraUninstallationResult::
        serviceDetectionFail:
      message = "Service not installed or not running";
      break;
    case mmhmmCamera::implementation::CameraUninstallationResult::
        serviceDidNotRespond:
      message = "Service not responding";
      break;
    default:
      message = "Driver unavailable";
  }

  application_context_->SendCameraInstallationEvent(
      mmhmm::MixPanelEventType::cameraUninstallationFailed,
      client::ToWideString(GetWebAppVersionString()),
      client::ToWideString(GetWebAppTrack()), client::ToWideString(message));

  UpdateVirtualCameraState(mmhmm::VirtualCameraRawState::error, message);
  GetLogger()->error("Uninstall virtual camera - " + message);
}
void MainContextImpl::OnBridgeInitialized(CefRefPtr<CefBrowser> browser,
                                          CefString& build,
                                          CefString& theme,
                                          CefString& releaseTrack) {
  application_context_->OnBridgeInitialized(browser, build, theme,
                                            releaseTrack);
  SetInitialLoadComplete(true);
}

std::shared_ptr<spdlog::logger> MainContextImpl::GetLogger() {
  return logger_;
}

spdlog::level::level_enum MainContextImpl::ToSpdlogLevel(
    cef_log_severity_t level) {
  switch (level) {
    case LOGSEVERITY_DEFAULT:
    case LOGSEVERITY_INFO:
      return spdlog::level::info;
    case LOGSEVERITY_DEBUG:  // also LOGSEVERITY_VERBOSE
      return spdlog::level::trace;
    case LOGSEVERITY_WARNING:
      return spdlog::level::warn;
    case LOGSEVERITY_ERROR:
      return spdlog::level::err;
    case LOGSEVERITY_FATAL:
      return spdlog::level::critical;
    case LOGSEVERITY_DISABLE:
      return spdlog::level::off;
    default:
      return spdlog::level::off;
  }
}

std::shared_ptr<spdlog::logger> MainContextImpl::InitializeLogger(
    std::string location) {
  std::filesystem::path log_location = location;
  std::filesystem::path log_dir = log_location;
  std::string filename = mmhmm_log_name;
  if (!std::filesystem::is_directory(log_location)) {
    log_dir = log_location.parent_path();
  } else {
    log_location = log_location.append(mmhmm_log_name);
  }

  try {
    std::filesystem::create_directories(log_dir);
  } catch (...) {
    return nullptr;
  }

  std::shared_ptr<spdlog::logger> logger;

#if (_DEBUG)
  logger = std::make_shared<spdlog::logger>(
      mmhmm_desktop_logger, std::make_shared<spdlog::sinks::msvc_sink_mt>());
#else
  logger = std::make_shared<spdlog::logger>(
      mmhmm_desktop_logger,
      std::make_shared<spdlog::sinks::rotating_file_sink_mt>(
          log_location.c_str(), mmhmm_log_max_size, mmhmm_log_max_files));
#endif  // DEBUG

  auto level = ToSpdlogLevel(log_level_);

  logger->set_level(level);
  logger->set_pattern(mmhmm_log_pattern);
  logger->flush_on(level);
  spdlog::register_logger(logger);
  return logger;
}

void MainContextImpl::ShutdownLogger() {
  spdlog::shutdown();
}
#endif

}
