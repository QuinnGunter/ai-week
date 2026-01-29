//
// mmhmm Windows
// Copyright © 2020-2024 mmhmm, inc. All rights reserved.
//
#pragma once
#include <windows.h>

#include <d2d1_3.h>
#include <d3d11_4.h>
#include <wrl/client.h>
#include "../browser/root_window.h"
#include "exceptions.h"

using namespace client;
using namespace Microsoft::WRL;

namespace mmhmm::controls {

  enum class Visibility {
    Visible,
    Hidden
  };

class BaseControl {
 public:
  BaseControl(HWND hwnd, std::wstring title, std::wstring classname);
  virtual ~BaseControl() {}

  static LRESULT CALLBACK BaseWindowProc(HWND hWnd,
                                         UINT message,
                                         WPARAM wParam,
                                         LPARAM lParam);

  static void Register(std::wstring classname);
  void Unregister();
  void Paint(HWND hwnd);
  void Render();
  virtual HRESULT OnRender(ComPtr<ID2D1DeviceContext5> device_context) = 0;
  void SetTheme(WindowTheme theme);
  virtual void OnThemeChanged(WindowTheme theme) {}
  HWND GetHwnd() const;
  void Invalidate() const;
  virtual LRESULT HandleMessage(HWND hWnd,
                                UINT message,
                                WPARAM wParam,
                                LPARAM lParam) = 0;
  virtual void DpiChanged() = 0;
  virtual void SetVisibility(Visibility visibility) = 0;

 protected:
  ComPtr<ID2D1DeviceContext5> GetDeviceContext() const;
  static HWND CreateBaseWindow(HWND parent,
                               std::wstring title,
                               std::wstring classname,
                               RECT rect,
                               BaseControl* ptr,
                               DWORD style = 0,
                               DWORD ex_style = 0);

 private:
  HRESULT CreateDeviceResources();
  void DiscardDeviceResources();
  void ResizeSwapChainBitmap();
  ComPtr<IDXGIAdapter> GetPreferredGpuAdapter(std::wstring applicationPath);

 protected:
  std::wstring title_;
  WindowTheme window_theme_ = WindowTheme::Light;
  HWND hwnd_ = nullptr;
  HWND parent_ = nullptr;
  std::wstring classname_;
  Visibility visibility_ = Visibility::Visible;

 private:
  ComPtr<ID2D1Factory6> direct2d_factory_;
  ComPtr<ID2D1DeviceContext5> device_context_;
  ComPtr<ID3D11Device5> direct3d_device_;
  ComPtr<ID2D1Device5> direct2d_device_;
  ComPtr<IDXGISwapChain1> dxgi_swapchain_;
  ComPtr<ID2D1Bitmap1> direct2d_backbufer_;
  ComPtr<ID2D1Factory6> direct2d_;
};
}  // namespace mmhmm
