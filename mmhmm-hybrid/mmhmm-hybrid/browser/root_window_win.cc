// Copyright (c) 2015 The Chromium Embedded Framework Authors. All rights
// reserved. Use of this source code is governed by a BSD-style license that
// can be found in the LICENSE file.

#include "root_window_win.h"

#include <shellscalingapi.h>

#include <optional>

#include "include/base/cef_build.h"
#include "include/base/cef_callback.h"
#include "include/cef_app.h"
#include "include/views/cef_display.h"
#include "browser_window_std_win.h"
#include "main_context.h"
#include "resource.h"
#include "temp_window.h"
#include "geometry_util.h"
#include "main_message_loop.h"
#include "util_win.h"
#include "../common/async_javascript_processor.h"
#include "../common/client_switches.h"
#include "../common/string_util.h"
#include "../common/urls.h"
#include "../common/exceptions.h"
#include "../win/url_constants_win.h"
#include "include/cef_version.h"
#include "include/cef_parser.h"

#include "../win/app_sizes.h"
#include "../win/zipper.h"
#include "../win/file_utils.h"

#include "root_window_manager.h"
#include "../win/app_settings_service.h"

#include <Commctrl.h>
#include <thread>
#include <shellapi.h>
#include <codecvt>
#include <PathCch.h>
#include "../win/app_track.h"
#pragma comment (lib, "Pathcch.lib")

#include <tuple>
#include "../win/system_info.h"
#include "nlohmann/json.hpp"
#include "../win/system_report.h"
#include "../win/utils.h"
#include "web_app_browser.h"


#define MAX_URL_LENGTH 255
#define BUTTON_WIDTH 72
#define URLBAR_HEIGHT 24

namespace client {

  inline constexpr std::wstring_view RootWindowHandleProp = L"root_window_handle";

  namespace {

    // Message handler for the About box.
    INT_PTR CALLBACK AboutWndProc(HWND hDlg,
      UINT message,
      WPARAM wParam,
      LPARAM lParam) {

      UNREFERENCED_PARAMETER(lParam);
      switch (message) {
      case WM_INITDIALOG:
      {
        SetProp(hDlg, RootWindowHandleProp.data(), (HANDLE)lParam);

        auto fileVersion = mmhmm::AppSettingsService::GetFileVersion();
        const std::wstring& track = mmhmm::AppTrackService::get_app_track_label();
        const std::string webAppVersion = MainContext::Get()->GetWebAppVersionString();
        std::wstring_convert<std::codecvt_utf8_utf16<wchar_t>> converter;
        auto wideWebAppVersion = std::wstring(converter.from_bytes(webAppVersion));
        const std::wstring formattedWebVersion = wideWebAppVersion.empty() ? L"" : L" " + wideWebAppVersion;
        const std::wstring trackFormatted = !track.empty() ? L" (" + track + formattedWebVersion + L")" : L"";
        std::wstring versionInfo = GetResourceString(IDS_VERSION_DESC) +
                                   fileVersion.ToWString() + L" - " +
                                   std::to_wstring(CHROME_VERSION_MAJOR) + trackFormatted;

        SetDlgItemText(hDlg, IDC_EDIT_VERSION, versionInfo.c_str());
        return TRUE;
      }
      case WM_DESTROY:
        RemoveProp(hDlg, RootWindowHandleProp.data());
        break;
      case WM_COMMAND:
        //IDCANCEL is required to catch the cross being clicked
        if (LOWORD(wParam) == IDOK || LOWORD(wParam) == ID_CREDITS || LOWORD(wParam) == IDCANCEL) {
          EndDialog(hDlg, LOWORD(wParam));
          return TRUE;
        } else if (LOWORD(wParam) == ID_COPY_SYSTEM_REPORT) {
          RootWindowWin* self =
              (RootWindowWin*)GetProp(hDlg, RootWindowHandleProp.data());
          if (self) {
            self->CopySystemReport();
            return TRUE;
          }
        }
        break;
      case WM_RBUTTONDOWN: {
        HMENU popup_menu = CreatePopupMenu();
        POINT click_point = {LOWORD(lParam), HIWORD(lParam)};
        ClientToScreen(hDlg, &click_point);
        auto system_report_caption = GetResourceString(IDS_POPUP_SYSTEM_REPORT);
        InsertMenu(popup_menu, 0, MF_BYPOSITION | MF_STRING,
                   ID_COPY_SYSTEM_REPORT, system_report_caption.c_str());
        TrackPopupMenu(popup_menu, TPM_RIGHTBUTTON, click_point.x,
                       click_point.y, 0, hDlg, NULL);
        break;
      }
      }
      return FALSE;
    }

    // Returns true if the process is per monitor DPI aware.
    bool IsProcessPerMonitorDpiAware() {
      enum class PerMonitorDpiAware {
        UNKNOWN = 0,
        PER_MONITOR_DPI_UNAWARE,
        PER_MONITOR_DPI_AWARE,
      };
      static PerMonitorDpiAware per_monitor_dpi_aware = PerMonitorDpiAware::UNKNOWN;
      if (per_monitor_dpi_aware == PerMonitorDpiAware::UNKNOWN) {
        per_monitor_dpi_aware = PerMonitorDpiAware::PER_MONITOR_DPI_UNAWARE;
        HMODULE shcore_dll = ::LoadLibrary(L"shcore.dll");
        if (shcore_dll) {
          typedef HRESULT(WINAPI* GetProcessDpiAwarenessPtr)(
            HANDLE, PROCESS_DPI_AWARENESS*);
          GetProcessDpiAwarenessPtr func_ptr =
            reinterpret_cast<GetProcessDpiAwarenessPtr>(
              ::GetProcAddress(shcore_dll, "GetProcessDpiAwareness"));
          if (func_ptr) {
            PROCESS_DPI_AWARENESS awareness;
            if (SUCCEEDED(func_ptr(nullptr, &awareness)) &&
              awareness == PROCESS_PER_MONITOR_DPI_AWARE)
              per_monitor_dpi_aware = PerMonitorDpiAware::PER_MONITOR_DPI_AWARE;
          }
        }
      }
      return per_monitor_dpi_aware == PerMonitorDpiAware::PER_MONITOR_DPI_AWARE;
    }

    // DPI value for 1x scale factor.
#define DPI_1X 96.0f

    float GetWindowScaleFactor(HWND hwnd) {
      if (hwnd && IsProcessPerMonitorDpiAware()) {
        typedef UINT(WINAPI* GetDpiForWindowPtr)(HWND);
        static GetDpiForWindowPtr func_ptr = reinterpret_cast<GetDpiForWindowPtr>(
          GetProcAddress(GetModuleHandle(L"user32.dll"), "GetDpiForWindow"));
        if (func_ptr)
          return static_cast<float>(func_ptr(hwnd)) / DPI_1X;
      }

      return client::GetDeviceScaleFactor();
    }

    int GetButtonWidth(HWND hwnd) {
      return LogicalToDevice(BUTTON_WIDTH, GetWindowScaleFactor(hwnd));
    }

    int GetURLBarHeight(HWND hwnd) {
      return LogicalToDevice(URLBAR_HEIGHT, GetWindowScaleFactor(hwnd));
    }
  }  // namespace

  RootWindowWin::RootWindowWin() : updaterService_(MainContext::Get()->GetUserAgent()) {

    // Create a HRGN representing the draggable window area.
    draggable_region_ = ::CreateRectRgn(0, 0, 0, 0);
  }

  RootWindowWin::~RootWindowWin() {
    REQUIRE_MAIN_THREAD();

    ::DeleteObject(draggable_region_);
    ::DeleteObject(font_);

    // The window and browser should already have been destroyed.
    DCHECK(window_destroyed_);
    DCHECK(browser_destroyed_);
  }

  void RootWindowWin::Init(RootWindow::Delegate* delegate,
    std::unique_ptr<RootWindowConfig> config,
    const CefBrowserSettings& settings,
    CefRefPtr<CefDictionaryValue> extra_info) {
    DCHECK(delegate);
    DCHECK(!initialized_);

    delegate_ = delegate;
    always_on_top_ = config->always_on_top;
    app_type_ = config->app_type;
    
    CreateBrowserWindow(config->url);

    initialized_ = true;

    if (CefCurrentlyOn(TID_UI)) {
        ContinueInitOnUIThread(std::move(config), settings);
    } else {
        CefPostTask(TID_UI,
                    base::BindOnce(&RootWindowWin::ContinueInitOnUIThread, this,
                                   std::move(config), settings));
    }
  }

  void RootWindowWin::ContinueInitOnUIThread(
      std::unique_ptr<RootWindowConfig> config,
      const CefBrowserSettings& settings) {
    CEF_REQUIRE_UI_THREAD();

    if (!config->bounds.IsEmpty()) {
        // Initial state was specified via the config object.
        initial_bounds_ = config->bounds;
        initial_show_state_ = config->show_state;
    } else {
        // Initial state may be specified via the command-line or global
        // preferences.
        std::optional<CefRect> bounds;
        if (prefs::LoadWindowRestorePreferences(app_type_, initial_show_state_, bounds) &&
            bounds) {
          initial_bounds_ = CefDisplay::ConvertScreenRectToPixels(*bounds);
        }
    }

    MAIN_POST_CLOSURE(base::BindOnce(&RootWindowWin::ContinueInitOnMainThread,
                                     this, std::move(config), settings));
  }

  void RootWindowWin::ContinueInitOnMainThread(
      std::unique_ptr<RootWindowConfig> config,
      const CefBrowserSettings& settings) {
    REQUIRE_MAIN_THREAD();

    initialized_ = true;

    CreateRootWindow(settings, config->initially_hidden);
    config_ = std::move(config);
  }

  void RootWindowWin::InitAsPopup(RootWindow::Delegate* delegate,
      WebAppType app_type,
      bool with_controls,
      bool is_modal,
      cef_window_handle_t parent_window_handle,
      const CefPopupFeatures& popupFeatures,
      CefWindowInfo& windowInfo,
      CefRefPtr<CefClient>& client,
      CefBrowserSettings& settings,
      CefRefPtr<CefDictionaryValue>& extra_info) {
      app_type_ = app_type;
      is_modal_ = is_modal;
      parent_hwnd_ = parent_window_handle;

      InitAsPopup(delegate, with_controls, popupFeatures, windowInfo, client, settings, extra_info);
  }

  void RootWindowWin::InitAsPopup(RootWindow::Delegate* delegate,
    bool with_controls,
    const CefPopupFeatures& popupFeatures,
    CefWindowInfo& windowInfo,
    CefRefPtr<CefClient>& client,
    CefBrowserSettings& settings,
    CefRefPtr<CefDictionaryValue>& extra_info) {
    CEF_REQUIRE_UI_THREAD();

    DCHECK(delegate);
    DCHECK(!initialized_);

    delegate_ = delegate;
    is_popup_ = true;
    show_menu_ = !popupFeatures.isPopup;

    always_on_top_ = is_modal_ || (app_type_ != WebAppType::broadcast &&
                       app_type_ != WebAppType::stacks);

    if (app_type_ == WebAppType::broadcast) {
      aspect_ratio_ = 16.0 / 9.0;
    }

    std::optional<CefRect> bounds;
    if (not (app_type_ == WebAppType::prompt) && prefs::LoadWindowRestorePreferences(app_type_, initial_show_state_, bounds) &&
        bounds) {
        initial_bounds_ = *bounds;
    }
    else {

        if (popupFeatures.xSet)
            initial_bounds_.x = popupFeatures.x;
        if (popupFeatures.ySet)
            initial_bounds_.y = popupFeatures.y;
        if (popupFeatures.widthSet)
            initial_bounds_.width = popupFeatures.width;
        if (popupFeatures.heightSet)
            initial_bounds_.height = popupFeatures.height;
    }

    //adjust for dpi
    CefRect scaled_rect = CefDisplay::ConvertScreenRectToPixels(initial_bounds_);
    initial_bounds_ = scaled_rect;

    CreateBrowserWindow(std::string());

    initialized_ = true;

    // The new popup is initially parented to a temporary window. The native root
    // window will be created after the browser is created and the popup window
    // will be re-parented to it at that time.
    browser_window_->GetPopupConfig(TempWindow::GetWindowHandle(), windowInfo,
      client, settings);
  }

