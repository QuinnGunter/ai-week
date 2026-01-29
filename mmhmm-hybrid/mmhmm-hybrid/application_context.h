#pragma once
#include "..\win\mixpanel_service.h"

#include <algorithm>
#include <nlohmann/json.hpp>
#include "include\cef_base.h"
#include "include\cef_browser.h"
#include "include\cef_values.h"
#include "common\dictionary_utils.h"
#include "common\string_util.h"
#include "common\titlebar_button.h"
#include "win\controls\base_control.h"
#include "win\controls\overlay_manager.h"
#include "common\window_overlay.h"
#include "../win/tray_app.h"
#include "../win/app_manager.h"
#include "../win/singleton_win.h"
#include "win/deep_link_info.h"
#include "../streamDeck/sdManager.h"
#include "win/app_settings_service.h"

namespace client {
  class MainContext;
  class RootWindowWin;
  enum class WindowTheme;
}

using namespace mmhmm::controls;

namespace mmhmm {

enum class CameraIndicatorRawStatus {
  none,
  disconnected,
  connected,
  installing,
  uninstalling,
  installRequired
};

enum class ScreensharePickerFilter {
  none,
  windows,
  screens
};

struct CameraIndicatorStatus {
  CameraIndicatorRawStatus status;
  std::wstring detail;
};

class ApplicationContext {
 public:
  ApplicationContext(client::MainContext* context, std::wstring track);
  ~ApplicationContext();

  void AppPropertyChanged(CefString& action, CefRefPtr<CefValue> value);
  void OnBridgeInitialized(CefRefPtr<CefBrowser> browser,
                           CefString& build,
                           CefString& theme,
						   CefString& releaseTrack);
  void StreamDeckPromptAskChanged(bool should_ask);
  void CreateMixpanelService();
  std::wstring GetThemeString() const;
  client::WindowTheme GetTheme() const;
  void OnToggleBroadcastMode(CefRefPtr<CefBrowser> browser);
  void OpenBroadcastWindow(CefRefPtr<CefBrowser> browser);

  // Virtual Camera MixPanel events.
  void SendCameraDisconnectMessage(std::wstring bundle_id,
                                   std::wstring session_id,
                                   int session_duration_s,
                                   std::wstring web_app_build,
                                   std::wstring web_app_track);
  void SendCameraConnectMessage(std::wstring bundle_id,
                                std::wstring session_id,
                                int session_duration_s,
                                std::wstring web_app_build,
                                std::wstring web_app_track);
  void SendCameraInstallationEvent(MixPanelEventType event,
                                   std::wstring web_app_build,
                                   std::wstring web_app_track,
                                   std::wstring error_signature);
  // 

  bool AllowMiniRemoteCapture() const;
  void SetAllowMiniRemoteCapture(bool allow_mini_remote_capture);
  void SetCameraConnectionStatusIndicator(CameraIndicatorStatus status);
  void OnVirtualCameraSupportViewWillDisappear();
  void OnVirtualCameraSupportViewDidAppear();
  void SetWindowIsFloating(bool floating, int browser_id);
  void ResizeMainWindow(int width, int height);
  void CloseToolbox();

  void DrawCursorsOnOverlayWindow(WindowOverlayInfo overlay_info);
  void LaunchWebApp(WebAppType type, std::wstring query_params = L"");
  bool StartProcess(CefRefPtr<CefCommandLine> command_line,
                    bool should_activate);
  void OnArgsReceived(std::wstring args);
  void ActivateOrLaunchApp(AppLaunchTrigger app_launch_trigger);
  void HandleIncomingEvent(std::string event, int browser_id);
  void EmitEvent(std::string event_name, std::string payload, int browser_id);
  void ToggleRecording();
  void LaunchRecorderWithPicker(ScreensharePickerFilter filter);
  void OpenSettings(CefRefPtr<CefBrowser> browser);
  void OnOmitInScreenShares(int browser_id, bool omit);

 private:
  void UserLoggedIn();
  void UserLoggedOut();
  void OnThemeChanged(client::WindowTheme theme);
  bool IsStreamDeckInstalled() const;
  bool IsPluginInstalled() const;
  std::wstring GetStreamDeckPath() const;
  std::wstring GetPluginPath() const;
  void ShowStreamDeckPrompt() const;
  void SetTheme(std::wstring theme);
  std::vector<client::RootWindowWin*> GetWindowsWithCameraConnectionStatus();
  std::vector<client::RootWindowWin*> GetMainAppWindows();
  void SetCameraStatusVisibility(Visibility visibility);
  void SetToolboxStatusVisibility(Visibility visibility);
  client::RootWindowWin* GetMainWindow();
  void HandleDeepLink(DeepLinkInfo deep_link);
  void Login(std::wstring token);
  void JoinMeeting(std::wstring meeting_id);
  void ImportTemplate(std::wstring template_id);
  void LaunchRecording(std::wstring recording_id);
  void ActivateWindow(scoped_refptr<RootWindow> window);
  void TryActivateWindow(WebAppType app_type);
  WebAppType GetVirtualCameraApp();
  void HandleStateUpdate(const nlohmann::json& payload);
  void HandleSettingsSync(int browser_id);
  void HandleSettingsChange(const std::string& key_path,
                            const nlohmann::json& payload,
                            int browser_id);
  void HandleShortcutChange(const std::string& key_path,
                            const std::string& hotkey,
                            int browser_id);
  void HandleLaunchToolChange(const std::string& tool, int browser_id);
  void EmitSettingsChangeResult(const std::string& key,
                                const std::string& value,
                                bool success,
                                int browser_id);
 private:
  std::wstring user_id_;
  std::wstring user_email_;
  std::unique_ptr<mmhmm::MixpanelService> mixpanel_service_ = nullptr;
  client::WindowTheme theme_;
  client::MainContext* context_ = nullptr;
  bool allow_mini_remote_capture_ = false;
  overlay::OverlayManager overlay_manager_;
  std::unique_ptr<TrayApp> tray_app_;
  AppManager app_manager_;
  Singleton singleton_;
  SdManager stream_deck_manager_;
  bool is_recording_ = false;
};
}  // namespace mmhmm
