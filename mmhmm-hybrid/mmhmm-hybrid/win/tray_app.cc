#include "tray_app.h"
#include <browser/resource.h>
#include <shellapi.h>
#include <string>
#include "../browser/main_context.h"
#include "../browser/root_window_manager.h"
#include <win/app_settings_service.h>
#include "../browser/util_win.h"

namespace mmhmm {
const std::wstring TrayAppClassName = L"trayappwindow";
const std::wstring TrayAppWindowName = L"TrayApp Window";

TrayApp::TrayApp() {
  hinstance_ = GetCodeModuleHandle();

  InitWindow();
  AddTrayIcon();
}

TrayApp::~TrayApp() {
  NOTIFYICONDATA nid = {};
  nid.cbSize = sizeof(NOTIFYICONDATA);
  nid.hWnd = app_window_hwnd_;
  nid.uID = ID_TRAY_APP;
  Shell_NotifyIcon(NIM_DELETE, &nid);
}

void TrayApp::AddTrayIcon() {
  NOTIFYICONDATA nid = {};
  nid.cbSize = sizeof(NOTIFYICONDATA);
  nid.hWnd = app_window_hwnd_;
  nid.uID = ID_TRAY_APP;
  nid.uVersion = NOTIFYICON_VERSION;
  nid.uCallbackMessage = ID_TRAY_APP_MESSAGE;
  nid.hIcon = LoadIcon(hinstance_, MAKEINTRESOURCE(IDI_SMALL));
  LoadString(hinstance_, IDS_APP_TITLE, nid.szTip, ARRAYSIZE(nid.szTip));
  nid.uFlags = NIF_MESSAGE | NIF_ICON | NIF_TIP;

  Shell_NotifyIcon(NIM_ADD, &nid);
}

void TrayApp::RemoveTrayIcon() {
  NOTIFYICONDATA nid = {};
  nid.cbSize = sizeof(NOTIFYICONDATA);
  nid.hWnd = app_window_hwnd_;
  nid.uID = ID_TRAY_APP;

  Shell_NotifyIcon(NIM_DELETE, &nid);
}

void TrayApp::InitWindow() {
  WNDCLASS wc = {};
  wc.hCursor = LoadCursor(nullptr, IDC_ARROW);
  wc.hInstance = hinstance_;
  wc.lpszClassName = TrayAppClassName.c_str();
  wc.style = CS_HREDRAW | CS_VREDRAW;
  wc.lpfnWndProc = [](HWND window, UINT message, WPARAM wparam,
                      LPARAM lparam) -> LRESULT {
    TrayApp* self = nullptr;
    if (message == WM_NCCREATE) {
      LPCREATESTRUCT lpcs = reinterpret_cast<LPCREATESTRUCT>(lparam);
      self = static_cast<TrayApp*>(lpcs->lpCreateParams);
      self->app_window_hwnd_ = window;
      SetWindowLongPtr(window, GWLP_USERDATA, reinterpret_cast<LONG_PTR>(self));
    } else {
      self =
          reinterpret_cast<TrayApp*>(GetWindowLongPtr(window, GWLP_USERDATA));
    }

    // Handle Explorer restart
    if (self && message == self->WM_TASK_BAR_CREATED) {
      self->AddTrayIcon();
      return 0;
    }

    switch (message) {
      case WM_DESTROY: {
        PostQuitMessage(0);
        return 0;
      }
      case ID_TRAY_APP_MESSAGE:
        switch (lparam) {
          case WM_LBUTTONUP:
            MainContext::Get()->GetApplicationContext()->ActivateOrLaunchApp(AppLaunchTrigger::user);
            break;
          case WM_RBUTTONUP:
            self->ShowMenu();
            break;
        }
        return 0;
      case WM_HOTKEY: {
        switch (wparam) {
          case static_cast<int>(Action::LaunchRecorder):
            MainContext::Get()->GetApplicationContext()->LaunchWebApp(
                WebAppType::screen_recorder, L"?record=true");
            break;
          case static_cast<int>(Action::CreateOrStopRecording):
            self->DoToggleRecording();
            break;
          case static_cast<int>(Action::RecordWindow):
            self->DoWindowRecording();
            break;
          case static_cast<int>(Action::RecordEntireScreen):
            self->DoScreenRecording();
            break;
        }
      } return 0;
      case WM_COMMAND: {
        auto id = LOWORD(wparam);
        switch (id) {
          case ID_OPEN_CAMERA: {
            MainContext::Get()->GetApplicationContext()->LaunchWebApp(
                WebAppType::camera);
            break;
          }
          case ID_OPEN_CREATOR: {
            MainContext::Get()->GetApplicationContext()->LaunchWebApp(
                WebAppType::creator);
            break;
          }
          case ID_OPEN_SCREEN_RECORDER: {
            MainContext::Get()->GetApplicationContext()->LaunchWebApp(
                WebAppType::screen_recorder);
            break;
          }
          case ID_OPEN_STACKS: {
            MainContext::Get()->GetApplicationContext()->LaunchWebApp(
                WebAppType::stacks);
            break;
          }
          case ID_REC_NEW_RECORDING: {
            self->DoToggleRecording();
            break;
          }
          case ID_REC_RECORD_WINDOW: {
            self->DoWindowRecording();
            break;
          }
          case ID_REC_RECORD_SCREEN: {
            self->DoScreenRecording();
            break;
          }
          case ID_QUIT: {
            auto window_manager = MainContext::Get()->GetRootWindowManager();
            if (window_manager) {
              window_manager->CloseAllWindows(false);
              MainMessageLoop::Get()->Quit();
            }
            break;
          }
        }
      }
    }
    return DefWindowProc(window, message, wparam, lparam);
  };
  RegisterClass(&wc);

  DWORD overlay_style =
      WS_EX_TRANSPARENT | WS_EX_LAYERED | WS_EX_TOPMOST | WS_EX_TOOLWINDOW;
  // Hook the TaskbarCreated message to allow us to re-add the tray icon
  WM_TASK_BAR_CREATED = RegisterWindowMessage(L"TaskbarCreated");
  app_window_hwnd_ =
      CreateWindowEx(overlay_style, wc.lpszClassName, TrayAppWindowName.c_str(),
                     WS_POPUP, 0, 0, 0, 0, nullptr, nullptr, hinstance_, this);
  hot_key_manager_ = std::make_unique<HotkeyManager>(app_window_hwnd_);
  RegisterHotKeys();

  SetWindowDisplayAffinity(app_window_hwnd_, WDA_EXCLUDEFROMCAPTURE);
}

void TrayApp::ShowMenu() const {
  POINT cursor;
  GetCursorPos(&cursor);
  HMENU menu_handle = (HMENU)GetSubMenu(
      LoadMenu(hinstance_, MAKEINTRESOURCE(IDC_TRAY_MENU)), 0);
  SetForegroundWindow(app_window_hwnd_);
  TrackPopupMenu(menu_handle, TPM_LEFTALIGN, cursor.x, cursor.y, 0,
                 app_window_hwnd_, NULL);
}

void TrayApp::DoToggleRecording() {
  MainContext::Get()->GetApplicationContext()->ToggleRecording();
}

void TrayApp::DoScreenRecording() {
  MainContext::Get()->GetApplicationContext()->LaunchRecorderWithPicker(
      ScreensharePickerFilter::screens);
}

void TrayApp::DoWindowRecording() {
  MainContext::Get()->GetApplicationContext()->LaunchRecorderWithPicker(
      ScreensharePickerFilter::windows);
}

void TrayApp::RegisterHotKeys() {
  mmhmm::AppSettingsService::LoadSettings();
  if (hot_key_manager_) {
    hot_key_manager_->Register(
        {Action::LaunchRecorder,
         mmhmm::AppSettingsService::AppSettings().launchRecorderHotKey});
    hot_key_manager_->Register(
        {Action::CreateOrStopRecording,
         mmhmm::AppSettingsService::AppSettings().createOrStopRecordingHotKey});
    hot_key_manager_->Register(
        {Action::RecordEntireScreen,
         mmhmm::AppSettingsService::AppSettings().recordEntireScreenHotKey});
    hot_key_manager_->Register(
        {Action::RecordWindow,
         mmhmm::AppSettingsService::AppSettings().recordWindowHotKey});
  }
}

bool TrayApp::TrySetHotKey(Action action, std::string hotkey) {
  if (!hot_key_manager_) {
    return false;
  }

  return hot_key_manager_->UpdateOrRegister({action, hotkey});
}

std::string TrayApp::GetHotKeyValue(Action action) {
  if (!hot_key_manager_) {
    return "";
  }
  auto* hot_key = hot_key_manager_->GetHotkey(action);
  return hot_key ? hot_key->GetOriginalString() : "";
}
}  // namespace mmhmm
