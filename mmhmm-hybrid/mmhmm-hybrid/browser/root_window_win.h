// Copyright (c) 2015 The Chromium Embedded Framework Authors. All rights
// reserved. Use of this source code is governed by a BSD-style license that
// can be found in the LICENSE file.

#pragma once

#include <windows.h>

#include <commdlg.h>

#include <memory>
#include <string>
#include <utility>

#include "browser_window.h"
#include "root_window.h"
#include "../browser/client_prefs.h"

#include <future>
#include "../win/app_updater_service.h"
#include "../win/singleton_win.h"
#include "../win/controls/titlebar.h"
#include "../win/deep_link_info.h"

using namespace mmhmm::controls;

namespace client {

// Windows implementation of a top-level native window in the browser process.
// The methods of this class must be called on the main thread unless otherwise
// indicated.
class RootWindowWin : public RootWindow, public BrowserWindow::Delegate {
 public:
  // Constructor may be called on any thread.
  RootWindowWin();
  ~RootWindowWin();

  // RootWindow methods.
  void Init(RootWindow::Delegate* delegate,
            std::unique_ptr<RootWindowConfig> config,
            const CefBrowserSettings& settings,
            CefRefPtr<CefDictionaryValue> extra_info = nullptr) override;
  void InitAsPopup(RootWindow::Delegate* delegate,
                   bool with_controls,
                   const CefPopupFeatures& popupFeatures,
                   CefWindowInfo& windowInfo,
                   CefRefPtr<CefClient>& client,
                   CefBrowserSettings& settings,
                   CefRefPtr<CefDictionaryValue>& extra_info) override;

  void InitAsPopup(RootWindow::Delegate* delegate,
      WebAppType app_type,
      bool with_controls,
      bool is_modal,
      cef_window_handle_t parent_window_handle,
      const CefPopupFeatures& popupFeatures,
      CefWindowInfo& windowInfo,
      CefRefPtr<CefClient>& client,
      CefBrowserSettings& settings,
      CefRefPtr<CefDictionaryValue>& extra_info) override;

  void Show(ShowMode mode) override;
  void SetTitleText(std::string text) override;
  void ShowTitleIndicator(bool show) override;
  void Hide() override;
  void Undo() override {}
  void Redo() override {}
  void ShowDevTools() override;
  WebAppType GetWebAppType() const override;
  void SetBounds(int x, int y, size_t width, size_t height) override;
  void SetSize(size_t width, size_t height) override;
  void SetMinimumSize(size_t width, size_t height) override;
  void SetMaximumSize(size_t width, size_t height) override;
  void AdjustHeight(int height) override;
  void Close(bool force) override;
  void SetDeviceScaleFactor(float device_scale_factor) override;
  float GetDeviceScaleFactor() const override;
  CefRefPtr<CefBrowser> GetBrowser() const override;
  ClientWindowHandle GetWindowHandle() const override;
  ClientWindowHandle GetParentRootWindowHandle() const override;
  void SetWindowTheme(WindowTheme theme) override;

  void OnInstall();
  void OnLaunchCredits();

  void CreatePerformanceMenu();

  void CopySystemReport();
  void SaveLogsToZip();
  void RequestSystemReportValues(std::function<void(std::wstring)> complete_callback);
  void SetMenuItemState(UINT menu_id, bool is_enabled);
  void SetStatus(std::wstring text, Icon icon);
  void SetStatusVisibility(Visibility visibility);
  void SetToolboxVisibility(Visibility visibility);
  void SupportViewAppeared();
  void SupportViewClosing();
  void SetIsFloating(bool floating);
  void ActivateWindow();

  std::unique_ptr<RootWindowConfig>& GetConfig() override;
  void OnOmitInScreenShares(bool omit) const;
  
 private:
  void ContinueInitOnUIThread(std::unique_ptr<RootWindowConfig> config,
                              const CefBrowserSettings& settings);
  void ContinueInitOnMainThread(std::unique_ptr<RootWindowConfig> config,
                                const CefBrowserSettings& settings);
  void CreateBrowserWindow(const std::string& startup_url);
  void CreateRootWindow(const CefBrowserSettings& settings,
                        bool initially_hidden);

  // Register the root window class.
  static void RegisterRootClass(HINSTANCE hInstance,
                                const std::wstring& window_class,
                                HBRUSH background_brush,
                                bool use_custom_titlebar);

  // Window procedure for the root window.
  static LRESULT CALLBACK RootWndProc(HWND hWnd,
                                      UINT message,
                                      WPARAM wParam,
                                      LPARAM lParam);

  // Window procedure for the download dialog.
  static LRESULT CALLBACK DownloadWndProc(HWND hWnd,
    UINT message,
    WPARAM wParam,
    LPARAM lParam);

  // Event handlers.
  void OnPaint();
  void OnFocus();
  void OnActivate(bool active);
  void OnSize(bool minimized);
  void OnMove();
  void OnDpiChanged(WPARAM wParam, LPARAM lParam);
  bool OnEraseBkgnd();
  bool OnCommand(UINT id);
  void OnAbout();
  void OnNCCreate(LPCREATESTRUCT lpCreateStruct);
  void OnCreate(LPCREATESTRUCT lpCreateStruct);
  bool OnClose();
  void OnDestroyed();
  LRESULT OnNCHitTest(LRESULT hit, LPARAM lparam);
  void OnWindowPosChanging(LPARAM lparam);
  void OnTimer();
  void OnNCCalcSize(NCCALCSIZE_PARAMS* size_params);
  void OnNCMouseMove();
  void OnNCMouseLeave();
  void OnMouseMove();
  void OnMouseLeave();
  bool OnMouseButtonDown();
  bool OnMouseButtonUp(LPARAM lparam);
  void OnCloseButtonClicked();
  void OnMaximizeButtonClicked();
  void OnMinimizeButtonClicked();
  void OnMenuClicked(POINT click_point);
  void OnActionButtonClicked();
  void OnToolboxButtonClicked() const;

