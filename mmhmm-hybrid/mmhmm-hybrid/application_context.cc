#include "application_context.h"
#include <shlobj_core.h>
#include <filesystem>
#include <nlohmann/json.hpp>
#include "common/event_proxy.h"
#include "../browser/client_prefs.h"
#include "../browser/main_context.h"
#include "../browser/root_window_manager.h"
#include "../common/urls.h"
#include "../win/app_settings_service.h"
#include "../win/app_track.h"
#include "../browser/root_window_win.h"
#include "browser/util_win.h"
#include "browser/resource.h"
#include "../common/client_switches.h"
#include <browser/web_app_browser.h>
#include "../win/hot_key.h"

namespace mmhmm {

const std::wstring UserEmailName = L"userEmail";
const std::wstring UserIdName = L"userId";
const std::wstring ThemeName = L"theme";
const std::wstring LightThemeName = L"light";
const std::wstring DarkThemeName = L"Dark";
const std::string UserStartedRecordingEvent = "userStartedRecording";
const std::string UserStoppedRecordingEvent = "userStoppedRecording";
const std::string UserRequestedRecordingScreen = "userRequestedRecordingScreen";
const std::string UserRequestedRecordingWindow = "userRequestedRecordingWindow";

struct AppLaunchConfig {
  WebAppType app_type;
  bool send_callback = false;
};

std::optional<AppLaunchConfig> GetAppLaunchConfig(TargetApp app_type) {
  switch (app_type) {
    case TargetApp::stacks:
      return AppLaunchConfig{WebAppType::stacks, true};
    case TargetApp::camera:
      return AppLaunchConfig{WebAppType::camera, false};
    case TargetApp::creator:
      return AppLaunchConfig{WebAppType::creator, false};
    case TargetApp::recorder:
      return AppLaunchConfig{WebAppType::screen_recorder, false};
    default:
      return std::nullopt;
  }
}

client::WindowTheme ToAppTheme(std::wstring theme) {
  if (client::ToLower(theme) == client::ToLower(LightThemeName)) {
    return client::WindowTheme::Light;
  }
  return client::WindowTheme::Dark;
}

ApplicationContext::ApplicationContext(client::MainContext* context,
                                       std::wstring track)
    : context_(context),
      theme_(client::WindowTheme::Light),
      app_manager_(context),
      singleton_(std::bind(&ApplicationContext::OnArgsReceived,this, std::placeholders::_1)),
      stream_deck_manager_(context){
  stream_deck_manager_.RunAsync();
  mmhmm::AppSettingsService::LoadSettings();
  if (client::ToLower(mmhmm::AppSettingsService::AppSettings().theme) ==
      client::ToNarrowString(client::ToLower(LightThemeName))) {
    theme_ = client::WindowTheme::Light;
  } else {
    theme_ = client::WindowTheme::Dark;
  }
}

ApplicationContext::~ApplicationContext() {
  stream_deck_manager_.Stop();
}

void ApplicationContext::AppPropertyChanged(CefString& action,
                                            CefRefPtr<CefValue> value) {
  if (action.compare(UserIdName) == 0 && value) {
    auto new_user_id = value->GetString().ToWString();
    if (user_id_.compare(new_user_id) != 0) {
      user_id_ = new_user_id;
      if (user_id_.empty()) {
        UserLoggedOut();
      } else {
        UserLoggedIn();
      }
    }
  } else if (action.compare(UserEmailName) == 0) {
    auto new_user_email = value->GetString().ToWString();
    if (user_email_.compare(new_user_email) != 0) {
      user_email_ = new_user_email;
    }
  } else if (action.compare(ThemeName) == 0) {
    SetTheme(value->GetString().ToWString());
  }
}

void ApplicationContext::UserLoggedIn() {
  if (!mmhmm::AppSettingsService::AppSettings().consolidatedUser &&
      mixpanel_service_) {
    mmhmm::AppSettingsService::AppSettings().consolidatedUser =
        mixpanel_service_->Identify(user_id_);
    mmhmm::AppSettingsService::SaveSettings();
  }
}

void ApplicationContext::UserLoggedOut() {
  if (mixpanel_service_) {
    mixpanel_service_->Reset();
  }
}

void ApplicationContext::OnThemeChanged(client::WindowTheme window_theme) {
  auto window_manager = context_->GetRootWindowManager();
  window_manager->SetThemeOnAllWindows(window_theme);

  AppSettingsService::AppSettings().theme =
      client::ToNarrowString(GetThemeString());
  AppSettingsService::SaveSettings();
}

void ApplicationContext::OnBridgeInitialized(CefRefPtr<CefBrowser> browser,
                                             CefString& build,
                                             CefString& theme,
                                             CefString& releaseTrack) {
  SetTheme(theme.ToWString());
  ShowStreamDeckPrompt();
  SetCameraStatusVisibility(controls::Visibility::Visible);
  SetToolboxStatusVisibility(controls::Visibility::Visible);
}

bool ApplicationContext::IsStreamDeckInstalled() const {
  try {
    return std::filesystem::exists(GetStreamDeckPath());
  } catch (...) {
    return false;
  }
}

bool ApplicationContext::IsPluginInstalled() const {
  try {
    return std::filesystem::exists(GetPluginPath());
  } catch (...) {
    return false;
  }
}

std::wstring ApplicationContext::GetStreamDeckPath() const {
  wchar_t* program_files_path;
  HRESULT hr =
      SHGetKnownFolderPath(FOLDERID_ProgramFiles, 0, 0, &program_files_path);

  if (FAILED(hr))
    return L"";

  return program_files_path +
         std::wstring(L"//Elgato//StreamDeck//StreamDeck.exe");
}

std::wstring ApplicationContext::GetPluginPath() const {
  wchar_t* program_files_path;
  HRESULT hr =
      SHGetKnownFolderPath(FOLDERID_RoamingAppData, 0, 0, &program_files_path);

  if (FAILED(hr))
    return L"";

  return program_files_path +
         std::wstring(
             L"//Elgato//StreamDeck//Plugins//app.mmhmm.mmhmm.sdPlugin//"
             L"mmhmmSdPluginWin.exe");
}

void ApplicationContext::ShowStreamDeckPrompt() const {
  if (AppSettingsService::AppSettings().showStreamDeckPrompt &&
      IsStreamDeckInstalled() && not IsPluginInstalled() &&
      not AppSettingsService::AppSettings().postponeStreamDeckPrompt) {
    auto context = client::MainContext::Get();
    if (not context)
      return;

    auto launch_popup_message = CefProcessMessage::Create("launch_url");
    auto args = launch_popup_message->GetArgumentList();
    args->SetString(0, mmhmm::urls::StreamDeckPromptUrl +
                           client::ToNarrowString(GetThemeString()));
    args->SetString(1, "width=610,height=230");

    auto web_app_browser = context->GetRootWindowManager()->GetBrowserByWebAppType(WebAppType::mmhmm);
    if (web_app_browser && web_app_browser->GetMainFrame()) {
      web_app_browser->GetMainFrame()->SendProcessMessage(PID_RENDERER,
                                                          launch_popup_message);
    }
  }

  // we have run once, allow the stream deck prompt to show
  AppSettingsService::AppSettings().postponeStreamDeckPrompt = false;
  AppSettingsService::SaveSettings();
}

void ApplicationContext::StreamDeckPromptAskChanged(bool should_ask) {
  mmhmm::AppSettingsService::AppSettings().showStreamDeckPrompt = should_ask;
  mmhmm::AppSettingsService::SaveSettings();
}

std::wstring ApplicationContext::GetThemeString() const {
  if (theme_ == client::WindowTheme::Dark) {
    return L"dark";
  }

  return L"light";
}

void ApplicationContext::SetTheme(std::wstring theme) {
  auto new_app_theme = ToAppTheme(theme);
  if (new_app_theme != theme_) {
    theme_ = new_app_theme;
    OnThemeChanged(theme_);
  }
}

client::WindowTheme ApplicationContext::GetTheme() const {
  return theme_;
}

void ApplicationContext::OnToggleBroadcastMode(CefRefPtr<CefBrowser> browser) {
  auto window_manager = context_->GetRootWindowManager();
  auto broadcast_window =
      window_manager->GetWindowByWebAppType(WebAppType::broadcast);
  if (broadcast_window) {
    broadcast_window->Close(false);
  } else {
    OpenBroadcastWindow(browser);
  }
}

void ApplicationContext::OpenBroadcastWindow(CefRefPtr<CefBrowser> browser) {
  if (!browser) {
    return;
  }

  auto frame = browser->GetMainFrame();
  if (!frame) {
    return;
  }

  frame->ExecuteJavaScript("gApp.openBroadcastWindow()", frame->GetURL(), 0);
}

void ApplicationContext::SendCameraDisconnectMessage(
    std::wstring bundle_id,
    std::wstring session_id,
    int session_duration_s,
    std::wstring web_app_build,
    std::wstring web_app_track) {
  if (mixpanel_service_) {
    mixpanel_service_->SendMixPanelEvent(
        MixPanelEventType::cameraDisconnected, user_id_, bundle_id, session_id,
        session_duration_s, web_app_build, web_app_track, L"", GetVirtualCameraApp());
  }
}

void ApplicationContext::SendCameraConnectMessage(std::wstring bundle_id,
                                                  std::wstring session_id,
                                                  int session_duration_s,
                                                  std::wstring web_app_build,
                                                  std::wstring web_app_track) {
  if (mixpanel_service_) {
    mixpanel_service_->SendMixPanelEvent(
        MixPanelEventType::cameraConnected, user_id_, bundle_id, session_id,
        session_duration_s, web_app_build, web_app_track, L"", GetVirtualCameraApp());
  }
}

void ApplicationContext::SendCameraInstallationEvent(
    MixPanelEventType event,
    std::wstring web_app_build,
    std::wstring web_app_track,
    std::wstring error_signature) {
  if (mixpanel_service_) {
    mixpanel_service_->SendMixPanelEvent(
        event, user_id_, /*not used*/ L"", /*not used*/ L"",
        /*not used*/ 0, web_app_build, web_app_track, error_signature,
        GetVirtualCameraApp());
  }
}

void ApplicationContext::CreateMixpanelService() {
  try {
    mixpanel_service_ = std::make_unique<mmhmm::MixpanelService>(
        mmhmm::AppTrackService::get_web_client_urls_key(),
        mmhmm::AppSettingsService::GetShortVersionStringWide(),
        context_->GetLogger());
  } catch (std::exception ex) {
    context_->GetLogger()->error(
        "Error constructing mixpanel service. Error: {}", ex.what());
  } catch (...) {
    context_->GetLogger()->error(
        "Unknwon error constructing mixpanel service.");
  }
}

bool ApplicationContext::AllowMiniRemoteCapture() const {
  return allow_mini_remote_capture_;
}
void ApplicationContext::SetAllowMiniRemoteCapture(
    bool allow_mini_remote_capture) {
  allow_mini_remote_capture_ = allow_mini_remote_capture;
}

void ApplicationContext::SetCameraConnectionStatusIndicator(
  CameraIndicatorStatus status) {
  auto windows = GetWindowsWithCameraConnectionStatus();
  for (auto window : windows) {
    switch (status.status) {
      case CameraIndicatorRawStatus::none:
        window->SetStatus(GetResourceString(IDS_STATUS_NONE),
                          Icon::none);
        break;
      case CameraIndicatorRawStatus::disconnected:
        window->SetStatus(GetResourceString(IDS_STATUS_DISCONNECTED),
                          Icon::disconnected);
        break;
      case CameraIndicatorRawStatus::connected:
        window->SetStatus(
            GetResourceString(IDS_STATUS_CONNECTED) + status.detail,
            Icon::connected);
        break;
      case CameraIndicatorRawStatus::installing:
        window->SetStatus(GetResourceString(IDS_STATUS_INSTALLING),
                          Icon::config);
        break;
      case CameraIndicatorRawStatus::uninstalling:
        window->SetStatus(
            GetResourceString(
                IDS_STATUS_UNINSTALLING),
            Icon::config);
        break;
      case CameraIndicatorRawStatus::installRequired:
        window->SetStatus(GetResourceString(IDS_STATUS_INSTALL_REQUIRED),
                          Icon::config);
        break;
      default:
        DCHECK(0);
        break;
    }
  }
}

std::vector<client::RootWindowWin*>
ApplicationContext::GetWindowsWithCameraConnectionStatus() {
  std::vector<client::RootWindowWin*> windows;
  auto window_manager = context_->GetRootWindowManager();
  if (not window_manager) {
    return windows;
  }

  auto root_window = window_manager->GetWindowByWebAppType(WebAppType::mmhmm);
  if (not root_window) {
    return windows;
  }

  auto mini_remote_window =
      window_manager->GetWindowByWebAppType(WebAppType::mini_remote);

  if (mini_remote_window) {
    windows.push_back(
        static_cast<client::RootWindowWin*>(mini_remote_window.get()));
  }

  windows.push_back(static_cast<client::RootWindowWin*>(root_window.get()));

  return windows;
}

std::vector<client::RootWindowWin*> ApplicationContext::GetMainAppWindows() {
  std::vector<client::RootWindowWin*> windows;
  auto window_manager = context_->GetRootWindowManager();
  if (not window_manager) {
    return windows;
  }

  auto app_types = GetMainAppTypes();
  for (auto& app_type : app_types) {
    auto root_window = window_manager->GetWindowByWebAppType(app_type);
    if (root_window) {
      windows.push_back(static_cast<client::RootWindowWin*>(root_window.get()));
    }
  }
  return windows;
}

void ApplicationContext::OnVirtualCameraSupportViewDidAppear() {
  auto windows = GetWindowsWithCameraConnectionStatus();
  for (auto window : windows) {
    window->SupportViewAppeared();
  }
}

void ApplicationContext::OnVirtualCameraSupportViewWillDisappear() {
  auto windows = GetWindowsWithCameraConnectionStatus();
  for (auto window : windows) {
    window->SupportViewClosing();
  }
}

void ApplicationContext::SetWindowIsFloating(bool floating, int browser_id) {
  auto window_manager = context_->GetRootWindowManager();
  if (!window_manager) {
    return;
  }
  auto window = window_manager->GetWindowForBrowser(browser_id);
  if (!window) {
    return;
  }

  static_cast<client::RootWindowWin*>(window.get())->SetIsFloating(floating);
}

void ApplicationContext::ResizeMainWindow(int width, int height) {
  auto* main_window = GetMainWindow();
  if (main_window) {
    main_window->SetSize(width, height);
  }
}

client::RootWindowWin* ApplicationContext::GetMainWindow() {
  auto window_manager = context_->GetRootWindowManager();
  auto main_window = window_manager->GetWindowByWebAppType(WebAppType::mmhmm);
  if (!main_window) {
    return nullptr;
  }

  return static_cast<client::RootWindowWin*>(main_window.get());
}

void ApplicationContext::SetCameraStatusVisibility(controls::Visibility visibility) {
  auto windows = GetWindowsWithCameraConnectionStatus();
  for (auto window : windows) {
    window->SetStatusVisibility(visibility);
  }
}

void ApplicationContext::SetToolboxStatusVisibility(
    controls::Visibility visibility) {
  auto windows = GetMainAppWindows();
  for (auto window : windows) {
    window->SetToolboxVisibility(visibility);
  }
}

void ApplicationContext::CloseToolbox() {
  auto window_manager = context_->GetRootWindowManager();
  auto toolbox_window =
      window_manager->GetWindowByWebAppType(WebAppType::toolbox);
  if (toolbox_window) {
    toolbox_window->Close(true);
  }
}

void ApplicationContext::DrawCursorsOnOverlayWindow(WindowOverlayInfo overlay_info) {
  if (overlay_info.participants.size() > 0) {
    auto overlay_window = overlay_manager_.GetOverlayWindow(
        overlay_info.target, overlay_info.target_id);
    if (overlay_window) {
      overlay_window->DrawCursors(overlay_info.participants);
    } else {
      context_->GetLogger()->error(
          "Unable to find or construct an overlay window for: target {}, target_id. Error: {}", (int)overlay_info.target, overlay_info.target_id);
    }
  } else {
    overlay_manager_.ClearOverlayWindows();
  }
}

void ApplicationContext::LaunchWebApp(WebAppType type,
                                      std::wstring query_params) {
  app_manager_.LaunchApp(type, true, query_params);
  CloseToolbox();
}

bool ApplicationContext::StartProcess(
    CefRefPtr<CefCommandLine> command_line, bool should_activate) {
  if (!singleton_.CanCreate()) {
    if (should_activate) {
      singleton_.Activate();
    }
    singleton_.ForwardArgsToSingletonProcess(command_line);
    return false;
  } else {
    singleton_.StartListening();
    tray_app_ = std::make_unique<TrayApp>();
  }

  return true;
}

void ApplicationContext::OnArgsReceived(std::wstring args) {
  if (!CefCurrentlyOn(TID_UI)) {
    CefPostTask(
        TID_UI,
        base::BindOnce(&ApplicationContext::OnArgsReceived,
                                       base::Unretained(this), args));
    return;
  }

  auto deep_link_string = client::ToNarrowString(args);
  // The virtual camera sends the --no-activate switch when launching.
  bool launched_from_camera =
      deep_link_string.find(switches::kNoActivate) != std::string::npos;

  if (launched_from_camera) {
    auto camera_launch_app =
        WebAppFromString(AppSettingsService::AppSettings().cameraLaunchApp);

    if (!camera_launch_app.has_value()) {
      context_->GetLogger()->warn(
          "Invalid camera launch app setting: {}. Defaulting to 'camera'",
          AppSettingsService::AppSettings().cameraLaunchApp);
      camera_launch_app = WebAppType::camera;
    }
    auto malk = context_->GetRootWindowManager()->GetWindowByWebAppType(
        camera_launch_app.value());
    if (!malk) {
      app_manager_.LaunchApp(camera_launch_app.value(), true);
    }
  } else {
    // activate window
    auto active_window =
        context_->GetRootWindowManager()->GetActiveRootWindow();
    if (active_window) {
      auto win_window = static_cast<client::RootWindowWin*>(active_window.get());
      win_window->ActivateWindow();
    }
  }

  DeepLinkInfo deep_link(deep_link_string);

  if (!deep_link.IsValid()) {
    ActivateOrLaunchApp(launched_from_camera ? AppLaunchTrigger::virtual_camera
                                             : AppLaunchTrigger::user);
    return;
  }

  HandleDeepLink(deep_link);
}

void ApplicationContext::HandleDeepLink(DeepLinkInfo deep_link) {

  if (!context_)
    return;

  auto config = GetAppLaunchConfig(deep_link.GetTargetApp());

  if (config) {
    auto window = context_->GetRootWindowManager()->GetWindowByWebAppType(
        config->app_type, WindowSearchType::exact);
    if (window == nullptr) {
      context_->SetPendingCommandLineProcessing(true);
      LaunchWebApp(config->app_type);
    } else {
      ActivateWindow(window);
      if (config->send_callback) {
        context_->NotifyHybridOfWebAppCallbackData(
            config->app_type, deep_link.GetQuery().ToString(),
            deep_link.GetFragment().ToString());
      }
    }
  }

  // If we have a param that requires an malk instance
  // ensure one exists.
  if (deep_link.HasKnownMalkToken() &&
      context_->GetRootWindowManager()->GetWindowByWebAppType(
          WebAppType::mmhmm) == nullptr) {
    context_->SetPendingCommandLineProcessing(true);
    LaunchWebApp(WebAppType::camera);
  }

  // Login requests only come with no app type provided.
  // An auth token is also provided with stacks deep links and shouldn't be processed.
  if (!deep_link.GetToken().empty() &&
      deep_link.GetTargetApp() == TargetApp::unknown) {
    Login(deep_link.GetToken());
  }
  

  if (!deep_link.GetMeetingId().empty())
    JoinMeeting(deep_link.GetMeetingId());

  if (!deep_link.GetTemplateId().empty())
    ImportTemplate(deep_link.GetTemplateId());

  if (!deep_link.GetRecordingId().empty())
    LaunchRecording(deep_link.GetRecordingId());

  CloseToolbox();
}

void ApplicationContext::Login(std::wstring token) {
  auto message = CefProcessMessage::Create("login_message");
  auto args = message->GetArgumentList();
  args->SetString(0, token);
  context_->SendProcessMessageToRendererProcess(message);
}

void ApplicationContext::JoinMeeting(std::wstring meeting_id) {
  auto message =
      CefProcessMessage::Create("join_meeting_message");
  auto args = message->GetArgumentList();
  args->SetString(0, meeting_id);
  context_->SendProcessMessageToRendererProcess(message);
}

void ApplicationContext::ImportTemplate(std::wstring template_id) {
  auto message =
      CefProcessMessage::Create("import_template_message");
  auto args = message->GetArgumentList();
  args->SetString(0, template_id);
  context_->SendProcessMessageToRendererProcess(message);
}

void ApplicationContext::LaunchRecording(std::wstring recording_id) {
  auto message =
      CefProcessMessage::Create("launch_recording_for_edit_message");
  auto arguments = message->GetArgumentList();
  arguments->SetString(0, recording_id);
  context_->SendProcessMessageToRendererProcess(message);
}

void ApplicationContext::ActivateOrLaunchApp(AppLaunchTrigger app_launch_trigger) {
  if (!context_->GetRootWindowManager()->HasRootWindowOpen()) {
    auto launch_web_app = AppSettingsService::GetLaunchWebAppType(
        std::nullopt, app_launch_trigger);
    app_manager_.LaunchApp(launch_web_app, true);
  } else {
    auto root_window = context_->GetRootWindowManager()->GetActiveRootWindow();
    ActivateWindow(root_window);
  }
}

void ApplicationContext::ActivateWindow(scoped_refptr<RootWindow> window) {
  if (!window)
    return;

  static_cast<client::RootWindowWin*>(window.get())->ActivateWindow();
}

void ApplicationContext::TryActivateWindow(WebAppType app_type) {
  auto manager = context_->GetRootWindowManager();
  if (!manager) {
    return;
  }

  ActivateWindow(manager->GetWindowByWebAppType(app_type));
}

WebAppType ApplicationContext::GetVirtualCameraApp() {
  auto* manager = context_->GetRootWindowManager();
  if (!manager) {
    // No app launched so we will launch camera when required.
    return WebAppType::camera;
  }

  return manager->GetWindowByWebAppType(WebAppType::creator) != nullptr
             ? WebAppType::creator
             : WebAppType::camera;
}

inline bool starts_with(const std::string& str, const std::string& prefix) {
  return str.size() >= prefix.size() &&
         std::equal(prefix.begin(), prefix.end(), str.begin());
}

inline bool ends_with(const std::string& str, const std::string& suffix) {
  return str.size() >= suffix.size() &&
         std::equal(suffix.rbegin(), suffix.rend(), str.rbegin());
}

std::optional<std::string> ExtractSettingKeyPathName(const std::string& eventName) {
  const std::string prefix = "settings.";
  const std::string suffix = ".changed";

  if (starts_with(eventName, prefix) && ends_with(eventName, suffix)) {
    size_t start = prefix.size();
    size_t end = eventName.size() - suffix.size();
    return eventName.substr(start, end - start);
  }
  return std::nullopt;
}


void ApplicationContext::HandleIncomingEvent(std::string event_message,
                                             int browser_id) {
  try {
    auto event_json = nlohmann::json::parse(event_message);
    const auto event_name =
        event_json.value(mmhmm::EventProxyKeys::eventName, "");
    const auto event_payload = event_json.value(
        mmhmm::EventProxyKeys::eventPayload, nlohmann::json::object());

    if (event_name == "stateUpdate") {
      HandleStateUpdate(event_payload);
      return;
    }

    if (event_name == "settings.requestSync") {
      HandleSettingsSync(browser_id);
      return;
    }

    if (auto maybe_key_path = ExtractSettingKeyPathName(event_name)) {
      HandleSettingsChange(*maybe_key_path, event_payload, browser_id);
    }

  } catch (const nlohmann::json::parse_error&) {
    context_->GetLogger()->error("Error parsing event {}", event_message);
  }
}

void ApplicationContext::HandleStateUpdate(const nlohmann::json& payload) {
  is_recording_ = payload.value("isRecording", false);
}

void ApplicationContext::HandleSettingsSync(int browser_id) {
  nlohmann::json current_settings = {
      {"launchTool", AppSettingsService::AppSettings().cameraLaunchApp},
      {"shortcuts",
       {{"createOrStopRecording",
         tray_app_->GetHotKeyValue(Action::CreateOrStopRecording)},
        {"recordEntireScreen",
         tray_app_->GetHotKeyValue(Action::RecordEntireScreen)},
        {"recordWindow", tray_app_->GetHotKeyValue(Action::RecordWindow)}}}};

  EmitEvent("settings.sync", current_settings.dump(), browser_id);
}

void ApplicationContext::HandleSettingsChange(const std::string& key_path,
                                              const nlohmann::json& payload,
                                              int browser_id) {
  if (starts_with(key_path, "shortcuts.")) {
    HandleShortcutChange(key_path, payload.get<std::string>(), browser_id);
  } else if (key_path == "launchTool") {
    HandleLaunchToolChange(payload.get<std::string>(), browser_id);
  }
}

void ApplicationContext::HandleShortcutChange(const std::string& key_path,
                                              const std::string& hotkey,
                                              int browser_id) {
  const std::string action_name = key_path.substr(strlen("shortcuts."));
  auto action = ActionFromString(action_name);
  if (!action)
    return;

  bool success = tray_app_->TrySetHotKey(action.value(), hotkey);
  if (success) {
    auto& settings = AppSettingsService::AppSettings();
    switch (action.value()) {
      case Action::CreateOrStopRecording:
        settings.createOrStopRecordingHotKey = hotkey;
        break;
      case Action::RecordEntireScreen:
        settings.recordEntireScreenHotKey = hotkey;
        break;
      case Action::RecordWindow:
        settings.recordWindowHotKey = hotkey;
        break;
      default:
        break;
    }
    AppSettingsService::SaveSettings();
  }

  EmitSettingsChangeResult(key_path, hotkey, success, browser_id);
}

void ApplicationContext::HandleLaunchToolChange(const std::string& tool,
                                                int browser_id) {
  AppSettingsService::AppSettings().cameraLaunchApp = tool;
  AppSettingsService::SaveSettings();

  EmitSettingsChangeResult("launchTool", tool, true, browser_id);
}

void ApplicationContext::EmitSettingsChangeResult(const std::string& key,
                                                  const std::string& value,
                                                  bool success,
                                                  int browser_id) {
  nlohmann::json payload = {{"key", key}, {"value", value}};
  EmitEvent(success ? "settings.changed.success" : "settings.changed.failed",
            payload.dump(), browser_id);
}

void ApplicationContext::ToggleRecording() {
  if (!context_) {
    return;
  }

  auto* manager = context_->GetRootWindowManager();
  if (!manager) {
    return;
  }

  if (auto browser =
          manager->GetBrowserByWebAppType(WebAppType::screen_recorder)) {
    TryActivateWindow(WebAppType::screen_recorder);
    EmitEvent(
        is_recording_ ? UserStoppedRecordingEvent : UserStartedRecordingEvent,
        "", browser->GetIdentifier());
  } else {
    LaunchWebApp(WebAppType::screen_recorder, L"?record=true");
  }
}

void ApplicationContext::EmitEvent(std::string event_name,
                                   std::string payload,
                                   int browser_id) {
  auto eventProxy = context_ ? context_->GetEventProxy() : nullptr;
  if (!eventProxy) {
    return;
  }

  auto payload_dictionary = mmhmm::ToCefDictionaryValue(payload);
  eventProxy->EmitEventInBrowser(event_name, payload_dictionary, browser_id);
}

void ApplicationContext::LaunchRecorderWithPicker(
  ScreensharePickerFilter filter) {
  if (!context_ || is_recording_) {
    return;
  }

  auto* manager = context_->GetRootWindowManager();
  if (!manager) {
    return;
  }

  if (auto browser =
          manager->GetBrowserByWebAppType(WebAppType::screen_recorder)) {
    TryActivateWindow(WebAppType::screen_recorder);
    EmitEvent(
        filter == ScreensharePickerFilter::screens ? UserRequestedRecordingScreen : UserRequestedRecordingWindow,
        "", browser->GetIdentifier());
  } else {
    auto query = filter == ScreensharePickerFilter::screens
                     ? L"?record=true&screen=true"
                     : L"?record=true&window=true";
    MainContext::Get()->GetApplicationContext()->LaunchWebApp(
        WebAppType::screen_recorder, query);
  }
}

void ApplicationContext::OpenSettings(CefRefPtr<CefBrowser> browser) {
  auto context = client::MainContext::Get();
  if (!context)
    return;

  auto window_manager = context->GetRootWindowManager();
  if (!window_manager)
    return;

  auto settings = context_->GetRootWindowManager()->GetWindowByWebAppType(
      WebAppType::settings);
  if (settings) {
      auto win_window = static_cast<client::RootWindowWin*>(settings.get());
      win_window->ActivateWindow();
      return;
  }

  auto message = CefProcessMessage::Create("launch_url");
  auto args = message->GetArgumentList();
  auto settings_url = mmhmm::urls::SettingsUrl;
  auto theme = MainContext::Get()->GetApplicationContext()->GetThemeString();
  settings_url.append("&theme=" + client::ToNarrowString(theme));
  args->SetString(0, settings_url);
  args->SetString(1, "width=700,height=800");

  if (!browser) {
    browser = context->GetRootWindowManager()->GetWebAppBrowser();
  }

  if (browser && browser->GetMainFrame()) {
    browser->GetMainFrame()->SendProcessMessage(PID_RENDERER, message);
  }
}

void ApplicationContext::OnOmitInScreenShares(int browser_id, bool omit) {
  if (!context_) {
    return;
  }
  auto window =
      context_->GetRootWindowManager()->GetWindowForBrowser(browser_id);
  if (!window) {
    return;
  }
  auto win_window = static_cast<client::RootWindowWin*>(window.get());
  win_window->OnOmitInScreenShares(omit);
}
}  // namespace mmhmm
