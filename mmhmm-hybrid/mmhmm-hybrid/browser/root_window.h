// Copyright (c) 2015 The Chromium Embedded Framework Authors. All rights
// reserved. Use of this source code is governed by a BSD-style license that
// can be found in the LICENSE file.

#pragma once

#include <memory>
#include <set>
#include <string>

#include "include/base/cef_callback_forward.h"
#include "include/base/cef_ref_counted.h"
#include "include/cef_browser.h"
#include "include/views/cef_window.h"
#include "client_types.h"
#include "image_cache.h"
#include "main_message_loop.h"
#include <common/titlebar_button.h>

namespace client {

// Used to configure how a RootWindow is created.
struct RootWindowConfig {
  RootWindowConfig();

  // If true the window will always display above other windows.
  bool always_on_top = false;

  // If true the window will show controls.
  bool with_controls = false;

  // If true the window will be created initially hidden.
  bool initially_hidden = false;

  // Requested window position. If |bounds| and |source_bounds| are empty the
  // default window size and location will be used.
  CefRect bounds;

  // Position of the UI element that triggered the window creation. If |bounds|
  // is empty and |source_bounds| is non-empty the new window will be positioned
  // relative to |source_bounds|. This is currently only implemented for Views-
  // based windows when |initially_hidden| is also true.
  CefRect source_bounds;

  // Requested window show state. This is currently only implemented for Views-
  // based windows when |bounds| is non-empty and |initially_hidden| is false.
  cef_show_state_t show_state = CEF_SHOW_STATE_NORMAL;

  // Parent window. Only used for Views-based windows.
  CefRefPtr<CefWindow> parent_window;

  // Callback to be executed when the window is closed. Will be executed on the
  // main thread. This is currently only implemented for Views-based windows.
  base::OnceClosure close_callback;
  
  //we are exposing new callback which can serve as 'application_will_close' callback
  //since views implementation totally disabled access to native windows and application close notifications,
  //without this callback we are blind for any upcoming events related to application lifecycle
  //exposing this callback should handle most situations
  //return false to hold closing main window and thus whole application
  //return true to proceed with closing flow
  base::RepeatingCallback<bool()> should_allow_close_callback;

  // Initial URL to load.
  std::string url;