  void RootWindowWin::Show(ShowMode mode) {
    REQUIRE_MAIN_THREAD();

    if (!hwnd_)
        return;

    int nCmdShow = SW_SHOWNORMAL;
    switch (mode) {
        case ShowMinimized:
          nCmdShow = SW_SHOWMINIMIZED;
          break;
        case ShowMaximized:
          nCmdShow = SW_SHOWMAXIMIZED;
          break;
        case ShowNoActivate:
          nCmdShow = SW_SHOWNOACTIVATE;
          break;
        default:
          break;
    }

    ShowWindow(hwnd_, nCmdShow);
    if (mode != ShowMinimized) {
        UpdateWindow(hwnd_);
    }
  }

  void RootWindowWin::Hide() {
    REQUIRE_MAIN_THREAD();

    if (hwnd_)
      ShowWindow(hwnd_, SW_HIDE);
  }

  WebAppType RootWindowWin::GetWebAppType() const {
    return app_type_;
  }

  void RootWindowWin::SetBounds(int x, int y, size_t width, size_t height) {
    REQUIRE_MAIN_THREAD();

    if (hwnd_) {
      SetWindowPos(hwnd_, nullptr, x, y, static_cast<int>(width),
        static_cast<int>(height), SWP_NOZORDER);
    }
  }

  void RootWindowWin::SetSize(size_t width, size_t height) {
    REQUIRE_MAIN_THREAD();

    OnAutoResize(CefSize((int)width, (int)height));
  }

  void RootWindowWin::SetMinimumSize(size_t width, size_t height) {
      REQUIRE_MAIN_THREAD();

      auto device_scale_factor = GetWindowScaleFactor(hwnd_);
      if (device_scale_factor <= 0) {
          device_scale_factor = 1;
      }
      auto scaled_width = width * device_scale_factor;
      auto scaled_height = height * device_scale_factor;

      // min size has dpi scaled applied when setting
      min_width_ = width;
      min_height_ = height;

      if (hwnd_) {

          RECT rect;
          if (GetWindowRect(hwnd_, &rect))
          {
              int current_width = rect.right - rect.left;
              int current_height = rect.bottom - rect.top;

              if (current_width < scaled_width || current_height < scaled_height) {
                  SetWindowPos(hwnd_, nullptr, 0, 0, static_cast<int>(current_width > scaled_width ? current_width : scaled_width),
                      static_cast<int>(current_height > scaled_height ? current_height : scaled_height), SWP_NOZORDER | SWP_NOMOVE);
              }
          }
      }
  }

  void RootWindowWin::SetMaximumSize(size_t width, size_t height) {
    REQUIRE_MAIN_THREAD();

    auto device_scale_factor = GetWindowScaleFactor(hwnd_);
    if (device_scale_factor <= 0) {
        device_scale_factor = 1;
    }
    auto scaled_width = width * device_scale_factor;
    auto scaled_height = height * device_scale_factor;

    // max size has dpi scaled applied when setting
    max_width_ = width;
    max_height_ = height;

    if (hwnd_) {

        RECT rect;
        if (GetWindowRect(hwnd_, &rect))
        {
            int current_width = rect.right - rect.left;
            int current_height = rect.bottom - rect.top;

            if (scaled_width == 0) {
              scaled_width = current_width;
            }

            if (scaled_height == 0) {
              scaled_height = current_height;
            }

            if (current_width > scaled_width || current_height > scaled_height) {
                SetWindowPos(hwnd_, nullptr, 0, 0, static_cast<int>(current_width < scaled_width ? current_width : scaled_width),
                    static_cast<int>(current_height < scaled_height ? current_height : scaled_height), SWP_NOZORDER | SWP_NOMOVE);
            }
        }
    }
}

  void RootWindowWin::AdjustHeight(int height) {
      if (hwnd_) {

          auto device_scale_factor = GetWindowScaleFactor(hwnd_);
          if (device_scale_factor <= 0) {
              device_scale_factor = 1;
          }
          
          auto scaled_height = height * device_scale_factor;

          RECT rect;
          if (GetWindowRect(hwnd_, &rect))
          {
              int current_width = rect.right - rect.left;
              int current_height = rect.bottom - rect.top;

              SetWindowPos(hwnd_, nullptr, 0, 0, static_cast<int>(current_width),
                  static_cast<int>((current_height + scaled_height)), SWP_NOZORDER | SWP_NOMOVE);

          }
      }
  }

  void RootWindowWin::Close(bool force) {
    REQUIRE_MAIN_THREAD();

    if (hwnd_) {
      if (force) {
        DestroyWindow(hwnd_);
      }
      else
        PostMessage(hwnd_, WM_CLOSE, 0, 0);
    }
  }

  void RootWindowWin::SetDeviceScaleFactor(float device_scale_factor) {
    REQUIRE_MAIN_THREAD();

  }

  float RootWindowWin::GetDeviceScaleFactor() const {
    REQUIRE_MAIN_THREAD();
    return 0.0f;
  }

  CefRefPtr<CefBrowser> RootWindowWin::GetBrowser() const {
    REQUIRE_MAIN_THREAD();

    if (browser_window_)
      return browser_window_->GetBrowser();
    return nullptr;
  }

  ClientWindowHandle RootWindowWin::GetWindowHandle() const {
    REQUIRE_MAIN_THREAD();
    return hwnd_;
  }

  ClientWindowHandle RootWindowWin::GetParentRootWindowHandle() const {
    REQUIRE_MAIN_THREAD();
    return parent_hwnd_;
  }

  void RootWindowWin::SetTitleText(std::string text) {
    if (not titlebar_) {
      return;
    }

    std::wstring title = client::ToWideString(text);

    if (!SetWindowText(titlebar_->GetHwnd(), title.c_str())) {
      DWORD error = GetLastError();
      MainContext::Get()->GetLogger()->error(
          "Unable to set window title text. Error: {0}", error);
    }

    if (titlebar_) {
      titlebar_->Invalidate();
    }
  }

  void RootWindowWin::ShowTitleIndicator(bool show) {
    if (not titlebar_) {
      return;
    }

    titlebar_->SetShowIndicator(show);
  }

  void RootWindowWin::CreateBrowserWindow(const std::string& startup_url) {
    browser_window_.reset(
        new BrowserWindowStdWin(this, false, startup_url));
  }

  void RootWindowWin::CreateRootWindow(const CefBrowserSettings& settings,
    bool initially_hidden) {
    REQUIRE_MAIN_THREAD();
    DCHECK(!hwnd_);

    HINSTANCE hInstance = GetCodeModuleHandle();

    // Load strings from the resource file.
    const std::wstring& window_title = GetWindowName();
    const std::wstring& window_class = GetResourceString(IDC_CEFCLIENT);

    const cef_color_t background_color = MainContext::Get()->GetBackgroundColor();
    const HBRUSH background_brush = CreateSolidBrush(
      RGB(CefColorGetR(background_color), CefColorGetG(background_color),
        CefColorGetB(background_color)));

    // Register the window class.
    RegisterRootClass(hInstance, window_class, background_brush, use_custom_titlebar_);

    download_complete_id_ = RegisterWindowMessage(L"download_complete_cmd");
    CHECK(download_complete_id_);

    CefRefPtr<CefCommandLine> command_line = CefCommandLine::GetGlobalCommandLine();
    const bool no_activate = command_line->HasSwitch(switches::kNoActivate);

    DWORD dwStyle = WS_CLIPCHILDREN | WS_OVERLAPPEDWINDOW;

    if (is_popup_)
    {
      if (is_modal_) {
        dwStyle &= ~(WS_MINIMIZEBOX | WS_SYSMENU | WS_THICKFRAME | WS_MAXIMIZEBOX);
      }
    }

    auto minSize = AppSizes::GetMinimumSize(app_type_);
    min_width_ = minSize.cx;
    min_height_ = minSize.cy;

    DWORD dwExStyle = always_on_top_ ? WS_EX_TOPMOST : 0;
    if (no_activate) {
      // Don't activate the browser window on creation.
      dwExStyle |= WS_EX_NOACTIVATE;
    }

    if (initial_show_state_ == CEF_SHOW_STATE_MAXIMIZED) {
      dwStyle |= WS_MAXIMIZE;
    } else if (initial_show_state_ == CEF_SHOW_STATE_MINIMIZED) {
      dwStyle |= WS_MINIMIZE;
    }

    int x, y, width, height;
    if (initial_bounds_.IsEmpty()) {
      // Use the default window position/size.
      auto scale_factor = GetWindowScaleFactor(hwnd_);
      x = y = CW_USEDEFAULT;
      auto default_size = AppSizes::GetDefaultSize(app_type_);
      width = default_size.cx * scale_factor;
      height = default_size.cy * scale_factor;
    }
    else {
        x = initial_bounds_.x;
        y = initial_bounds_.y;
        width = initial_bounds_.width;
        height = initial_bounds_.height;
    }

    browser_settings_ = settings;


    // Create the main window initially hidden.
    CreateWindowEx(dwExStyle, window_class.c_str(), window_title.c_str(), dwStyle,
      x, y, width, height, is_modal_ ? parent_hwnd_ : nullptr, nullptr, hInstance, this);
    CHECK(hwnd_);

    SetTitleText(client::ToNarrowString(window_title));

    // Due to MiniRemote being always 
    if (app_type_ == WebAppType::mini_remote && !MainContext::Get()->GetApplicationContext()->AllowMiniRemoteCapture()) {
      SetWindowDisplayAffinity(hwnd_, WDA_EXCLUDEFROMCAPTURE);
    }

    if (!called_enable_non_client_dpi_scaling_ && IsProcessPerMonitorDpiAware()) {
      // This call gets Windows to scale the non-client area when WM_DPICHANGED
      // is fired on Windows versions < 10.0.14393.0.
      // Derived signature; not available in headers.
      typedef LRESULT(WINAPI* EnableChildWindowDpiMessagePtr)(HWND, BOOL);
      static EnableChildWindowDpiMessagePtr func_ptr =
        reinterpret_cast<EnableChildWindowDpiMessagePtr>(GetProcAddress(
          GetModuleHandle(L"user32.dll"), "EnableChildWindowDpiMessage"));
      if (func_ptr)
        func_ptr(hwnd_, TRUE);
    }

    if (!initial_bounds_.IsEmpty() && hwnd_ != nullptr)
    {
      SetWindowPos(hwnd_, nullptr, x, y, width, height, SWP_NOOWNERZORDER | SWP_NOREPOSITION | SWP_NOZORDER);
    }

    if ((app_type_ == WebAppType::prompt || app_type_ == WebAppType::toolbox || app_type_ == WebAppType::settings) &&
        is_popup_ && parent_hwnd_)
    {
        CenterWindow(hwnd_, parent_hwnd_);
    }

     //Force redraw of NC area
    SetWindowPos(hwnd_, 0, 0, 0, 0, 0,
      SWP_DRAWFRAME | SWP_NOMOVE | SWP_NOSIZE | SWP_NOACTIVATE | SWP_NOZORDER);

    if (!initially_hidden) {
        ShowMode mode = ShowNormal;
        if (no_activate) {
        mode = ShowNoActivate;
        } else if (initial_show_state_ == CEF_SHOW_STATE_MAXIMIZED) {
        mode = ShowMaximized;
        } else if (initial_show_state_ == CEF_SHOW_STATE_MINIMIZED) {
        mode = ShowMinimized;
        }

        // Show this window.
        Show(mode);

        if (app_type_ == WebAppType::mmhmm || app_type_ == WebAppType::camera ||
            app_type_ == WebAppType::creator) {
          CreatePerformanceMenu();
        }

        if (!is_popup_) {
          ActivateWindow();
#ifdef NDEBUG
          CheckForAppUpdates(false);
#endif
        }
    }

    SetDefaultMinAndMixSizes();
    UpdateMenuItemsByAppType(app_type_);
  }

