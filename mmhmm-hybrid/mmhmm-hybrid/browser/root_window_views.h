// Copyright (c) 2016 The Chromium Embedded Framework Authors. All rights
// reserved. Use of this source code is governed by a BSD-style license that
// can be found in the LICENSE file.

#pragma once

#include <memory>
#include <string>

#include "client_handler.h"
#include "root_window.h"
#include "views_window.h"
#include "../common/exceptions.h"

namespace client {

// Views framework implementation of a top-level window in the browser process.
// The methods of this class must be called on the main thread unless otherwise
// indicated.
class RootWindowViews : public RootWindow,
                        public ClientHandler::Delegate,
                        public ViewsWindow::Delegate {
 public:
  // Constructor may be called on any thread.
  RootWindowViews();
  ~RootWindowViews();

  // RootWindow methods:
  void Init(RootWindow::Delegate* delegate,
            std::unique_ptr<RootWindowConfig> config,
            const CefBrowserSettings& settings,
            CefRefPtr<CefDictionaryValue> extra_info) override;
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
  void ShowTitleIndicator(bool show) override {
    throw mmhmm::NotImplementedException();
  }
  void Hide() override;
  void Undo() override;
  void Redo() override;
  void ShowDevTools() override;
  WebAppType GetWebAppType() const override;
  void SetBounds(int x, int y, size_t width, size_t height) override;
  void SetSize(size_t width, size_t height) override;
  void SetMinimumSize(size_t width, size_t height) override;
  void SetMaximumSize(size_t width, size_t height) override;
  void AdjustHeight(int height) override { throw mmhmm::NotImplementedException(); }
  void Close(bool force) override;
  void SetDeviceScaleFactor(float device_scale_factor) override;
  float GetDeviceScaleFactor() const override;
  CefRefPtr<CefBrowser> GetBrowser() const override;
  ClientWindowHandle GetWindowHandle() const override;
  ClientWindowHandle GetParentRootWindowHandle() const override;
  void SetWindowTheme(WindowTheme theme) override;

  // ViewsWindow::Delegate methods:
  bool WithControls() override;
  bool InitiallyHidden() override;
  CefRefPtr<CefWindow> GetParentWindow() override;
  CefRect GetWindowBounds() override;
  scoped_refptr<ImageCache> GetImageCache() override;
  void OnViewsWindowCreated(CefRefPtr<ViewsWindow> window) override;
  void OnViewsWindowDestroyed(CefRefPtr<ViewsWindow> window) override;
  void OnViewsWindowActivated(CefRefPtr<ViewsWindow> window) override;
  ViewsWindow::Delegate* GetDelegateForPopup(
      CefRefPtr<CefClient> client) override;
  void OnExit() override;
  std::unique_ptr<RootWindowConfig>& GetConfig() override;

 protected:
  // ClientHandler::Delegate methods:
  void OnBrowserCreated(CefRefPtr<CefBrowser> browser) override;
  void OnBrowserClosing(CefRefPtr<CefBrowser> browser) override;
  void OnBrowserClosed(CefRefPtr<CefBrowser> browser) override;
  void OnSetAddress(const std::string& url) override;
  void OnSetTitle(const std::string& title) override;
  void OnSetFavicon(CefRefPtr<CefImage> image) override;
  void OnSetFullscreen(bool fullscreen) override;
  void OnAutoResize(const CefSize& new_size) override;
  void OnSetLoadingState(bool isLoading,
                         bool canGoBack,
                         bool canGoForward) override;
  void OnSetDraggableRegions(
      const std::vector<CefDraggableRegion>& regions) override;
  void OnTakeFocus(bool next) override;
  void OnBeforeContextMenu(CefRefPtr<CefMenuModel> model) override;

 private:
  void CreateClientHandler(const std::string& url);

  void InitOnUIThread(const CefBrowserSettings& settings,
                      CefRefPtr<CefDictionaryValue> extra_info,
                      CefRefPtr<CefRequestContext> request_context);
  void CreateViewsWindow(const CefBrowserSettings& settings,
                         CefRefPtr<CefDictionaryValue> extra_info,
                         CefRefPtr<CefRequestContext> request_context,
                         const ImageCache::ImageSet& images);

  void NotifyViewsWindowDestroyed();
  void NotifyViewsWindowActivated();
  void NotifyDestroyedIfDone();

  // After initialization all members are only accessed on the main thread
  // unless otherwise indicated.
  // Members set during initialization.
  std::unique_ptr<RootWindowConfig> config_;
  bool is_popup_ = false;
  CefRect initial_bounds_;
  bool position_on_resize_ = false;
  CefRefPtr<ClientHandler> client_handler_;

  bool initialized_ = false;
  bool window_destroyed_ = false;
  bool browser_destroyed_ = false;
  WebAppType app_type_;

  CefRefPtr<CefBrowser> browser_;

  // Only accessed on the browser process UI thread.
  CefRefPtr<ViewsWindow> window_;
  scoped_refptr<ImageCache> image_cache_;

  ClientWindowHandle parent_window_handle_;

  DISALLOW_COPY_AND_ASSIGN(RootWindowViews);
};

}  // namespace client

