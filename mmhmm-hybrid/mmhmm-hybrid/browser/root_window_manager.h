// Copyright (c) 2015 The Chromium Embedded Framework Authors. All rights
// reserved. Use of this source code is governed by a BSD-style license that
// can be found in the LICENSE file.

#pragma once

#include <memory>
#include <set>

#include "include/cef_command_line.h"
#include "include/cef_request_context_handler.h"
#include "image_cache.h"
#include "root_window.h"
#include "temp_window.h"

namespace client {
enum class WindowSearchType { exact, match_all_malk };

// Used to create/manage RootWindow instances. The methods of this class can be
// called from any browser process thread unless otherwise indicated.
class RootWindowManager : public RootWindow::Delegate {
 public:
  // If |terminate_when_all_windows_closed| is true quit the main message loop
  // after all windows have closed.
  explicit RootWindowManager(bool terminate_when_all_windows_closed);

  // Create a new top-level native window. This method can be called from
  // anywhere.
  scoped_refptr<RootWindow> CreateRootWindow(
      std::unique_ptr<RootWindowConfig> config,
      CefRefPtr<CefDictionaryValue> extra_info);

  // Create a new native popup window.
  // If |with_controls| is true the window will show controls.
  // This method is called from ClientHandler::CreatePopupWindow() to
  // create a new popup or DevTools window. Must be called on the UI thread.
  scoped_refptr<RootWindow> CreateRootWindowAsPopup(
      bool with_controls,
      const CefPopupFeatures& popupFeatures,
      CefWindowInfo& windowInfo,
      CefRefPtr<CefClient>& client,
      CefBrowserSettings& settings,
      CefRefPtr<CefDictionaryValue>& extra_info);

// Create a new native popup window.
// If |with_controls| is true the window will show controls.
// This method is called from ClientHandler::CreatePopupWindow() to
// create a new popup or DevTools window. Must be called on the UI thread.
  scoped_refptr<RootWindow> CreateRootWindowAsPopup(
      WebAppType app_type,
      bool with_controls,
      bool is_modal,
      cef_window_handle_t parent_window_handle,
      const CefPopupFeatures& popupFeatures,
      CefWindowInfo& windowInfo,
      CefRefPtr<CefClient>& client,
      CefBrowserSettings& settings,
      CefRefPtr<CefDictionaryValue>& extra_info);

  scoped_refptr<RootWindow> GetRootWindow() const;

  // Returns the RootWindow associated with the specified browser ID. Must be
  // called on the main thread.
  scoped_refptr<RootWindow> GetWindowForBrowser(int browser_id) const;

  // Returns the RootWindow associated with the specified app type. Must be
  // called on the main thread.
  scoped_refptr<RootWindow> GetWindowByWebAppType(
      WebAppType app_type,
      WindowSearchType search_type = WindowSearchType::match_all_malk) const;

  // Returns the Browser associated with the specified app type. Must be
  // called on the main thread.
  CefRefPtr<CefBrowser> GetBrowserByWebAppType(WebAppType app_type) const;

  // Returns the currently active/foreground RootWindow. May return nullptr.
  // Must be called on the main thread.
  scoped_refptr<RootWindow> GetActiveRootWindow() const;

  // Returns the currently active/foreground browser. May return nullptr. Safe
  // to call from any thread.
  CefRefPtr<CefBrowser> GetActiveBrowser() const;

  // Returns the browser hosting the web app. May return nullptr. Safe
  // to call from any thread.
  CefRefPtr<CefBrowser> GetWebAppBrowser() const;

  /// Gets a RootWindow with a given handle from the managed root window collection
  scoped_refptr<RootWindow> GetWindowByHandle(ClientWindowHandle handle) const;

  /// Gets the parent RootWindow for a given browser id
  scoped_refptr<RootWindow> GetParentWindowForBrowser(int id) const;

  /// Gets the browser instance from the parent window of a given browser id
  scoped_refptr<CefBrowser> GetParentWindowBrowserForBrowser(int id) const;

  /// <summary>
  /// Checks if a RootWindow of any type exists
  /// </summary>
  /// <returns>bool to indicate if a RootWindow exists or not</returns>
  bool HasRootWindowOpen() const;

  // Close all existing windows. If |force| is true onunload handlers will not
  // be executed.
  void CloseAllWindows(bool force);

  void SetThemeOnAllWindows(client::WindowTheme theme);

  bool request_context_per_browser() const {
    return request_context_per_browser_;
  }

 private:
  // Allow deletion via std::unique_ptr only.
  friend std::default_delete<RootWindowManager>;

  ~RootWindowManager();

  void OnRootWindowCreated(scoped_refptr<RootWindow> root_window);

  // RootWindow::Delegate methods.
  CefRefPtr<CefRequestContext> GetRequestContext(
      RootWindow* root_window) override;
  scoped_refptr<ImageCache> GetImageCache() override;
  void OnExit(RootWindow* root_window) override;
  void OnRootWindowDestroyed(RootWindow* root_window) override;
  void OnRootWindowActivated(RootWindow* root_window) override;
  void OnBrowserCreated(RootWindow* root_window,
                        CefRefPtr<CefBrowser> browser) override;
  void OnBrowserClosing(RootWindow* root_window,
                        CefRefPtr<CefBrowser> browser) override;

  void CleanupOnUIThread();

  const bool terminate_when_all_windows_closed_;
  bool request_context_per_browser_;
  bool request_context_shared_cache_;

  // Existing root windows. Only accessed on the main thread.
  typedef std::set<scoped_refptr<RootWindow>> RootWindowSet;
  RootWindowSet root_windows_;

  // The currently active/foreground RootWindow. Only accessed on the main
  // thread.
  scoped_refptr<RootWindow> active_root_window_;

  // The currently active/foreground browser. Access is protected by
  // |active_browser_lock_;
  mutable base::Lock active_browser_lock_;
  CefRefPtr<CefBrowser> active_browser_;

  // The browser hosting the web app. Only written to on the main thread
  // when the browser begins and ends its lifecycle.
  mutable base::Lock root_browser_lock_;
  CefRefPtr<CefBrowser> root_browser_;

  // Singleton window used as the temporary parent for popup browsers.
  std::unique_ptr<TempWindow> temp_window_;

  CefRefPtr<CefRequestContext> shared_request_context_;

  scoped_refptr<ImageCache> image_cache_;

  DISALLOW_COPY_AND_ASSIGN(RootWindowManager);
};

}  // namespace client