  // static
  void RootWindowWin::RegisterRootClass(HINSTANCE hInstance,
    const std::wstring& window_class,
    HBRUSH background_brush,
    bool use_custom_titlebar) {
    // Only register the class one time.
    static bool class_registered = false;
    if (class_registered)
      return;
    class_registered = true;

    WNDCLASSEX wcex = { 0 };

    wcex.cbSize = sizeof(WNDCLASSEX);

    wcex.style = CS_HREDRAW | CS_VREDRAW;
    wcex.lpfnWndProc = RootWndProc;
    wcex.cbClsExtra = 0;
    wcex.cbWndExtra = 0;
    wcex.hInstance = hInstance;
    wcex.hIcon = LoadIcon(hInstance, MAKEINTRESOURCE(IDI_CEFCLIENT));
    wcex.hCursor = LoadCursor(nullptr, IDC_ARROW);
    wcex.hbrBackground = background_brush;
    if (not use_custom_titlebar) {
      wcex.lpszMenuName = MAKEINTRESOURCE(IDC_CEFCLIENT);
    }
    wcex.lpszClassName = window_class.c_str();
    wcex.hIconSm = LoadIcon(wcex.hInstance, MAKEINTRESOURCE(IDI_SMALL));

    RegisterClassEx(&wcex);
  }

  // static
  LRESULT CALLBACK RootWindowWin::RootWndProc(HWND hWnd,
    UINT message,
    WPARAM wParam,
    LPARAM lParam) {

    REQUIRE_MAIN_THREAD();

    RootWindowWin* self = nullptr;
    if (message != WM_NCCREATE) {
      self = GetUserDataPtr<RootWindowWin*>(hWnd);
      if (!self)
        return DefWindowProc(hWnd, message, wParam, lParam);
      DCHECK_EQ(hWnd, self->hwnd_);
    }

    if (self && message == self->download_complete_id_) {
      self->OnInstall();
    }

    // Callback for the main window
    switch (message) {
    case WM_COMMAND:
      if (self->OnCommand(LOWORD(wParam)))
        return 0;
      break;

    case WM_GETOBJECT: {
      // Only the lower 32 bits of lParam are valid when checking the object id
      // because it sometimes gets sign-extended incorrectly (but not always).
      DWORD obj_id = static_cast<DWORD>(static_cast<DWORD_PTR>(lParam));

      // Accessibility readers will send an OBJID_CLIENT message.
      if (static_cast<DWORD>(OBJID_CLIENT) == obj_id) {
        if (self->GetBrowser() && self->GetBrowser()->GetHost())
          self->GetBrowser()->GetHost()->SetAccessibilityState(STATE_ENABLED);
      }
    } break;

    case WM_ENABLE: {
      if (wParam == TRUE) {
        // Give focus to the browser after EnableWindow enables this window
        // (e.g. after a modal dialog is dismissed).
        self->OnFocus();
        return 0;
      }
    } break;

    case WM_PAINT:
      self->OnPaint();
      return 0;

    case WM_ACTIVATE:
      self->OnActivate(LOWORD(wParam) != WA_INACTIVE);
      // Allow DefWindowProc to set keyboard focus.
      break;

    case WM_SETFOCUS:
      self->OnFocus();
      return 0;

    case WM_SIZE:
      self->OnSize(wParam == SIZE_MINIMIZED);
      break;

    case WM_MOVING:
    case WM_MOVE:
      self->OnMove();
      return 0;

    case WM_DPICHANGED:
      self->OnDpiChanged(wParam, lParam);
      break;

    case WM_ERASEBKGND:
      if (self->OnEraseBkgnd())
        break;
      // Don't erase the background.
      return 0;

    case WM_ENTERMENULOOP:
      if (!wParam) {
        // Entering the menu loop for the application menu.
        CefSetOSModalLoop(true);
      }
      break;

    case WM_EXITMENULOOP:
      if (!wParam) {
        // Exiting the menu loop for the application menu.
        CefSetOSModalLoop(false);
      }
      break;

    case WM_CLOSE:
      if (self->OnClose())
        return 0;  // Cancel the close.
      break;
    case WM_SIZING:
      self->side_being_dragged_ = wParam;
      break;
    case WM_WINDOWPOSCHANGING:
    {
      self->OnWindowPosChanging(lParam);
    }
    break;

    case WM_NCHITTEST: {
      LRESULT hit = DefWindowProc(hWnd, message, wParam, lParam);
      return self->OnNCHitTest(hit, lParam);
    }

    case WM_NCCREATE: {
      CREATESTRUCT* cs = reinterpret_cast<CREATESTRUCT*>(lParam);
      self = reinterpret_cast<RootWindowWin*>(cs->lpCreateParams);
      DCHECK(self);
      // Associate |self| with the main window.
      SetUserDataPtr(hWnd, self);
      self->hwnd_ = hWnd;

      self->OnNCCreate(cs);
    } break;

    case WM_CREATE:
      self->OnCreate(reinterpret_cast<CREATESTRUCT*>(lParam));
      break;

    case WM_NCDESTROY:
      if (self->use_custom_titlebar_ && self->auto_hide_toolbar_) {
        KillTimer(hWnd, self->mouse_timer_id);
      }
      // Clear the reference to |self|.
      SetUserDataPtr(hWnd, nullptr);
      self->hwnd_ = nullptr;
      self->OnDestroyed();
      break;

    case WM_GETMINMAXINFO: {
      auto scale_factor = GetWindowScaleFactor(self->hwnd_);

      HMONITOR monitor =
          MonitorFromWindow(self->hwnd_, MONITOR_DEFAULTTONEAREST);

      LPMINMAXINFO lpMMI = (LPMINMAXINFO)lParam;
      lpMMI->ptMinTrackSize.x = self->min_width_ * scale_factor;
      lpMMI->ptMinTrackSize.y = self->min_height_ * scale_factor;

      // If we are adjusting either the height or width then both need set.
      // The window will overlap or be behind the task bar if the height isn't asjusted.
      if (self->max_width_ > 0 || self->max_height_ > 0) {
        MONITORINFO monitor_info = {0};
        monitor_info.cbSize = sizeof(MONITORINFO);

        if (!GetMonitorInfo(monitor, &monitor_info))
          break;

        auto x_edge = GetSystemMetrics(SM_CXEDGE);
        auto y_edge = GetSystemMetrics(SM_CYEDGE);
        auto x_padding = GetSystemMetrics(SM_CXPADDEDBORDER);

        lpMMI->ptMaxSize.x =
            monitor_info.rcWork.right - monitor_info.rcWork.left - lpMMI->ptMaxPosition.x + 2*(x_edge + x_padding);
        lpMMI->ptMaxSize.y =
            monitor_info.rcWork.bottom - monitor_info.rcWork.top - lpMMI->ptMaxPosition.y + 2*(y_edge + x_padding);

        if (self->max_width_ > 0) {
          lpMMI->ptMaxTrackSize.x = std::min(
              (LONG)(self->max_width_ * scale_factor), lpMMI->ptMaxTrackSize.x);
          lpMMI->ptMaxSize.x = std::min((LONG)(self->max_width_ * scale_factor),
                                        lpMMI->ptMaxSize.x);
        }

        if (self->max_height_ > 0) {
          lpMMI->ptMaxTrackSize.y =
              std::min((LONG)(self->max_height_ * scale_factor),
                       lpMMI->ptMaxTrackSize.y);
          lpMMI->ptMaxSize.y = std::min(
              (LONG)(self->max_height_ * scale_factor), lpMMI->ptMaxSize.y);
        }
      }
      break;
    }
    case WM_TIMER:
    {
      self->OnTimer();
      break;
    }
    case WM_NCCALCSIZE: {
      if (!wParam) return DefWindowProc(hWnd, message, wParam, lParam);
      self->OnNCCalcSize((NCCALCSIZE_PARAMS*)lParam);
      return 0;
    }
    case WM_NCMOUSEMOVE: {
      self->OnNCMouseMove();
      break;
    }
    case WM_MOUSEMOVE: {
      self->OnMouseMove();
      break;
    }
    case WM_MOUSELEAVE: {
      self->OnMouseLeave();
      break;
    }
    case WM_NCMOUSELEAVE: {
      self->OnNCMouseLeave();
      break;
    }
    case WM_NCLBUTTONDOWN: {
      if (self->OnMouseButtonDown()) {
        return 0;
      }
      break;
    }
    case WM_NCLBUTTONUP: {
      if (self->OnMouseButtonUp(lParam)) {
        return 0;
      }
      break;
    }
    }

    return DefWindowProc(hWnd, message, wParam, lParam);
  }

  void RootWindowWin::OnPaint() {
    PAINTSTRUCT ps;
    BeginPaint(hwnd_, &ps);
    EndPaint(hwnd_, &ps);
  }

  void RootWindowWin::OnFocus() {
    // Selecting "Close window" from the task bar menu may send a focus
    // notification even though the window is currently disabled (e.g. while a
    // modal JS dialog is displayed).
    if (browser_window_ && ::IsWindowEnabled(hwnd_))
      browser_window_->SetFocus(true);
  }

  void RootWindowWin::OnActivate(bool active) {
    if (active)
      delegate_->OnRootWindowActivated(this);

    if (titlebar_ && use_custom_titlebar_) {
      titlebar_->OnActivate();
    }
  }

  void RootWindowWin::OnSize(bool minimized) {
    if (minimized) {
      // Notify the browser window that it was hidden and do nothing further.
      if (browser_window_)
      browser_window_->Hide();
      return;
    }

    if (titlebar_) {
      RECT client_rect;
      GetClientRect(hwnd_, &client_rect);
      auto titlebar_rect = titlebar_->GetTitlebarRect(hwnd_);
      SetWindowPos(
          browser_wrapper_hwnd_, nullptr, 0,
          auto_hide_toolbar_ ? 0 : titlebar_rect.bottom - titlebar_rect.top,
          client_rect.right,
          client_rect.bottom - (auto_hide_toolbar_
                                    ? 0
                                    : titlebar_rect.bottom - titlebar_rect.top),
          SWP_SHOWWINDOW);

      RECT wrapper_rect;
      GetClientRect(browser_wrapper_hwnd_, &wrapper_rect);

      if (browser_window_) {
      browser_window_->Show();
      browser_window_->SetBounds(0, 0, wrapper_rect.right, wrapper_rect.bottom);
      }

      if (auto_hide_toolbar_ && !is_mouse_inside_) {
      titlebar_rect = {0};
      }
      SetWindowPos(titlebar_->GetHwnd(), HWND_TOP, 0, 0,
                   titlebar_rect.right - titlebar_rect.left,
                   titlebar_rect.bottom - titlebar_rect.top,
                   SWP_NOMOVE | SWP_SHOWWINDOW);

      if (auto_hide_toolbar_) {
        // Set draggable region so that NCHitTest events fall through to the main
        // window.
        CefDraggableRegion drag_region;
        drag_region.bounds.x = 0;
        drag_region.bounds.y = 0;
        drag_region.bounds.width = titlebar_rect.right - titlebar_rect.left;
        drag_region.bounds.height = titlebar_rect.bottom - titlebar_rect.top;
        drag_region.draggable = true;

        OnSetDraggableRegions({ drag_region });
      }
    }
  }

  void RootWindowWin::OnMove() {
    // Notify the browser of move events so that popup windows are displayed
    // in the correct location and dismissed when the window moves.
    CefRefPtr<CefBrowser> browser = GetBrowser();
    if (browser)
      browser->GetHost()->NotifyMoveOrResizeStarted();
  }

  void RootWindowWin::OnDpiChanged(WPARAM wParam, LPARAM lParam) {
    if (LOWORD(wParam) != HIWORD(wParam)) {
      NOTIMPLEMENTED() << "Received non-square scaling factors";
      return;
    }

    // Suggested size and position of the current window scaled for the new DPI.
    const RECT* rect = reinterpret_cast<RECT*>(lParam);
    SetBounds(rect->left, rect->top, rect->right - rect->left,
      rect->bottom - rect->top);

    if (titlebar_) {
      titlebar_->DpiChanged();
    }
  }

  bool RootWindowWin::OnEraseBkgnd() {
    // Erase the background when the browser does not exist.
    return (GetBrowser() == nullptr);
  }