  WebAppType app_type;
};

enum class WindowTheme {
  Light,
  Dark
};

// Represents a top-level native window in the browser process. While references
// to this object are thread-safe the methods must be called on the main thread
// unless otherwise indicated.
class RootWindow
    : public base::RefCountedThreadSafe<RootWindow, DeleteOnMainThread> {
 public:
  // This interface is implemented by the owner of the RootWindow. The methods
  // of this class will be called on the main thread.
  class Delegate {
   public:
    // Called to retrieve the CefRequestContext for browser. Only called for
    // non-popup browsers. May return nullptr.
    virtual CefRefPtr<CefRequestContext> GetRequestContext(
        RootWindow* root_window) = 0;

    // Returns the ImageCache.
    virtual scoped_refptr<ImageCache> GetImageCache() = 0;

    // Called to exit the application.
    virtual void OnExit(RootWindow* root_window) = 0;

    // Called when the RootWindow has been destroyed.
    virtual void OnRootWindowDestroyed(RootWindow* root_window) = 0;

    // Called when the RootWindow is activated (becomes the foreground window).
    virtual void OnRootWindowActivated(RootWindow* root_window) = 0;

        // Called when the browser is created for the RootWindow.
    virtual void OnBrowserCreated(RootWindow* root_window,
                                  CefRefPtr<CefBrowser> browser) = 0;

    virtual void OnBrowserClosing(RootWindow* root_window,
                                  CefRefPtr<CefBrowser> browser) = 0;

   protected:
    virtual ~Delegate() {}
  };

  // Create a new RootWindow object. This method may be called on any thread.
  // Use RootWindowManager::CreateRootWindow() or CreateRootWindowAsPopup()
  // instead of calling this method directly. |use_views| will be true if the
  // Views framework should be used.
  static scoped_refptr<RootWindow> Create(bool use_views);

  // Returns the RootWindow associated with the specified |browser_id|. Must be
  // called on the main thread.
  static scoped_refptr<RootWindow> GetForBrowser(int browser_id);

  // Initialize as a normal window. This will create and show a native window
  // hosting a single browser instance. This method may be called on any thread.
  // |delegate| must be non-nullptr and outlive this object.
  // Use RootWindowManager::CreateRootWindow() instead of calling this method
  // directly.
  virtual void Init(RootWindow::Delegate* delegate,
                    std::unique_ptr<RootWindowConfig> config,
                    const CefBrowserSettings& settings,
                    CefRefPtr<CefDictionaryValue> extra_info) = 0;

  // Initialize as a popup window. This is used to attach a new native window to
  // a single browser instance that will be created later. The native window
  // will be created and shown once the browser is available. This method may be
  // called on any thread. |delegate| must be non-nullptr and outlive this
  // object. Use RootWindowManager::CreateRootWindowAsPopup() instead of calling
  // this method directly. Called on the UI thread.
  virtual void InitAsPopup(RootWindow::Delegate* delegate,
                           bool with_controls,
                           const CefPopupFeatures& popupFeatures,
                           CefWindowInfo& windowInfo,
                           CefRefPtr<CefClient>& client,
                           CefBrowserSettings& settings,
                           CefRefPtr<CefDictionaryValue>& extra_info) = 0;

// Initialize as a popup window. This is used to attach a new native window to
// a single browser instance that will be created later. The native window
// will be created and shown once the browser is available. This method may be
// called on any thread. |delegate| must be non-nullptr and outlive this
// object. Use RootWindowManager::CreateRootWindowAsPopup() instead of calling
// this method directly. Called on the UI thread.
// This method has extended properties for controlling popup names and modal state.
  virtual void InitAsPopup(RootWindow::Delegate* delegate,
      WebAppType app_type,
      bool with_controls,
      bool is_modal,
      cef_window_handle_t parent_window_handle,
      const CefPopupFeatures& popupFeatures,
      CefWindowInfo& windowInfo,
      CefRefPtr<CefClient>& client,
      CefBrowserSettings& settings,
      CefRefPtr<CefDictionaryValue>& extra_info) = 0;

  enum ShowMode {
    ShowNormal,
    ShowMinimized,
    ShowMaximized,
    ShowNoActivate,
  };

  // Show the window.
  virtual void Show(ShowMode mode) = 0;

  // Set title text
  virtual void SetTitleText(std::string text) = 0;

  // Show title indicator
  virtual void ShowTitleIndicator(bool show) = 0;

  // Hide the window.
  virtual void Hide() = 0;
      
  virtual void Undo() = 0;
  
  virtual void Redo() = 0;

  virtual void ShowDevTools() = 0;

  virtual WebAppType GetWebAppType() const = 0;

  // Set the window bounds in screen coordinates.
  virtual void SetBounds(int x, int y, size_t width, size_t height) = 0;

  // Set the window bounds in screen coordinates.
  virtual void SetSize(size_t width, size_t height) = 0;

  // Adjust the window height by a number of screen coordinates
  virtual void AdjustHeight(int height_diff) = 0;

  // Set the window minimum size in screen coordinates.
  virtual void SetMinimumSize(size_t width, size_t height) = 0;

  // Set the window maximum size in screen coordinates.
  virtual void SetMaximumSize(size_t width, size_t height) = 0;

  // Close the window. If |force| is true onunload handlers will not be
  // executed.
  virtual void Close(bool force) = 0;

  // Set the device scale factor. Only used in combination with off-screen
  // rendering.
  virtual void SetDeviceScaleFactor(float device_scale_factor) = 0;

  // Returns the device scale factor. Only used in combination with off-screen
  // rendering.
  virtual float GetDeviceScaleFactor() const = 0;

  // Returns the browser that this window contains, if any.
  virtual CefRefPtr<CefBrowser> GetBrowser() const = 0;

  // Returns the native handle for this window, if any.
  virtual ClientWindowHandle GetWindowHandle() const = 0;

  virtual ClientWindowHandle GetParentRootWindowHandle() const = 0;

  virtual void SetWindowTheme(WindowTheme theme) = 0;

  virtual std::unique_ptr<RootWindowConfig>& GetConfig() = 0;

 protected:
  // Allow deletion via scoped_refptr only.
  friend struct DeleteOnMainThread;
  friend class base::RefCountedThreadSafe<RootWindow, DeleteOnMainThread>;

  RootWindow();
  virtual ~RootWindow();

  Delegate* delegate_;
};

}  // namespace client