  // BrowserWindow::Delegate methods.
  void OnBrowserCreated(CefRefPtr<CefBrowser> browser) override;
  void OnBrowserWindowDestroyed() override;
  void OnSetAddress(const std::string& url) override;
  void OnSetTitle(const std::string& title) override;
  void OnSetFullscreen(bool fullscreen) override;
  void OnAutoResize(const CefSize& new_size) override;
  void OnSetLoadingState(bool isLoading,
                         bool canGoBack,
                         bool canGoForward) override;
  void OnSetDraggableRegions(
      const std::vector<CefDraggableRegion>& regions) override;

  void NotifyDestroyedIfDone();

  static void SaveWindowRestoreOnUIThread(const WINDOWPLACEMENT& placement, HWND hwnd, WebAppType app_type);
  void SaveWindowRestoreInformation();

  void InsertJoinBetaMenuIfRequired(HMENU& menu);
  void InsertLeaveBetaMenuIfRequired(HMENU& menu);
  void InsertHybridApiTesterMenu(HMENU& menu);
  void InsertDevToolsMenu(HMENU& menu);
  void CheckForAppUpdates(bool notifyOnNoUpdates);
  void JoinBeta();
  void LeaveBeta();
  void DownloadCallback(bool successful);  
  void DownloadProgress(int percentageDownloaded);
  void CancelDownload();
  void OnCheckForUpdates();
  void OnReleaseNotes();
  void OnHelpCenter();
  void DownloadInstaller(std::wstring track);

  void CopySystemReportComplete(const std::wstring values);
  void SaveLogsToZipComplete(const std::wstring values);
  std::wstring GenerateSystemReportString(const std::wstring values);

  void LaunchUrl(std::string url);
  void OnLaunchActivityLogs();

  void OnPerfromanceItemClicked(UINT_PTR id);

  void OnBalanceModeItemClicked(bool isInitial);

  void OnJoinBetaClicked();
  void OnLeaveBetaClicked();

  void OnMiniRemoteClicked();
  void OnBroadcastClicked() const;
  void OnCameraInstallClicked();
  void OnCameraUninstallClicked();

  void OnHybridApiTesterClicked();
  void OnSettingsClicked();
  void OnShowDevToolsClicked();
  std::wstring GetWindowName();

  void OnUndo();
  void OnRedo();
  void OnCut();
  void OnCopy();
  void OnPaste();

  bool CenterWindow(HWND hwndWindow, HWND hwndParent);

  void UpdateCameraMenusState();
  void UpdateCameraTitleBarState();
  void EnableCreatorMenuItems();
  void DisableCreatorMenuItems();
  void UpdateMenuItemsByAppType(WebAppType app_type);

  HMENU GetMainMenu() const;

  HWND CreateBrowserWrapper(HWND parent);
  void RestoreAppPositionAndSize();
  void SetDefaultMinAndMixSizes();
  HMENU CreateMenuByAppType(WebAppType app_type) const;
  TitlebarButtons GetTitlebarButtonsByAppType(
      WebAppType app_type) const;

  // After initialization all members are only accessed on the main thread.
  // Members set during initialization.
  bool always_on_top_ = false;
  bool is_popup_ = false;
  double aspect_ratio_ = 0;
  WPARAM side_being_dragged_ = 0;
  CefRect initial_bounds_;
  cef_show_state_t initial_show_state_ = CEF_SHOW_STATE_NORMAL;
  std::unique_ptr<BrowserWindow> browser_window_;
  CefBrowserSettings browser_settings_;
  bool initialized_ = false;

  // Main window.
  HWND hwnd_ = nullptr;
  HWND parent_hwnd_ = nullptr;

  // Draggable region.
  HRGN draggable_region_ = nullptr;

  // Font for buttons and text fields.
  HFONT font_ = nullptr;
  int font_height_ = 0;

  UINT mouse_timer_id = 1;

  UINT download_complete_id_ = 0;

  //Download dialoog
  HWND dialogHandle_ = nullptr;
  HWND progressHandle_ = nullptr;
  WNDPROC download_wndproc_old_ = nullptr;


  bool window_destroyed_ = false;
  bool browser_destroyed_ = false;
  std::atomic<bool> initial_load_complete_ = false;

  bool called_enable_non_client_dpi_scaling_ = false;

  DISALLOW_COPY_AND_ASSIGN(RootWindowWin);

  std::future<void> downloadResult_;

  mmhmm::AppUpdaterService updaterService_;

  bool show_menu_ = true;
  bool is_modal_ = true;
  WebAppType app_type_ = WebAppType::mmhmm;

  size_t min_width_ = 100;
  size_t min_height_ = 100;

  // Default to 0 to indicate it is unset.
  // When unset the natural OS calculated max will be used
  size_t max_width_ = 0;
  size_t max_height_ = 0;

  WindowTheme theme_ = WindowTheme::Light;

  bool is_mouse_inside_ = false;
  bool auto_hide_toolbar_ = false;
  bool has_menu_ = true;
  HMENU main_menu_ = nullptr;
  bool use_custom_titlebar_ = true;
  std::unique_ptr<controls::Titlebar> titlebar_ = nullptr;

  HWND browser_wrapper_hwnd_ = nullptr;
  std::atomic_bool mode_changing_ = false;
  std::unique_ptr<RootWindowConfig> config_;
};

}  // namespace client