  bool RootWindowWin::OnCommand(UINT id) {
    switch (id) {
      case ID_VIEW_RELOAD: {
        auto browser = GetBrowser();
        if (browser)
          browser->Reload();
        return true;
      }
    case IDM_ABOUT:
      OnAbout();
      return true;
    case ID_HELP_RELEASENOTES:
      OnReleaseNotes();
      return true;
    case ID_HELP_CENTER:
      OnHelpCenter();
      return true;
    case ID_HELP_ACTIVITY:
      OnLaunchActivityLogs();
      return true;
    case ID_SAVE_LOGS_TO_ZIP:
      SaveLogsToZip();
      return true;
    case IDM_EXIT:
      Close(false);
      return true;
    case IDC_NAV_BACK:  // Back button
      if (CefRefPtr<CefBrowser> browser = GetBrowser())
        browser->GoBack();
      return true;
    case IDC_NAV_FORWARD:  // Forward button
      if (CefRefPtr<CefBrowser> browser = GetBrowser())
        browser->GoForward();
      return true;
    case IDC_NAV_RELOAD:  // Reload button
      if (CefRefPtr<CefBrowser> browser = GetBrowser())
        browser->Reload();
      return true;
    case IDC_NAV_STOP:  // Stop button
      if (CefRefPtr<CefBrowser> browser = GetBrowser())
        browser->StopLoad();
      return true;
    case IDM_UPDATES:
      OnCheckForUpdates();
      return true;
    case ID_DEFAULT_GPU:
      OnPerfromanceItemClicked(ID_DEFAULT_GPU);
      return true;
    case ID_LOW_GPU:
      OnPerfromanceItemClicked(ID_LOW_GPU);
      return true;
    case ID_HIGH_GPU:
      OnPerfromanceItemClicked(ID_HIGH_GPU);
      return true;
    case ID_BALANCED_MODE:
      OnBalanceModeItemClicked(false);
      return true;
    case ID_JOIN_BETA:
      OnJoinBetaClicked();
      return true;
    case ID_LEAVE_BETA:
      OnLeaveBetaClicked();
      return true;
    case ID_MINI_REMOTE:
      OnMiniRemoteClicked();
      return true;
    case ID_BROADCAST:
      OnBroadcastClicked();
      return true;
    case ID_HYBRID_API_TESTER:
      OnHybridApiTesterClicked();
      return true;
    case ID_SETTINGS:
      OnSettingsClicked();
      return true;
    case ID_SHOW_DEV_TOOLS:
      OnShowDevToolsClicked();
      return true;
    case ID_EDIT_UNDO:
      OnUndo();
      return true;
    case ID_EDIT_REDO:
      OnRedo();
      return true;
    case ID_EDIT_CUT:
      OnCut();
      return true;
    case ID_EDIT_COPY:
      OnCopy();
      return true;
    case ID_EDIT_PASTE:
      OnPaste();
      return true;
    case ID_INSTALL_CAMERA:
      OnCameraInstallClicked();
      return true;
    case ID_UNINSTALL_CAMERA:
      OnCameraUninstallClicked();
      return true;
    }

    return false;
  }

  void RootWindowWin::OnAbout() {
    // Show the about box.
    if (DialogBoxParam(GetCodeModuleHandle(), MAKEINTRESOURCE(IDD_ABOUTBOX),
                       hwnd_, AboutWndProc, (LPARAM)this) == ID_CREDITS) {
      OnLaunchCredits();
    }
  }

  void RootWindowWin::OnNCCreate(LPCREATESTRUCT lpCreateStruct) {
    if (IsProcessPerMonitorDpiAware()) {
      // This call gets Windows to scale the non-client area when WM_DPICHANGED
      // is fired on Windows versions >= 10.0.14393.0.
      typedef BOOL(WINAPI* EnableNonClientDpiScalingPtr)(HWND);
      static EnableNonClientDpiScalingPtr func_ptr =
        reinterpret_cast<EnableNonClientDpiScalingPtr>(GetProcAddress(
          GetModuleHandle(L"user32.dll"), "EnableNonClientDpiScaling"));
      called_enable_non_client_dpi_scaling_ = !!(func_ptr && func_ptr(hwnd_));
    }
  }

  INT_PTR CALLBACK RootWindowWin::DownloadWndProc(HWND hDlg,
    UINT message,
    WPARAM wParam,
    LPARAM lParam) {

    RootWindowWin* self = GetUserDataPtr<RootWindowWin*>(hDlg);
    DCHECK(self);

    UNREFERENCED_PARAMETER(lParam);
    switch (message) {
    case WM_INITDIALOG:
      return TRUE;

    case WM_CLOSE:
      self->updaterService_.CancelDownload();
      EndDialog(hDlg, LOWORD(wParam));
      return TRUE;
    }

    return CallWindowProc(self->download_wndproc_old_, hDlg, message, wParam, lParam);
  }

  void RootWindowWin::CancelDownload()
  {
    updaterService_.CancelDownload();
  }

  void RootWindowWin::OnCheckForUpdates()
  {
    CheckForAppUpdates(true);
  }

  void RootWindowWin::JoinBeta() {
    auto retVal = MessageBox(hwnd_, GetResourceString(IDS_MESSAGE_JOIN_BETA_DESC).c_str(),
        GetResourceString(IDS_MESSAGE_JOIN_BETA_CAPTION).c_str(),
        MB_YESNO | MB_ICONQUESTION);
    if (retVal == IDYES) {
    DownloadInstaller(std::wstring{mmhmm::TrackConstants::Beta});
    }
  }

    void RootWindowWin::LeaveBeta() {
    auto retVal = MessageBox(
          hwnd_, GetResourceString(IDS_MESSAGE_LEAVE_BETA_DESC).c_str(),
          GetResourceString(IDS_MESSAGE_LEAVE_BETA_DESC).c_str(),
                   MB_YESNO | MB_ICONQUESTION);
    if (retVal == IDYES) {
    DownloadInstaller(std::wstring{mmhmm::TrackConstants::Prod});
    }
  }

  void RootWindowWin::DownloadInstaller(std::wstring track) {
    dialogHandle_ = CreateDialog(
        GetCodeModuleHandle(), MAKEINTRESOURCE(IDD_DOWNLOADPROGRESS), hwnd_, 0);

    // Override the download control's window procedure.
    download_wndproc_old_ = SetWndProcPtr(dialogHandle_, DownloadWndProc);

    SetUserDataPtr(dialogHandle_, this);
    progressHandle_ = GetDlgItem(dialogHandle_, IDC_PROGRESSBAR);
    SendMessage(progressHandle_, PBM_SETRANGE, 0, MAKELPARAM(0, 100));
    SendMessage(progressHandle_, PBM_SETSTEP, (WPARAM)1, 0);
    ShowWindow(dialogHandle_, 1);
    UpdateWindow(dialogHandle_);

    auto downloadCallback = std::bind(&RootWindowWin::DownloadCallback, this,
                                      std::placeholders::_1);
    auto downloadProgress = std::bind(&RootWindowWin::DownloadProgress, this,
                                      std::placeholders::_1);

    downloadResult_ =
        std::async(std::launch::async,
                   &mmhmm::AppUpdaterService::DownloadLatestInstallerByTrack,
                   &updaterService_,track, downloadCallback, downloadProgress);
  }

  void RootWindowWin::CheckForAppUpdates(bool notifyOnNoUpdates)
  {
    if (updaterService_.CheckForUpdates())
    {
      // a newer version exists;
      auto retVal =
          MessageBox(hwnd_, GetResourceString(IDS_MESSAGE_UPDATE_DESC).c_str(),
                     GetResourceString(IDS_MESSAGE_UPDATE_CAPTION).c_str(),
                     MB_YESNO | MB_ICONQUESTION | MB_TOPMOST);
      if (retVal == IDYES)
      {

        dialogHandle_ =
            CreateDialog(GetCodeModuleHandle(),
                         MAKEINTRESOURCE(IDD_DOWNLOADPROGRESS), hwnd_,
          0);

        
       // Override the download control's window procedure.
        download_wndproc_old_ = SetWndProcPtr(dialogHandle_, DownloadWndProc);

        // Associate |this| with the edit window.
        SetUserDataPtr(dialogHandle_, this);


        progressHandle_ = GetDlgItem(dialogHandle_, IDC_PROGRESSBAR);


        SendMessage(progressHandle_, PBM_SETRANGE, 0, MAKELPARAM(0, 100));

        SendMessage(progressHandle_, PBM_SETSTEP, (WPARAM)1, 0);


        ShowWindow(dialogHandle_, 1);
        UpdateWindow(dialogHandle_);

        auto downloadCallback = std::bind(&RootWindowWin::DownloadCallback, this, std::placeholders::_1);
        auto downloadProgress = std::bind(&RootWindowWin::DownloadProgress, this, std::placeholders::_1);

        downloadResult_ = std::async(std::launch::async, &mmhmm::AppUpdaterService::DownloadLatestInstallerForCurrentTrack, &updaterService_, downloadCallback, downloadProgress);
      }
    }
    else if (notifyOnNoUpdates)
    {
      MessageBox(hwnd_, GetResourceString(IDS_MESSAGE_NO_UPDATE_DESC).c_str(),
                 GetResourceString(IDS_MESSAGE_NO_UPDATE_CAPTION).c_str(),
                 MB_OK | MB_ICONINFORMATION);
    }
  }

  void RootWindowWin::DownloadCallback(bool successful)
  {
    if (dialogHandle_ && successful)
    {
      PostMessage(dialogHandle_, WM_CLOSE, 0, 0);
      PostMessage(hwnd_, download_complete_id_, 0, 0);
    }
  }

