// Copyright (c) 2015 The Chromium Embedded Framework Authors. All rights
// reserved. Use of this source code is governed by a BSD-style license that
// can be found in the LICENSE file.

#include "root_window_manager.h"

#include <sstream>

#include "include/base/cef_callback.h"
#include "include/base/cef_logging.h"
#include "include/wrapper/cef_helpers.h"
#include "client_handler_std.h"
#include "main_context.h"
#include "file_util.h"
#include "resource_util.h"
#include "../common/client_switches.h"

#if defined(OS_MAC)
#include "root_window_manager_mac.h"
#endif
#include "web_app_browser.h"

namespace client {

namespace {

class ClientRequestContextHandler : public CefRequestContextHandler {
 public:
  ClientRequestContextHandler() {}

  // CefRequestContextHandler methods:
  void OnRequestContextInitialized(
      CefRefPtr<CefRequestContext> request_context) override {
    CEF_REQUIRE_UI_THREAD();

    CefRefPtr<CefCommandLine> command_line =
        CefCommandLine::GetGlobalCommandLine();
  }

 private:
  IMPLEMENT_REFCOUNTING(ClientRequestContextHandler);
  DISALLOW_COPY_AND_ASSIGN(ClientRequestContextHandler);
};

}  // namespace

RootWindowManager::RootWindowManager(bool terminate_when_all_windows_closed)
    : terminate_when_all_windows_closed_(terminate_when_all_windows_closed) {
  CefRefPtr<CefCommandLine> command_line =
      CefCommandLine::GetGlobalCommandLine();
  DCHECK(command_line.get());
  request_context_per_browser_ =
      command_line->HasSwitch(switches::kRequestContextPerBrowser);
  request_context_shared_cache_ =
      command_line->HasSwitch(switches::kRequestContextSharedCache);
}

RootWindowManager::~RootWindowManager() {
  // All root windows should already have been destroyed.
  DCHECK(root_windows_.empty());
}

scoped_refptr<RootWindow> RootWindowManager::CreateRootWindow(
    std::unique_ptr<RootWindowConfig> config,
    CefRefPtr<CefDictionaryValue> extra_info) {
  CefBrowserSettings settings;
  MainContext::Get()->PopulateBrowserSettings(&settings);

  scoped_refptr<RootWindow> root_window =
      RootWindow::Create(MainContext::Get()->UseViews());
  root_window->Init(this, std::move(config), settings, extra_info);

  // Store a reference to the root window on the main thread.
  OnRootWindowCreated(root_window);

  return root_window;
}

scoped_refptr<RootWindow> RootWindowManager::CreateRootWindowAsPopup(
    bool with_controls,
    const CefPopupFeatures& popupFeatures,
    CefWindowInfo& windowInfo,
    CefRefPtr<CefClient>& client,
    CefBrowserSettings& settings,
    CefRefPtr<CefDictionaryValue>& extra_info) {
  CEF_REQUIRE_UI_THREAD();

  MainContext::Get()->PopulateBrowserSettings(&settings);

  if (MainContext::Get()->UseDefaultPopup()) {
    // Use default window creation for the popup. A new |client| instance is
    // still required by cefclient architecture.
    client = new ClientHandlerStd(/*delegate=*/nullptr, with_controls,
                                  /*startup_url=*/CefString());
    return nullptr;
  }

  if (!temp_window_) {
    // TempWindow must be created on the UI thread.
    temp_window_.reset(new TempWindow());
  }

  scoped_refptr<RootWindow> root_window =
      RootWindow::Create(MainContext::Get()->UseViews());
  root_window->InitAsPopup(this, with_controls, popupFeatures,
                           windowInfo, client, settings, extra_info);

  // Store a reference to the root window on the main thread.
  OnRootWindowCreated(root_window);

  return root_window;
}

scoped_refptr<RootWindow> RootWindowManager::CreateRootWindowAsPopup(
    WebAppType app_type,
    bool with_controls,
    bool is_modal,
    cef_window_handle_t parent_window_handle,
    const CefPopupFeatures& popupFeatures,
    CefWindowInfo& windowInfo,
    CefRefPtr<CefClient>& client,
    CefBrowserSettings& settings,
    CefRefPtr<CefDictionaryValue>& extra_info) {
    CEF_REQUIRE_UI_THREAD();

    MainContext::Get()->PopulateBrowserSettings(&settings);

    if (extra_info == nullptr) {
      extra_info = CefDictionaryValue::Create();
    }
    extra_info->SetDictionary(mmhmm::AppCapabilities::dictionaryKey, MainContext::Get()->GetAppCapabilities().ToCefDictionary());
    extra_info->SetDictionary(mmhmm::AppWindows::dictionaryKey, MainContext::Get()->GetAppWindows().ToCefDictionary());
    extra_info->SetDictionary(mmhmm::VirtualCamera::dictionaryKey, MainContext::Get()->GetVirtualCamera().ToCefDictionary());
    extra_info->SetDictionary(
        mmhmm::PowerMonitor::dictionaryKey,
        MainContext::Get()->GetPowerMonitor().ToCefDictionary());
    MainContext::Get()->GetLoginItemInstaller()->AddToDictionary(extra_info);
    MainContext::Get()->GetWindowOverlay()->AddToDictionary(extra_info);
    MainContext::Get()->GetSystemVideoEffectsMonitor()->AddToDictionary(extra_info);
    MainContext::Get()->GetEventProxy()->AddToDictionary(extra_info);

    if (MainContext::Get()->UseDefaultPopup()) {
        // Use default window creation for the popup. A new |client| instance is
        // still required by cefclient architecture.
        client = new ClientHandlerStd(/*delegate=*/nullptr, with_controls,
            /*startup_url=*/CefString());
        return nullptr;
    }

    if (!temp_window_) {
        // TempWindow must be created on the UI thread.
        temp_window_.reset(new TempWindow());
    }

    scoped_refptr<RootWindow> root_window =
        RootWindow::Create(MainContext::Get()->UseViews());
    root_window->InitAsPopup(this, app_type, with_controls, is_modal,
                             parent_window_handle, popupFeatures, windowInfo,
                             client, settings, extra_info);

    // Store a reference to the root window on the main thread.
    OnRootWindowCreated(root_window);

    return root_window;
}

scoped_refptr<RootWindow> RootWindowManager::GetWindowForBrowser(
    int browser_id) const {
  REQUIRE_MAIN_THREAD();

  for (auto& root_window : root_windows_) {
    CefRefPtr<CefBrowser> browser = root_window->GetBrowser();
    if (browser.get() && browser->GetIdentifier() == browser_id)
      return root_window;
  }
  return nullptr;
}

scoped_refptr<RootWindow> RootWindowManager::GetWindowByWebAppType(
    WebAppType app_type,
    WindowSearchType search_type) const {
  REQUIRE_MAIN_THREAD();

  for (auto& root_window : root_windows_) {
    auto window_app_type = root_window->GetWebAppType();

    if (window_app_type == app_type) {
      return root_window;
    }

    if (search_type == WindowSearchType::match_all_malk &&
        mmhmm::IsWebAppMalkType(app_type) &&
        mmhmm::IsWebAppMalkType(window_app_type)) {
      return root_window;
    }
  }

  return nullptr;
}

CefRefPtr<CefBrowser> RootWindowManager::GetBrowserByWebAppType(
    WebAppType app_type) const {
  REQUIRE_MAIN_THREAD();
  auto window = GetWindowByWebAppType(app_type);

  if (!window)
    return nullptr;

  return window->GetBrowser();
}

scoped_refptr<RootWindow> RootWindowManager::GetActiveRootWindow() const {
  REQUIRE_MAIN_THREAD();
  return active_root_window_;
}

scoped_refptr<RootWindow> RootWindowManager::GetRootWindow() const {
  REQUIRE_MAIN_THREAD();

  auto window = GetWindowByWebAppType(WebAppType::mmhmm);
  return window ? window
                : (!root_windows_.empty() ? *root_windows_.begin() : nullptr);
}

CefRefPtr<CefBrowser> RootWindowManager::GetWebAppBrowser() const {
  base::AutoLock lock_scope(root_browser_lock_);
  return root_browser_;
}

CefRefPtr<CefBrowser> RootWindowManager::GetActiveBrowser() const {
  base::AutoLock lock_scope(active_browser_lock_);
  return active_browser_;
}

void RootWindowManager::CloseAllWindows(bool force) {
  if (!CURRENTLY_ON_MAIN_THREAD()) {
    // Execute this method on the main thread.
    MAIN_POST_CLOSURE(base::BindOnce(&RootWindowManager::CloseAllWindows,
                                     base::Unretained(this), force));
    return;
  }

  if (root_windows_.empty())
    return;

  // Use a copy of |root_windows_| because the original set may be modified
  // in OnRootWindowDestroyed while iterating.
  RootWindowSet root_windows = root_windows_;

  for (auto& root_window : root_windows) {
    root_window->Close(force);
  }
}

void RootWindowManager::SetThemeOnAllWindows(client::WindowTheme theme) {
  if (!CURRENTLY_ON_MAIN_THREAD()) {
    // Execute this method on the main thread.
    MAIN_POST_CLOSURE(base::BindOnce(&RootWindowManager::SetThemeOnAllWindows,
      base::Unretained(this), theme));
    return;
  }

  if (root_windows_.empty())
    return;

  // Use a copy of |root_windows_| because the original set may be modified
  // in OnRootWindowDestroyed while iterating.
  RootWindowSet root_windows = root_windows_;

  for (auto& root_window : root_windows) {
    root_window->SetWindowTheme(theme);
  }
}

void RootWindowManager::OnRootWindowCreated(
    scoped_refptr<RootWindow> root_window) {
  if (!CURRENTLY_ON_MAIN_THREAD()) {
    // Execute this method on the main thread.
    MAIN_POST_CLOSURE(base::BindOnce(&RootWindowManager::OnRootWindowCreated,
                                     base::Unretained(this), root_window));
    return;
  }

  root_windows_.insert(root_window);
}

CefRefPtr<CefRequestContext> RootWindowManager::GetRequestContext(
    RootWindow* root_window) {
  REQUIRE_MAIN_THREAD();

  if (request_context_per_browser_) {
    // Create a new request context for each browser.
    CefRequestContextSettings settings;

    CefRefPtr<CefCommandLine> command_line =
        CefCommandLine::GetGlobalCommandLine();
    if (command_line->HasSwitch(switches::kCachePath)) {
      if (request_context_shared_cache_) {
        // Give each browser the same cache path. The resulting context objects
        // will share the same storage internally.
        CefString(&settings.cache_path) =
            command_line->GetSwitchValue(switches::kCachePath);
      } else {
        // Give each browser a unique cache path. This will create completely
        // isolated context objects.
        std::stringstream ss;
        ss << command_line->GetSwitchValue(switches::kCachePath).ToString()
           << file_util::kPathSep << time(nullptr);
        CefString(&settings.cache_path) = ss.str();
      }
    }

    return CefRequestContext::CreateContext(settings,
                                            new ClientRequestContextHandler);
  }

  // All browsers will share the global request context.
  if (!shared_request_context_.get()) {
    shared_request_context_ = CefRequestContext::CreateContext(
        CefRequestContext::GetGlobalContext(), new ClientRequestContextHandler);
  }
  return shared_request_context_;
}

scoped_refptr<ImageCache> RootWindowManager::GetImageCache() {
  CEF_REQUIRE_UI_THREAD();

  if (!image_cache_) {
    image_cache_ = new ImageCache;
  }
  return image_cache_;
}

void RootWindowManager::OnExit(RootWindow* root_window) {
  REQUIRE_MAIN_THREAD();

  CloseAllWindows(false);
}

void RootWindowManager::OnRootWindowDestroyed(RootWindow* root_window) {
  REQUIRE_MAIN_THREAD();

  RootWindowSet::iterator it = root_windows_.find(root_window);
  DCHECK(it != root_windows_.end());
  if (it != root_windows_.end())
    root_windows_.erase(it);

  if (root_window == active_root_window_) {
    active_root_window_ = nullptr;

    base::AutoLock lock_scope(active_browser_lock_);
    active_browser_ = nullptr;
  }

  // Previously Window ownership was guaranteed so all Windows were closed by relationship
  // With the addition of mini remote, the Windows need to be independent to allow
  // the main Window to be minimzed without effecting the child Window.
  // If the true root Window is closed then close all children.
  if (GetRootWindow() == nullptr) {
      CloseAllWindows(false);
  }

  if (terminate_when_all_windows_closed_ && root_windows_.empty()) {
    // All windows have closed. Clean up on the UI thread.
    CefPostTask(TID_UI, base::BindOnce(&RootWindowManager::CleanupOnUIThread,
                                       base::Unretained(this)));
  }
}

void RootWindowManager::OnRootWindowActivated(RootWindow* root_window) {
  REQUIRE_MAIN_THREAD();

  if (root_window == active_root_window_)
    return;

  active_root_window_ = root_window;

  {
    base::AutoLock lock_scope(active_browser_lock_);
    // May be nullptr at this point, in which case we'll make the association in
    // OnBrowserCreated.
    active_browser_ = active_root_window_->GetBrowser();
  }
}

void RootWindowManager::OnBrowserCreated(RootWindow* root_window,
                                         CefRefPtr<CefBrowser> browser) {
  REQUIRE_MAIN_THREAD();

  if (root_window == active_root_window_) {
    base::AutoLock lock_scope(active_browser_lock_);
    active_browser_ = browser;
  }

  if (mmhmm::IsWebAppMalkType(root_window->GetWebAppType())) {
    base::AutoLock lock_scope(root_browser_lock_);
    root_browser_ = browser;
  }

#if defined(OS_MAC)
	mmhmm::OnBrowserCreated(root_window, browser);
#elif defined(OS_WIN)
  MainContext::Get()->RefreshWindowsConnectedStatus(root_window);
  #endif
}

void RootWindowManager::OnBrowserClosing(RootWindow* root_window, CefRefPtr<CefBrowser> browser) {
  REQUIRE_MAIN_THREAD();

  base::AutoLock lock_scope(root_browser_lock_);
  if (mmhmm::IsWebAppMalkType(root_window->GetWebAppType())) {
    root_browser_ = nullptr;
  }
}

void RootWindowManager::CleanupOnUIThread() {
  CEF_REQUIRE_UI_THREAD();

	bool use_views = MainContext::Get()->UseViews();
  if (!temp_window_ && !use_views) {
    // TempWindow must be created on the UI thread. It is only used with
    // native (non-Views) parent windows.
    temp_window_.reset(nullptr);
  }

  if (image_cache_) {
    image_cache_ = nullptr;
  }

  // Quit the main message loop.
  MainMessageLoop::Get()->Quit();
}

scoped_refptr<RootWindow> RootWindowManager::GetWindowByHandle(
  ClientWindowHandle handle) const {
  for (auto& root_window : root_windows_) {
    if (root_window->GetWindowHandle() == handle)
      return root_window;
  }
  return nullptr;
}

scoped_refptr<RootWindow> RootWindowManager::GetParentWindowForBrowser(
    int id) const {
  auto window = GetWindowForBrowser(id);
  if (!window || window->GetParentRootWindowHandle() == nullptr)
    return nullptr;

  return GetWindowByHandle(window->GetParentRootWindowHandle());
}

scoped_refptr<CefBrowser> RootWindowManager::GetParentWindowBrowserForBrowser(
    int id) const {
  auto window = GetParentWindowForBrowser(id);
  if (!window)
    return nullptr;

  return window->GetBrowser();
}

bool RootWindowManager::HasRootWindowOpen() const {
  return root_windows_.size() > 0;
}

}  // namespace client
