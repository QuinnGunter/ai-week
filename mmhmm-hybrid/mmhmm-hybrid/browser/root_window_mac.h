// Copyright (c) 2015 The Chromium Embedded Framework Authors. All rights
// reserved. Use of this source code is governed by a BSD-style license that
// can be found in the LICENSE file.

#pragma once

#include <memory>
#include <string>

#include "browser_window.h"
#include "root_window.h"
#include "../common/exceptions.h"

namespace client {

class RootWindowMacImpl;

// OS X implementation of a top-level native window in the browser process.
// The methods of this class must be called on the main thread unless otherwise
// indicated.
class RootWindowMac : public RootWindow, public BrowserWindow::Delegate {
 public:
  // Constructor may be called on any thread.
  RootWindowMac();
  ~RootWindowMac();

  BrowserWindow* browser_window() const;
  RootWindow::Delegate* delegate() const;

  // RootWindow methods.
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
                   CefRefPtr<CefDictionaryValue>& extra_info) override {
    throw mmhmm::NotImplementedException();
  }
  void Show(ShowMode mode) override;
  void Hide() override;
  void Undo() override {}
  void Redo() override {}
  void ShowDevTools() override {};
  WebAppType GetWebAppType() const override { return app_type_; };
  void SetBounds(int x, int y, size_t width, size_t height) override;
  void SetSize(size_t width, size_t height) override {
    throw mmhmm::NotImplementedException();
  }
  void SetMinimumSize(size_t width, size_t height) override {
    throw mmhmm::NotImplementedException();
  }
  void SetMaximumSize(size_t width, size_t height) override {
    throw mmhmm::NotImplementedException();
  }
  void SetTitleText(std::string text) override {
	// Implemented in views
    throw mmhmm::NotImplementedException();
  }
  void ShowTitleIndicator(bool show) override {
    throw mmhmm::NotImplementedException();
  }
  void AdjustHeight(int height_diff) override {
    throw mmhmm::NotImplementedException();
  }
  void Close(bool force) override;
  void SetDeviceScaleFactor(float device_scale_factor) override;
  float GetDeviceScaleFactor() const override;
  CefRefPtr<CefBrowser> GetBrowser() const override;
  ClientWindowHandle GetWindowHandle() const override;
  ClientWindowHandle GetParentRootWindowHandle() const override;
  void SetWindowTheme(WindowTheme theme) override;

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

  void OnNativeWindowClosed();

  std::unique_ptr<RootWindowConfig>& GetConfig() override {
    throw mmhmm::NotImplementedException();
  }

 private:
  CefRefPtr<RootWindowMacImpl> impl_;
  WebAppType app_type_;

  DISALLOW_COPY_AND_ASSIGN(RootWindowMac);

  friend class RootWindowMacImpl;
};

}  // namespace client