  void RootWindowWin::DownloadProgress(int percentageDownloaded)
  {
    if (progressHandle_)
    {
      SendMessage(progressHandle_, PBM_SETPOS, (int)percentageDownloaded, 0);
    }
  }

void RootWindowWin::OnCreate(LPCREATESTRUCT lpCreateStruct) {

  RECT rect;
  GetClientRect(hwnd_, &rect);

  if (!show_menu_)
  {
    SetMenu(hwnd_, nullptr);
  }

  browser_wrapper_hwnd_ = CreateBrowserWrapper(hwnd_);

  if (!is_popup_) {
    //Only set once when creating the root window.
    SetUserObjectInformation(GetCurrentProcess(),
      UOI_TIMERPROC_EXCEPTION_SUPPRESSION, FALSE, 1);

    // Create the browser window.
    CefRect cef_rect(rect.left, rect.top, rect.right - rect.left,
                     rect.bottom - rect.top);
    browser_window_->CreateBrowser(browser_wrapper_hwnd_, cef_rect, browser_settings_, nullptr,
                                   delegate_->GetRequestContext(this));
  } else {
    // With popups we already have a browser window. Parent the browser window
    // to the root window and show it in the correct location.
    browser_window_->ShowPopup(browser_wrapper_hwnd_, rect.left, rect.top,
                               rect.right - rect.left, rect.bottom - rect.top);
  }

  if (use_custom_titlebar_) {
    main_menu_ = CreateMenuByAppType(app_type_);
    auto_hide_toolbar_ = (app_type_ == WebAppType::broadcast);
    titlebar_ = controls::Titlebar::Create(
        hwnd_, GetResourceString(IDS_APP_TITLE), GetTitlebarButtonsByAppType(app_type_),
        auto_hide_toolbar_);
    SetStatusVisibility(Visibility::Hidden);
    titlebar_->SetToolboxVisibility(app_type_ == WebAppType::stacks || app_type_ == WebAppType::screen_recorder ? Visibility::Visible : Visibility::Hidden);
    use_custom_titlebar_ = true;
    titlebar_->SetCloseCallback(
      std::bind(&RootWindowWin::OnCloseButtonClicked, this));
    titlebar_->SetMaximizeCallback(
      std::bind(&RootWindowWin::OnMaximizeButtonClicked, this));
    titlebar_->SetMinimizeCallback(
      std::bind(&RootWindowWin::OnMinimizeButtonClicked, this));
    titlebar_->SetShowMenuCallback(std::bind(&RootWindowWin::OnMenuClicked,
      this, std::placeholders::_1));
    titlebar_->SetActionButtonClickedCallback(
        std::bind(&RootWindowWin::OnActionButtonClicked, this));
    titlebar_->SetToolboxButtonClickedCallback(
        std::bind(&RootWindowWin::OnToolboxButtonClicked, this));
    theme_ = MainContext::Get()->GetApplicationContext()->GetTheme();
    titlebar_->SetTheme(theme_);
    if (auto_hide_toolbar_) {
      //mouse events are unreliable so use a timer to track mouse over state
      SetTimer(hwnd_, mouse_timer_id, 100, NULL);
    }
    UpdateCameraMenusState();
  }
}

void RootWindowWin::SaveWindowRestoreInformation() {
  WINDOWPLACEMENT placement;
  ::GetWindowPlacement(hwnd_, &placement);

  if (CefCurrentlyOn(TID_UI)) {
    if (app_type_ != WebAppType::prompt) {
      SaveWindowRestoreOnUIThread(placement, hwnd_, app_type_);
    }
  } else {
    CefPostTask(TID_UI,
                base::BindOnce(&RootWindowWin::SaveWindowRestoreOnUIThread,
                               placement, hwnd_, app_type_));
  }
}

bool RootWindowWin::OnClose() {

  SaveWindowRestoreInformation();

  if (browser_window_ && !browser_window_->IsClosing()) {
    CefRefPtr<CefBrowser> browser = GetBrowser();
    if (browser) {
      // Notify the browser window that we would like to close it. This
      // will result in a call to ClientHandler::DoClose() if the
      // JavaScript 'onbeforeunload' event handler allows it.
      browser->GetHost()->CloseBrowser(false);

      // Cancel the close.
      return true;
    }
  }

  // Allow the close.
  return false;
}

void RootWindowWin::OnDestroyed() {
  window_destroyed_ = true;
  NotifyDestroyedIfDone();
}

LRESULT RootWindowWin::OnNCHitTest(LRESULT hit, LPARAM lparam) {
  if (hit == HTCLIENT) {
    POINTS points = MAKEPOINTS(lparam);
    POINT point = { points.x, points.y };
    ScreenToClient(hwnd_, &point);
    RECT titlebar_rect = titlebar_->GetTitlebarRect(hwnd_);

    UINT dpi = GetDpiForWindow(hwnd_);
    int border_size = GetSystemMetricsForDpi(SM_CXFRAME, dpi);

    RECT border = titlebar_rect;
    border.bottom = border_size;
    if (PtInRect(&border, point)) {
      return HTTOP;
    }

    auto button_rects = titlebar_->GetButtonRecs(&titlebar_rect);
    if (PtInRect(&button_rects.close, point)) {
      return HTCLOSE;
    } else if (PtInRect(&button_rects.minimize, point)) {
      return HTMINBUTTON;
    } else if (PtInRect(&button_rects.maximize, point)) {
      return HTMAXBUTTON;
    }

    if (PtInRegion(draggable_region_, point.x, point.y) || PtInRect(&titlebar_rect, point)) {
      // If cursor is inside a draggable region return HTCAPTION to allow
      // dragging.
      return HTCAPTION;
    }
  }
  return hit;
}

void RootWindowWin::OnWindowPosChanging(LPARAM lparam) {
  WINDOWPOS* win_pos = (WINDOWPOS*)lparam;

  RECT client_area;
  GetClientRect(hwnd_, &client_area);

  if (aspect_ratio_ == 0) {
    return;
  }

  // Adjust window dimensions to maintain aspect ratio
  switch (side_being_dragged_) {
    case WMSZ_BOTTOM:
    case WMSZ_TOPRIGHT:
      win_pos->cx = ((int)((double)win_pos->cy) * aspect_ratio_);
      break;

    case WMSZ_RIGHT:
    case WMSZ_BOTTOMLEFT:
    case WMSZ_BOTTOMRIGHT:
      win_pos->cy = ((int)((double)win_pos->cx) / aspect_ratio_);
      break;

    case WMSZ_TOP: {
      // Adjust the x position of the window to make it appear
      // that the bottom right side is anchored
      WINDOWPOS old = *win_pos;

      win_pos->cx = (int)((double)win_pos->cy * aspect_ratio_);

      win_pos->x += old.cx - win_pos->cx;
      ;
    } break;

    case WMSZ_LEFT:
    case WMSZ_TOPLEFT: {
      // Adjust the y position of the window to make it appear
      // the bottom right side is anchored. TOPLEFT resizing
      // will move the window around if you don't do this
      WINDOWPOS old = *win_pos;
      win_pos->cy = (int)((double)win_pos->cx / aspect_ratio_);

      win_pos->y += old.cy - win_pos->cy;
    } break;
  }
}

void RootWindowWin::OnTimer() {
  POINT pt;
  RECT rect;

  // if we aren't the active window skip autohide behavior
  if (!hwnd_ || GetForegroundWindow() != hwnd_) {
    return;
  }

  GetCursorPos(&pt);
  GetWindowRect(hwnd_, &rect);
  if (!PtInRect(&rect, pt)) {

    if (is_mouse_inside_ && auto_hide_toolbar_) {
      is_mouse_inside_ = false;
      InvalidateRect(hwnd_, NULL, true);
      OnSize(false);
    }
  }
  else {
    if (!is_mouse_inside_ && auto_hide_toolbar_) {
      is_mouse_inside_ = true;
      InvalidateRect(hwnd_, NULL, true);
      OnSize(false);
    }
  }
}

void RootWindowWin::OnNCCalcSize(NCCALCSIZE_PARAMS* size_params) {
  UINT dpi = GetDpiForWindow(hwnd_);

  int frame_x = GetSystemMetricsForDpi(SM_CXFRAME, dpi);
  int frame_y = GetSystemMetricsForDpi(SM_CYFRAME, dpi);
  int padding = GetSystemMetricsForDpi(SM_CXPADDEDBORDER, dpi);

  RECT* requested_client_rect = size_params->rgrc;

  requested_client_rect->right -= frame_x + padding;
  requested_client_rect->left += frame_x + padding;
  requested_client_rect->bottom -= frame_y + padding;

  if (mmhmm::utils::IsWindowMaximized(hwnd_)) {
    requested_client_rect->top += padding;
  }
}

void RootWindowWin::OnNCMouseMove() {
  if (titlebar_ && use_custom_titlebar_) {
    titlebar_->OnMouseMove();
  }
}

void RootWindowWin::OnNCMouseLeave() {
  if (titlebar_ && use_custom_titlebar_) {
    titlebar_->OnMouseMove();
  }
}

void RootWindowWin::OnMouseMove() {
  if (titlebar_ && use_custom_titlebar_) {
    titlebar_->OnMouseMove();
  }
}

void RootWindowWin::OnMouseLeave() {
  if (titlebar_ && use_custom_titlebar_) {
    titlebar_->OnMouseMove();
  }
}

bool RootWindowWin::OnMouseButtonDown() {
  if (titlebar_ && use_custom_titlebar_) {
    return titlebar_->OnMouseButtonDown();
  }

  return false;
}

bool RootWindowWin::OnMouseButtonUp(LPARAM lparam) {
  if (titlebar_ && use_custom_titlebar_) {
    return titlebar_->OnMouseButtonUp(lparam);
  }

  return false;
}

void RootWindowWin::OnBrowserCreated(CefRefPtr<CefBrowser> browser) {
  REQUIRE_MAIN_THREAD();

  if (is_popup_) {
    // For popup browsers create the root window once the browser has been
    // created.
    CreateRootWindow(CefBrowserSettings(), false);

    if (parent_hwnd_ && is_modal_)
    {
      EnableWindow(parent_hwnd_, false);
    }
  } else {
    // Make sure the browser is sized correctly.
    OnSize(false);
  }

  delegate_->OnBrowserCreated(this, browser);
}

void RootWindowWin::OnBrowserWindowDestroyed() {
  REQUIRE_MAIN_THREAD();

  browser_window_.reset();

  if (!window_destroyed_) {
    // off-screen rendering or native (external) parent, or execution of
    // JavaScript window.close(). Close the RootWindow asyncronously to allow
    // the current call stack to unwind.
    MAIN_POST_CLOSURE(base::BindOnce(&RootWindowWin::Close, this, true));
  }

  if (parent_hwnd_ && is_modal_)
  {
    EnableWindow(parent_hwnd_, true);
    SetFocus(parent_hwnd_);
  }

  browser_destroyed_ = true;
  NotifyDestroyedIfDone();
}

void RootWindowWin::OnSetAddress(const std::string& url) {
  REQUIRE_MAIN_THREAD();
}

void RootWindowWin::OnSetTitle(const std::string& title) {
  REQUIRE_MAIN_THREAD();
}

void RootWindowWin::OnSetFullscreen(bool fullscreen) {
  REQUIRE_MAIN_THREAD();
}

void RootWindowWin::OnAutoResize(const CefSize& new_size) {
  REQUIRE_MAIN_THREAD();

  if (!hwnd_)
    return;

  int new_width = new_size.width;

  // Make the window wide enough to drag by the top menu bar.
  if (new_width < 200)
    new_width = 200;

  const float device_scale_factor = GetWindowScaleFactor(hwnd_);
  RECT rect = {0, 0, LogicalToDevice(new_width, device_scale_factor),
               LogicalToDevice(new_size.height, device_scale_factor)};

  // Size the window. The left/top values may be negative.
  // Also show the window if it's not currently visible.
  SetWindowPos(hwnd_, nullptr, 0, 0, rect.right - rect.left,
               rect.bottom - rect.top,
               SWP_NOZORDER | SWP_NOMOVE | SWP_NOACTIVATE | SWP_SHOWWINDOW);
}

void RootWindowWin::OnSetLoadingState(bool isLoading,
                                      bool canGoBack,
                                      bool canGoForward) {
  REQUIRE_MAIN_THREAD();

  if (!isLoading && GetWindowLongPtr(hwnd_, GWL_EXSTYLE) & WS_EX_NOACTIVATE) {
    // Done with the initial navigation. Remove the WS_EX_NOACTIVATE style so
    // that future mouse clicks inside the browser correctly activate and focus
    // the window. For the top-level window removing this style causes Windows
    // to display the task bar button.
    SetWindowLongPtr(hwnd_, GWL_EXSTYLE,
                     GetWindowLongPtr(hwnd_, GWL_EXSTYLE) & ~WS_EX_NOACTIVATE);

    if (browser_window_) {
      HWND browser_hwnd = browser_window_->GetWindowHandle();
      SetWindowLongPtr(
          browser_hwnd, GWL_EXSTYLE,
          GetWindowLongPtr(browser_hwnd, GWL_EXSTYLE) & ~WS_EX_NOACTIVATE);
    }
  }

  if (!isLoading && MainContext::Get()->PendingCommandLineProcessing())
  {
    // Processing all the commands at the same time. 
    // If we need to have staged processing we should introduce a task queue that can be actioned after each navigation following a complete task
    MainContext::Get()->SetPendingCommandLineProcessing(false);
    MainContext::Get()->GetApplicationContext()->OnArgsReceived(
        MainContext::Get()->GetCommandLineString());
  }

  if (!isLoading && !is_popup_) {
    auto web_app_version_msg = CefProcessMessage::Create("getWebAppVersion");
    auto browser = GetBrowser();
    if (!browser)
      return;

    auto main_frame = browser->GetMainFrame();
    if (main_frame) {
      main_frame->SendProcessMessage(PID_RENDERER, web_app_version_msg);
    }

    //if mini remote is open, re-establish link with web app
    auto mini_remote_manager = MainContext::Get()->GetMiniRemoteManager();
    if (mini_remote_manager && mini_remote_manager->IsOpen()) {
      mini_remote_manager->Initialize();
    }

    auto host = browser->GetHost();
    if (host) {
      host->SetFocus(true);
    }

    initial_load_complete_.store(true);
  }
}

namespace {

LPCWSTR kParentWndProc = L"CefParentWndProc";
LPCWSTR kDraggableRegion = L"CefDraggableRegion";

LRESULT CALLBACK SubclassedWindowProc(HWND hWnd,
                                      UINT message,
                                      WPARAM wParam,
                                      LPARAM lParam) {
  WNDPROC hParentWndProc =
      reinterpret_cast<WNDPROC>(::GetPropW(hWnd, kParentWndProc));
  HRGN hRegion = reinterpret_cast<HRGN>(::GetPropW(hWnd, kDraggableRegion));

  if (message == WM_NCHITTEST) {
    LRESULT hit = CallWindowProc(hParentWndProc, hWnd, message, wParam, lParam);
    if (hit == HTCLIENT) {
      POINTS points = MAKEPOINTS(lParam);
      POINT point = {points.x, points.y};
      ::ScreenToClient(hWnd, &point);
      if (::PtInRegion(hRegion, point.x, point.y)) {
        // Let the parent window handle WM_NCHITTEST by returning HTTRANSPARENT
        // in child windows.
        return HTTRANSPARENT;
      }
    }
    return hit;
  }

  return CallWindowProc(hParentWndProc, hWnd, message, wParam, lParam);
}

void SubclassWindow(HWND hWnd, HRGN hRegion) {
  HANDLE hParentWndProc = ::GetPropW(hWnd, kParentWndProc);
  if (hParentWndProc) {
    return;
  }

  SetLastError(0);
  LONG_PTR hOldWndProc = SetWindowLongPtr(
      hWnd, GWLP_WNDPROC, reinterpret_cast<LONG_PTR>(SubclassedWindowProc));
  if (hOldWndProc == 0 && GetLastError() != ERROR_SUCCESS) {
    return;
  }

  ::SetPropW(hWnd, kParentWndProc, reinterpret_cast<HANDLE>(hOldWndProc));
  ::SetPropW(hWnd, kDraggableRegion, reinterpret_cast<HANDLE>(hRegion));
}

void UnSubclassWindow(HWND hWnd) {
  LONG_PTR hParentWndProc =
      reinterpret_cast<LONG_PTR>(::GetPropW(hWnd, kParentWndProc));
  if (hParentWndProc) {
    [[maybe_unused]] LONG_PTR hPreviousWndProc =
        SetWindowLongPtr(hWnd, GWLP_WNDPROC, hParentWndProc);
    DCHECK_EQ(hPreviousWndProc,
              reinterpret_cast<LONG_PTR>(SubclassedWindowProc));
  }

  ::RemovePropW(hWnd, kParentWndProc);
  ::RemovePropW(hWnd, kDraggableRegion);
}

BOOL CALLBACK SubclassWindowsProc(HWND hwnd, LPARAM lParam) {
  SubclassWindow(hwnd, reinterpret_cast<HRGN>(lParam));
  return TRUE;
}

BOOL CALLBACK UnSubclassWindowsProc(HWND hwnd, LPARAM lParam) {
  UnSubclassWindow(hwnd);
  return TRUE;
}

}  // namespace

void RootWindowWin::OnSetDraggableRegions(
    const std::vector<CefDraggableRegion>& regions) {
  REQUIRE_MAIN_THREAD();

  // Reset draggable region.
  ::SetRectRgn(draggable_region_, 0, 0, 0, 0);

  // Determine new draggable region.
  std::vector<CefDraggableRegion>::const_iterator it = regions.begin();
  for (; it != regions.end(); ++it) {
    HRGN region = ::CreateRectRgn(it->bounds.x, it->bounds.y,
                                  it->bounds.x + it->bounds.width,
                                  it->bounds.y + it->bounds.height);
    ::CombineRgn(draggable_region_, draggable_region_, region,
                 it->draggable ? RGN_OR : RGN_DIFF);
    ::DeleteObject(region);
  }

  // Subclass child window procedures in order to do hit-testing.
  // This will be a no-op, if it is already subclassed.
  if (hwnd_) {
    WNDENUMPROC proc =
        !regions.empty() ? SubclassWindowsProc : UnSubclassWindowsProc;
    ::EnumChildWindows(hwnd_, proc,
                       reinterpret_cast<LPARAM>(draggable_region_));
  }
}

void RootWindowWin::NotifyDestroyedIfDone() {
  // Notify once both the window and the browser have been destroyed.
  if (window_destroyed_ && browser_destroyed_) {
    delegate_->OnRootWindowDestroyed(this);
  }

}

std::string GetArgValue(std::string args, std::string key) {

  std::size_t pos = std::string::npos;
  pos = args.find(key);

  if (pos != std::string::npos)
  {
    std::string startingValue = args.substr(pos + key.size());
    pos = startingValue.find('&');

    std::string completeValue = "";
    if (pos != std::string::npos) {
      completeValue = startingValue.substr(0, pos);
    } else {
      completeValue = startingValue;
    }

    return completeValue;
  }

  return "";
}

void RootWindowWin::OnInstall()
{
  auto res = MessageBox(
      hwnd_, GetResourceString(IDS_MESSAGE_UPDATE_INSTALL_DESC).c_str(),
      GetResourceString(IDS_MESSAGE_UPDATE_INSTALL_CAPTION).c_str(),
      MB_YESNO | MB_ICONQUESTION);
  if (res == IDYES)
  {
    ShellExecute(NULL, L"open", updaterService_.installerInfo_.DownloadPath.c_str(), NULL, NULL, SW_SHOW);
    PostMessage(hwnd_, WM_CLOSE, 0, 0);
  }
}

void RootWindowWin::OnReleaseNotes()
{
  auto browser = GetBrowser();

  if (not browser)
    return;

  auto frame = browser->GetMainFrame();

  if (not frame)
    return;

  frame->ExecuteJavaScript("HybridBridge.displayReleaseNotes()", frame->GetURL(), 0);
}

void RootWindowWin::OnHelpCenter()
{
  std::string url(mmhmm::urls::HelpCenterUrl);
  std::wstring_convert<std::codecvt_utf8_utf16<wchar_t>> converter;
  std::wstring wUrl = converter.from_bytes(url);

  ShellExecute(NULL, L"open", wUrl.c_str(), NULL, NULL, SW_SHOW);
}

void RootWindowWin::LaunchUrl(std::string url)
{
  CefRefPtr<CefProcessMessage> msg = CefProcessMessage::Create("launch_url");
  CefRefPtr<CefListValue> args = msg->GetArgumentList();
  args->SetString(0, url);
  GetBrowser()->GetMainFrame()->SendProcessMessage(PID_RENDERER, msg);
}

void RootWindowWin::OnLaunchCredits()
{
  std::string url(mmhmm::urls::CreditsUrl);
  std::wstring_convert<std::codecvt_utf8_utf16<wchar_t>> converter;
  std::wstring wUrl = converter.from_bytes(url);

  ShellExecute(NULL, L"open", wUrl.c_str(), NULL, NULL, SW_SHOW);
}

void RootWindowWin::OnLaunchActivityLogs()
{
  std::string path(MainContext::Get()->GetConsoleLogPath());
  std::wstring_convert<std::codecvt_utf8_utf16<wchar_t>> converter;
  std::wstring wPath = converter.from_bytes(path);
  HRESULT hr = PathCchRemoveFileSpec(&wPath[0], _MAX_PATH);
  if (SUCCEEDED(hr))
  {
    std::wstring directory(wPath);
    ShellExecute(NULL, L"open", directory.c_str(), NULL, NULL, SW_SHOW);
  }
}

bool FindParentMenuFromId(HMENU menu, UINT id, HMENU& found_menu, int& pos) {
  if (menu == NULL) {
    pos = -1;
    found_menu = NULL;
    return false;
  }

  int item_count = GetMenuItemCount(menu);
  for (int position = item_count - 1; position >= 0; position--) {
    // Is this the real one?
    UINT current_id = GetMenuItemID(menu, position);
    if (current_id == id) {
      found_menu = menu;
      pos = position;
      return true;
    }

    HMENU sub_menu = GetSubMenu(menu, position);
    if (sub_menu != NULL) {
      bool found = FindParentMenuFromId(sub_menu, id, found_menu, pos);
      if (found)
        return true;
    }
  }
  return false;
}

void RootWindowWin::InsertJoinBetaMenuIfRequired(HMENU& menu){
      if (mmhmm::AppTrackService::get_app_updater_track().compare(
            mmhmm::TrackConstants::Prod) == 0) {
      HMENU help_menu = NULL;
      int position = -1;
      bool found_menu =
          FindParentMenuFromId(menu, IDM_UPDATES, help_menu, position);
      if (found_menu && help_menu != NULL) {
        MENUITEMINFO betaMenuItemInfo = {0};
        betaMenuItemInfo.cbSize = sizeof(MENUITEMINFO);
        betaMenuItemInfo.fMask = MIIM_TYPE | MIIM_ID;
        betaMenuItemInfo.fType = MFT_STRING;
        auto join_beta_caption = GetResourceString(IDS_MENU_JOIN_BETA);
        betaMenuItemInfo.dwTypeData =
            const_cast<wchar_t*>(join_beta_caption.c_str());
        betaMenuItemInfo.cch =
            (UINT)(join_beta_caption.size() * sizeof(wchar_t));
        betaMenuItemInfo.wID = ID_JOIN_BETA;

        InsertMenuItem(help_menu, 0, TRUE, &betaMenuItemInfo);
      }
    }
}

void RootWindowWin::InsertLeaveBetaMenuIfRequired(HMENU& menu) {
    if (mmhmm::AppTrackService::get_app_updater_track().compare(
            mmhmm::TrackConstants::Beta) == 0) {
      HMENU help_menu = NULL;
      int position = -1;
      bool found_menu =
          FindParentMenuFromId(menu, IDM_UPDATES, help_menu, position);
      if (found_menu && help_menu != NULL) {
        MENUITEMINFO leaveBetaMenuItemInfo = {0};
        leaveBetaMenuItemInfo.cbSize = sizeof(MENUITEMINFO);
        leaveBetaMenuItemInfo.fMask = MIIM_TYPE | MIIM_ID;
        leaveBetaMenuItemInfo.fType = MFT_STRING;
        auto leave_beta_caption = GetResourceString(IDS_MENU_LEAVE_BETA);
        leaveBetaMenuItemInfo.dwTypeData =
            const_cast<wchar_t*>(leave_beta_caption.c_str());
        leaveBetaMenuItemInfo.cch = (UINT)(leave_beta_caption.size() * sizeof(wchar_t));
        leaveBetaMenuItemInfo.wID = ID_LEAVE_BETA;

        InsertMenuItem(help_menu, 0, TRUE, &leaveBetaMenuItemInfo);
      }
    }
}

void RootWindowWin::InsertHybridApiTesterMenu(HMENU& menu) {
    if (mmhmm::AppTrackService::get_app_updater_track().compare(
            mmhmm::TrackConstants::QA) == 0 ||
        mmhmm::AppTrackService::get_app_updater_track().compare(
            mmhmm::TrackConstants::Alpha) == 0) {
      HMENU help_menu = NULL;
      int position = -1;
      bool found_menu =
          FindParentMenuFromId(menu, IDM_UPDATES, help_menu, position);
      if (found_menu && help_menu != NULL) {
        MENUITEMINFO hybridApiTesterMenuItemInfo = {0};
        hybridApiTesterMenuItemInfo.cbSize = sizeof(MENUITEMINFO);
        hybridApiTesterMenuItemInfo.fMask = MIIM_TYPE | MIIM_ID;
        hybridApiTesterMenuItemInfo.fType = MFT_STRING;
        auto hybrid_tester_caption = GetResourceString(IDS_MENU_HYBRID_TESTER);
        hybridApiTesterMenuItemInfo.dwTypeData =
            const_cast<wchar_t*>(hybrid_tester_caption.c_str());
        hybridApiTesterMenuItemInfo.cch =
            (UINT)(hybrid_tester_caption.size() * sizeof(wchar_t));
        hybridApiTesterMenuItemInfo.wID = ID_HYBRID_API_TESTER;

        InsertMenuItem(help_menu, 0, TRUE, &hybridApiTesterMenuItemInfo);
      }
    }
}

void RootWindowWin::InsertDevToolsMenu(HMENU& menu) {
  if (mmhmm::AppTrackService::get_app_updater_track().compare(
          mmhmm::TrackConstants::QA) == 0 ||
      mmhmm::AppTrackService::get_app_updater_track().compare(
          mmhmm::TrackConstants::Alpha) == 0) {
    HMENU help_menu = NULL;
    int position = -1;
    bool found_menu =
        FindParentMenuFromId(menu, IDM_UPDATES, help_menu, position);
    if (found_menu && help_menu != NULL) {
      MENUITEMINFO devToolsMenuItemInfo = {0};
      devToolsMenuItemInfo.cbSize = sizeof(MENUITEMINFO);
      devToolsMenuItemInfo.fMask = MIIM_TYPE | MIIM_ID;
      devToolsMenuItemInfo.fType = MFT_STRING;
      auto devToolsCaption = GetResourceString(IDS_MENU_DEV_TOOLS);
      devToolsMenuItemInfo.dwTypeData =
          const_cast<wchar_t*>(devToolsCaption.c_str());
      devToolsMenuItemInfo.cch =
          (UINT)(devToolsCaption.size() * sizeof(wchar_t));
      devToolsMenuItemInfo.wID = ID_SHOW_DEV_TOOLS;

      InsertMenuItem(help_menu, 0, TRUE, &devToolsMenuItemInfo);
    }
  }
}

void RootWindowWin::CreatePerformanceMenu()
{

  auto applicationPath = mmhmm::AppSettingsService::GetApplicationPath();
  auto adapter_descriptions = mmhmm::GetAdaptersByGpuPreference(applicationPath);

  int gpu_preference = 0;
  mmhmm::GetGpuPreference(applicationPath, gpu_preference);

  HMENU menu = GetMainMenu();
  menu = GetSubMenu(menu, 0);
  if (menu) {

    InsertJoinBetaMenuIfRequired(menu);
    InsertLeaveBetaMenuIfRequired(menu);
    InsertHybridApiTesterMenu(menu);
    InsertDevToolsMenu(menu);

    // Create 'Performance' main menu
    HMENU hPerfMenu = CreatePopupMenu();

    MENUITEMINFO menuItemInfo = { 0 };
    menuItemInfo.cbSize = sizeof(MENUITEMINFO);
    menuItemInfo.fMask = MIIM_TYPE | MIIM_ID | MIIM_SUBMENU;
    menuItemInfo.fType = MFT_STRING;
    auto performance_caption = GetResourceString(IDS_MENU_PERFORMANCE);
    menuItemInfo.dwTypeData = const_cast<wchar_t*>(performance_caption.c_str());
    menuItemInfo.cch = (UINT)(performance_caption.size() * sizeof(wchar_t));
    menuItemInfo.hSubMenu = hPerfMenu;

    InsertMenuItem(menu, 2, TRUE, &menuItemInfo);

    if (hPerfMenu) {

      for (int i = 0; i < 3; i++)
      {
        std::wstring text;
        UINT_PTR id;
        switch (i) {
          case 0:
            text = GetResourceString(IDS_MENU_PERFORMANCE_NONE) +
                   adapter_descriptions[i];
            id = ID_DEFAULT_GPU;
            break;
          case 1:
            text = GetResourceString(IDS_MENU_PERFORMANCE_POWER_SAVING) +
                   adapter_descriptions[i];
            id = ID_LOW_GPU;
            break;
          case 2:
            text = GetResourceString(IDS_MENU_PERFORMANCE_HIGH) +
                   adapter_descriptions[i];
            id = ID_HIGH_GPU;
            break;
          default:
            break;
        }


        AppendMenu(hPerfMenu, MF_STRING, id, text.c_str());


        if (i == gpu_preference)
        {
          MENUITEMINFO mii = { sizeof(MENUITEMINFO) };
          memset(&mii, 0, sizeof(mii));
          mii.cbSize = sizeof(mii);
          mii.fMask = MIIM_STATE | MIIM_ID;
          GetMenuItemInfo(hPerfMenu, id, FALSE, &mii);
          mii.fState ^= MFS_CHECKED;
          SetMenuItemInfo(hPerfMenu, id, FALSE, &mii);
        }
      }

      //add balanced mode menu
      AppendMenu(hPerfMenu, MF_STRING, ID_BALANCED_MODE, GetResourceString(IDS_MENU_PERFORMANCE_BALANCED).c_str());

      //set initial state
      OnBalanceModeItemClicked(true);
    }
  }

}

void RootWindowWin::OnPerfromanceItemClicked(UINT_PTR id) {
  HMENU menu = GetMainMenu();
  if (!menu)
    return;

  menu = GetSubMenu(menu, 0);
  HMENU perf_menu = GetSubMenu(menu, 2);

  int i, nCount = GetMenuItemCount(perf_menu) - 1; //we don't want to reach balanced mode menu

  for (i = 0; i < nCount; i++) {
    MENUITEMINFO mii = {sizeof(MENUITEMINFO)};
    memset(&mii, 0, sizeof(mii));
    mii.cbSize = sizeof(mii);
    mii.fMask = MIIM_ID | MIIM_STATE;
    if (GetMenuItemInfo(perf_menu, i, TRUE, &mii)) {
      if (mii.wID == id) {
        if (mii.fState & MFS_CHECKED) {
        // already checked so do nothing
        } else {
        mii.fState ^= MFS_CHECKED;
        SetMenuItemInfo(perf_menu, mii.wID, FALSE, &mii);

        std::wstring applicationPath = mmhmm::AppSettingsService::GetApplicationPath();
        mmhmm::SetGpuPreference(applicationPath, i);
        MessageBox(
            hwnd_,
            GetResourceString(IDS_MESSAGE_PERFORMANCE_CHANGE_DESC).c_str(),
            GetResourceString(IDS_MESSAGE_PERFORMANCE_CHANGE_CAPTION).c_str(),
            MB_OK | MB_ICONINFORMATION);
        }
      } else {
        mii.fState &= ~MFS_CHECKED;
        SetMenuItemInfo(perf_menu, mii.wID, FALSE, &mii);
      }
    }
  }
}

void RootWindowWin::OnBalanceModeItemClicked(bool isInitial) {
  HMENU menu = GetMainMenu();
  if (!menu)
    return;

  menu = GetSubMenu(menu, 0);
  HMENU perf_menu = GetSubMenu(menu, 2);

  MENUITEMINFO mii = {sizeof(MENUITEMINFO)};
  memset(&mii, 0, sizeof(mii));
  mii.cbSize = sizeof(mii);
  mii.fMask = MIIM_ID | MIIM_STATE;
  if (GetMenuItemInfo(perf_menu, 3, TRUE, &mii)) {
    bool balanced_mode =
        isInitial ? mmhmm::AppSettingsService::AppSettings().balancedMode
                     : !mmhmm::AppSettingsService::AppSettings().balancedMode;
    
    if (balanced_mode)
      mii.fState = MFS_CHECKED;
    else
      mii.fState = MFS_UNCHECKED;

    SetMenuItemInfo(perf_menu, mii.wID, FALSE, &mii);

    if (!isInitial) {
      mmhmm::AppSettingsService::AppSettings().balancedMode = balanced_mode;
      mmhmm::AppSettingsService::SaveSettings();

      if (CefRefPtr<CefBrowser> browser = GetBrowser()) {
        browser->GetMainFrame()->LoadURL(AppSettingsService::GetUrlByAppType(WebAppType::creator));
      }
    }
  } 
}

void RootWindowWin::OnJoinBetaClicked() {
  JoinBeta();
}

void RootWindowWin::OnLeaveBetaClicked() {
  LeaveBeta();
}

void RootWindowWin::OnMiniRemoteClicked() {

    auto context = MainContext::Get();
    if (not context)
        return;

    auto mini_remote_manager = context->GetMiniRemoteManager();
    if (not mini_remote_manager)
        return;

    mini_remote_manager->OnShowMiniRemote();
}

void RootWindowWin::OnBroadcastClicked() const{
  auto app_context = MainContext::Get()->GetApplicationContext();
  if (app_context) {
    app_context->OpenBroadcastWindow(GetBrowser());
  }
}

void RootWindowWin::OnCameraInstallClicked() {
  MainContext::Get()->InstallVirtualCamera(
      mmhmm::AppSettingsService::GetApplicationDirectory());
}

void RootWindowWin::OnCameraUninstallClicked() {
  MainContext::Get()->UninstallVirtualCamera(
      mmhmm::AppSettingsService::GetApplicationDirectory());
}

void RootWindowWin::OnHybridApiTesterClicked() {
  auto context = MainContext::Get();
  if (context) {
    context->OpenHybridApiTester(GetBrowser());
  }
}

void RootWindowWin::OnSettingsClicked() {
  if (auto context = MainContext::Get()) {
    if (auto app_context = context->GetApplicationContext()) {
      app_context->OpenSettings(GetBrowser());
    }
  }
}

void RootWindowWin::OnShowDevToolsClicked() {
  ShowDevTools();
}

void RootWindowWin::ShowDevTools() {
  if (browser_window_) {
    browser_window_->ShowDevTools();
  }
}

void RootWindowWin::OnUndo() {
  if (browser_window_) {
      browser_window_->Undo();
  }
}

void RootWindowWin::OnRedo() {
  if (browser_window_) {
      browser_window_->Redo();
  }
}

void RootWindowWin::OnCut() {
  auto browser = GetBrowser();
  if (!browser)
    return;
  auto frame = browser->GetFocusedFrame();
  if (frame) {
    frame->Cut();
  }
}

void RootWindowWin::OnCopy() {
  auto browser = GetBrowser();
  if (!browser)
    return;
  auto frame = browser->GetFocusedFrame();
  if (frame) {
    frame->Copy();
  }
}

void RootWindowWin::OnPaste() {
  auto browser = GetBrowser();
  if (!browser)
    return;
  auto frame = browser->GetFocusedFrame();
  if (frame) {
    frame->Paste();
  }
}

bool RootWindowWin::CenterWindow(HWND hwndWindow, HWND hwndParent)
{
  RECT rectWindow, rectParent;

  if (hwndParent != NULL)
  {
    GetWindowRect(hwndWindow, &rectWindow);
    GetWindowRect(hwndParent, &rectParent);

    int nWidth = rectWindow.right - rectWindow.left;
    int nHeight = rectWindow.bottom - rectWindow.top;

    auto current_monitor = MonitorFromWindow(hwndParent, MONITOR_DEFAULTTONEAREST);

    MONITORINFOEX mi = { 0 };
    mi.cbSize = sizeof(MONITORINFOEX);
    GetMonitorInfo(current_monitor, &mi);

    int nScreenWidth = mi.rcMonitor.right - mi.rcMonitor.left;
    int nScreenHeight = mi.rcMonitor.bottom - mi.rcMonitor.top;

    int nX = mi.rcMonitor.left + (nScreenWidth / 2) - (nWidth / 2);
    int nY = mi.rcMonitor.top + (nScreenHeight / 2) - (nHeight / 2);


    MoveWindow(hwndWindow, nX, nY, nWidth, nHeight, FALSE);

    return TRUE;
  }

  return FALSE;
}

void RootWindowWin::ActivateWindow() {
  if (hwnd_) {
    if (IsIconic(hwnd_)) {
      ShowWindow(hwnd_, SW_RESTORE);
    }
    SetForegroundWindow(hwnd_);
    BringWindowToTop(hwnd_);
  }
}

void RootWindowWin::UpdateCameraMenusState() {
  bool isCameraInstalled = MainContext::Get()->IsVirtualCameraInstalled();
  SetMenuItemState(ID_INSTALL_CAMERA, !isCameraInstalled);
  SetMenuItemState(ID_UNINSTALL_CAMERA, isCameraInstalled);
}

void RootWindowWin::UpdateCameraTitleBarState() {
  bool isCameraInstalled = MainContext::Get()->IsVirtualCameraInstalled();
  if (isCameraInstalled) {
    MainContext::Get()->ReportVirtualCameraInstalled();
  } else {
    MainContext::Get()->ReportVirtualCameraNotInstalled();
  }
}

// static
void RootWindowWin::SaveWindowRestoreOnUIThread(
    const WINDOWPLACEMENT& placement, HWND hwnd, WebAppType app_type) {
  CEF_REQUIRE_UI_THREAD();

  cef_show_state_t show_state = CEF_SHOW_STATE_NORMAL;
  if (placement.showCmd == SW_SHOWMAXIMIZED) {
    show_state = CEF_SHOW_STATE_MAXIMIZED;
  }

  // Coordinates when the window is in the restored position.
  const auto rect = placement.rcNormalPosition;
  CefRect pixel_bounds(rect.left, rect.top, rect.right - rect.left,
                       rect.bottom - rect.top);
  auto dip_bounds = CefDisplay::ConvertScreenRectFromPixels(pixel_bounds);

  prefs::SaveWindowRestorePreferences(app_type, show_state, dip_bounds);
}

void RootWindowWin::SaveLogsToZip() {
  auto save_logs_to_zip_complete = std::bind(&RootWindowWin::SaveLogsToZipComplete,
    this, std::placeholders::_1);

  RequestSystemReportValues(std::move(save_logs_to_zip_complete));
}

void RootWindowWin::CopySystemReport() {
  auto copy_system_report_complete = std::bind(&RootWindowWin::CopySystemReportComplete,
    this, std::placeholders::_1);

  RequestSystemReportValues(std::move(copy_system_report_complete));
}

void RootWindowWin::RequestSystemReportValues(std::function<void(std::wstring)> complete_callback) {
  auto async_javascript_processor =
      MainContext::Get()->GetAsyncJavascriptProcessor();
  if (not async_javascript_processor) {
    return;
  }

  async_javascript_processor->ExecuteJavascriptAsync(
      GetBrowser(),
      L"return {"
      L"  video_device: HybridBridge.videoDevice ?? '',"
      L"  user_id: HybridBridge.userId ?? '',"
      L"  user_email: HybridBridge.userEmail ?? '',"
      L"  audio_device: HybridBridge.audioDevice ?? ''"
      L"};",
      std::move(complete_callback));
}

void RootWindowWin::CopySystemReportComplete(const std::wstring values) {
  try {
    auto system_report = GenerateSystemReportString(values);

    if (OpenClipboard(NULL)) {
      EmptyClipboard();
      mmhmm::utils::SetClipboardDataEx(
          CF_UNICODETEXT, (void*)system_report.c_str(),
          (DWORD)system_report.size() * sizeof(wchar_t));
      CloseClipboard();
    }
  } catch (nlohmann::json::parse_error& e) {
    MainContext::Get()->GetLogger()->error(
        "Unable to copy system report. Parse error: {0}", e.what());
  } catch (nlohmann::json::type_error& e) {
    MainContext::Get()->GetLogger()->error(
        "Unable to copy system report. Type error: {0}", e.what());
  } catch (nlohmann::json::out_of_range& e) {
    MainContext::Get()->GetLogger()->error(
        "Unable to copy system report. Out of range error: {0}", e.what());
  } catch (nlohmann::json::other_error& e) {
    MainContext::Get()->GetLogger()->error(
        "Unable to copy system report. Other JSON error: {0}", e.what());
  } catch (std::exception& e) {
    MainContext::Get()->GetLogger()->error(
        "Unable to copy system report. Exception: {0}", e.what());
  } catch (...) {
    MainContext::Get()->GetLogger()->error("Unable to copy system report");
  }
}

std::wstring RootWindowWin::GenerateSystemReportString(std::wstring values) {
  nlohmann::json json = nlohmann::json::parse(values);
  std::string user_id = json.value("user_id", "");
  std::string user_email = json.value("user_email", "");
  std::string video_device = json.value("video_device", "");
  std::string audio_device = json.value("audio_device", "");
  return mmhmm::GenerateSystemReport(
    client::ToWideString(user_id), client::ToWideString(user_email),
    client::ToWideString(video_device), client::ToWideString(audio_device));
}

void RootWindowWin::SaveLogsToZipComplete(const std::wstring values) {

  try {
    auto system_report = GenerateSystemReportString(values);

    auto result = mmhmm::files::GetSaveFileNameFromDialog(
        hwnd_, GetResourceString(IDS_SYSTEM_REPORT_NAME).c_str(),
        L"tar.gz\0");
    if (result.successful) {
      mmhmm::files::WriteStringToFile(system_report, mmhmm::AppSettingsService::GetSystemReportFilePath());
      mmhmm::zip::WriteZip(result.filename, mmhmm::AppSettingsService::GetAvailableLogFiles());
      std::remove(client::ToNarrowString(mmhmm::AppSettingsService::GetSystemReportFilePath()).c_str());
      mmhmm::files::OpenFileInExplorer(result.filename);
    }
  }
  catch (std::exception& e) {
    MainContext::Get()->GetLogger()->error(
        "Unable to save zip file. Exception: {0}", e.what());
  } catch (...) {
    MainContext::Get()->GetLogger()->error("Unable to save zip file");
  }
}

void RootWindowWin::SetWindowTheme(WindowTheme theme) {
  if (theme_ != theme) {
    theme_ = theme;
    if (titlebar_) {
      titlebar_->SetTheme(theme_);
    }

    if (is_popup_) {
      //notify the web apps that the theme has changed
      auto browser = GetBrowser();

      if (not browser)
        return;

      auto frame = browser->GetMainFrame();

      if (not frame)
        return;

      if (theme == WindowTheme::Dark) {
        frame->ExecuteJavaScript("onThemeChanged('dark')", frame->GetURL(), 0);
      }
      else {
        frame->ExecuteJavaScript("onThemeChanged('light')", frame->GetURL(), 0);
      }
    }
  }
}

  HMENU RootWindowWin::GetMainMenu() const {
    return main_menu_;
  }

  void RootWindowWin::OnCloseButtonClicked() {
    PostMessageW(hwnd_, WM_CLOSE, 0, 0);
  }
  void RootWindowWin::OnMaximizeButtonClicked() {
    int mode = mmhmm::utils::IsWindowMaximized(hwnd_) ? SW_NORMAL : SW_MAXIMIZE;
    ShowWindow(hwnd_, mode);
  }
  void RootWindowWin::OnMinimizeButtonClicked() {
    ShowWindow(hwnd_, SW_MINIMIZE);
  }
  void RootWindowWin::OnMenuClicked(POINT click_point) {
    HMENU popup_menu = GetMainMenu();

    popup_menu = GetSubMenu(popup_menu, 0);
    TrackPopupMenu(popup_menu, TPM_RIGHTBUTTON, click_point.x,
      click_point.y, 0, hwnd_, NULL);
  }

  void RootWindowWin::OnActionButtonClicked() {
    MainContext::Get()->NotifyHybridOfTitlebarButtonClicked();
  }

  void RootWindowWin::OnToolboxButtonClicked() const{
    MainContext::Get()->OpenToolbox(GetBrowser());
  }

  void RootWindowWin::SetMenuItemState(UINT menu_id, bool is_enabled) {
    EnableMenuItem(main_menu_, menu_id, is_enabled ? MF_ENABLED : MF_GRAYED);
  }

  std::unique_ptr<RootWindowConfig>& RootWindowWin::GetConfig() {
    throw mmhmm::NotImplementedException();
  }

  HWND RootWindowWin::CreateBrowserWrapper(HWND parent) {
    HWND hwndCtrl;

    RECT rect;
    GetClientRect(parent, &rect);

    hwndCtrl = CreateWindowEx(
      WS_EX_TOPMOST,
      L"Static",
      L"",
      WS_VISIBLE | WS_CHILD | WS_CLIPSIBLINGS,
      0, 0, rect.right - rect.left, rect.bottom - rect.top,
      parent, nullptr, GetCodeModuleHandle(), nullptr
    );

    return hwndCtrl;
  }

  std::wstring RootWindowWin::GetWindowName() {
    switch (app_type_) {
      case WebAppType::broadcast:
        return GetResourceString(IDS_BROADCAST_APP_TITLE);
      case WebAppType::stacks:
        return GetResourceString(IDS_STACKS_APP_TITLE);
      case WebAppType::screen_recorder:
        return GetResourceString(IDS_RECORDER_APP_TITLE);
      case WebAppType::settings:
        return GetResourceString(IDS_SETTINGS_APP_TITLE);
      case WebAppType::external:
      case WebAppType::mini_remote:
      case WebAppType::mmhmm:
      case WebAppType::prompt:
      case WebAppType::hybrid_api_tester:
      case WebAppType::segmentation_panel:
      case WebAppType::toolbox:
      case WebAppType::offline_wall:
      case WebAppType::camera:
      case WebAppType::creator:
      default:
        return GetResourceString(IDS_APP_TITLE);
    }
  }

  void RootWindowWin::SetStatus(std::wstring text, Icon icon) {
    if (titlebar_) {
      titlebar_->SetStatus(text, icon);
    }
    UpdateCameraMenusState();
  }

  void RootWindowWin::SupportViewAppeared() {
    titlebar_->ExpandStatus();
  }

  void RootWindowWin::SupportViewClosing() {
    titlebar_->CollapseStatus();
  }

  void RootWindowWin::SetStatusVisibility(Visibility visibility) {
    titlebar_->SetCameraStatusVisibility(visibility);
  }

  void RootWindowWin::SetToolboxVisibility(Visibility visibility) {
    titlebar_->SetToolboxVisibility(visibility);
  }

  void RootWindowWin::RestoreAppPositionAndSize() {
    std::optional<CefRect> bounds;
    if (prefs::LoadWindowRestorePreferences(app_type_,
                                            initial_show_state_, bounds) &&
        bounds) {
      initial_bounds_ = CefDisplay::ConvertScreenRectToPixels(*bounds);
    }

    if (initial_bounds_.IsEmpty()) {
      auto default_size = AppSizes::GetDefaultSize(app_type_);
      initial_bounds_.width = default_size.cx;
      initial_bounds_.height = default_size.cy;
      initial_bounds_ = CefDisplay::ConvertScreenRectToPixels(initial_bounds_);
    }

    WINDOWPLACEMENT placement = {0};
    ::GetWindowPlacement(hwnd_, &placement);

    placement.rcNormalPosition.left = initial_bounds_.x;
    placement.rcNormalPosition.top = initial_bounds_.y;
    placement.rcNormalPosition.right =
        initial_bounds_.x + initial_bounds_.width;
    placement.rcNormalPosition.bottom =
        initial_bounds_.y + initial_bounds_.height;
    placement.flags = WPF_SETMINPOSITION;

    SetWindowPlacement(hwnd_, &placement);
  }

  void RootWindowWin::SetDefaultMinAndMixSizes() {
    auto min_size = AppSizes::GetMinimumSize(app_type_);
    SetMinimumSize(min_size.cx, min_size.cy);
    auto max_size = AppSizes::GetMaximumSize(app_type_);
    SetMaximumSize(max_size.cx, max_size.cy);
  }

  void RootWindowWin::SetIsFloating(bool floating) {
    SetWindowPos(hwnd_, floating ? HWND_TOPMOST : HWND_NOTOPMOST, 0, 0, 0, 0,
                 SWP_NOMOVE | SWP_NOSIZE);
  }

  void RootWindowWin::EnableCreatorMenuItems() {
    SetMenuItemState(ID_MINI_REMOTE, true);
    SetMenuItemState(ID_BROADCAST, true);
  }

  void RootWindowWin::DisableCreatorMenuItems() {
    SetMenuItemState(ID_MINI_REMOTE, false);
    SetMenuItemState(ID_BROADCAST, false);
  }

  void RootWindowWin::UpdateMenuItemsByAppType(WebAppType app_type) {
    app_type == WebAppType::creator ? EnableCreatorMenuItems()
                              : DisableCreatorMenuItems();
  }

  HMENU RootWindowWin::CreateMenuByAppType(WebAppType app_type) const {
    return app_type == WebAppType::stacks || app_type == WebAppType::screen_recorder
               ? LoadMenu(GetCodeModuleHandle(),
                          MAKEINTRESOURCE(IDC_STACKSMENU))
               : LoadMenu(GetCodeModuleHandle(),
                          MAKEINTRESOURCE(IDC_CEFCLIENT));
  }

  TitlebarButtons RootWindowWin::GetTitlebarButtonsByAppType(
      WebAppType app_type) const {
    TitlebarButtons buttons;
    switch (app_type
) {
      case WebAppType::camera:
      case WebAppType::creator:
      case WebAppType::mmhmm:
      case WebAppType::stacks:
      case WebAppType::screen_recorder:
        buttons.has_close_button = true;
        buttons.has_maximise_button = true;
        buttons.has_menu_button = true;
        buttons.has_minimize_button = true;
        break;
      case WebAppType::prompt:
        buttons.has_close_button = true;
        break;
      case WebAppType::broadcast:
      case WebAppType::hybrid_api_tester:
      case WebAppType::segmentation_panel:
      case WebAppType::settings:
        buttons.has_close_button = true;
        buttons.has_maximise_button = true;
        buttons.has_minimize_button = true;
        break;
      case WebAppType::mini_remote:
      case WebAppType::toolbox:
        buttons.has_close_button = true;
        break;
      case WebAppType::external:
      case WebAppType::offline_wall:
      default:
        break;
    }

    return buttons;
  }

  void RootWindowWin::OnOmitInScreenShares(bool omit) const {
    if (!hwnd_) {
      return;
    }
    if (omit) {
      SetWindowDisplayAffinity(hwnd_, WDA_EXCLUDEFROMCAPTURE);
    } else {
      SetWindowDisplayAffinity(hwnd_, WDA_NONE);
    }
  }
  }  // namespace client
