//
// mmhmm Windows
// Copyright © 2020-2024 mmhmm, inc. All rights reserved.
//
#pragma once
#include <windows.h>

#include <dwrite.h>
#include <functional>
#include "base_control.h"

using namespace client;

namespace {
typedef HANDLE HTHEME;
}

namespace mmhmm::controls {

extern const wchar_t* CameraControlWindowClass;

enum class Icon {
  none,
  config,
  connected,
  disconnected
};

class CameraStatusControl : public BaseControl {
 private:
  CameraStatusControl(HWND parent, std::wstring title);

 public:
  virtual ~CameraStatusControl() {}
  static std::unique_ptr<CameraStatusControl> Create(HWND parent, std::wstring title);
  LRESULT HandleMessage(HWND hWnd, UINT message, WPARAM wParam, LPARAM lParam);
  
  void OnActivate();
  void OnMouseMove();
  void OnMouseLeave();
  bool OnMouseButtonUp(LPARAM lparam);
  void SetClickCallback(std::function<void(void)> click_callback);
  void SetStatus(std::wstring text, Icon icon);
  void Expand();
  void Collapse();
  RECT GetDesiredSize();
  HRESULT OnRender(ComPtr<ID2D1DeviceContext5> device_context) override;
  void DpiChanged() override;
  void SetVisibility(Visibility visibility) override;
  void SetTextVisibility(Visibility visibility);

 private:
  void PaintBackground(ComPtr<ID2D1DeviceContext5> device_context);
  void PaintText(ComPtr<ID2D1DeviceContext5> device_context,
                 int dpi);
  void PaintIcon(ComPtr<ID2D1DeviceContext5> device_context, int dpi, int icon_width);
  void PaintExpander(ComPtr<ID2D1DeviceContext5> device_context,
                 int dpi,
                 int icon_width);
  void DrawIcon(ComPtr<ID2D1DeviceContext5> device_context,
                UINT icon_dimension,
                const D2D1_RECT_F& rect,
                D2D1::ColorF* foreground_brush,
                UINT dpi,
                LPCTSTR icon_id,
                float rotation_angle = 0.0f);
  void CreateTextLayout(std::wstring title);
  bool ShouldPaintText() const;

 private:
  Icon icon_ = Icon::none;
  std::function<void(void)> click_callback_;
  std::wstring text_ = L"";
  Visibility text_visibility_ = Visibility::Visible;
  bool is_mouse_over_ = false;
  bool is_tracking_mouse_ = false;
  int text_padding_ = 10;
  int icon_width_ = 18;
  int icon_padding_ = 4;
  int icon_rect_width_ = 24;
  ComPtr<IDWriteTextLayout> text_layout_;
  int max_width_ = 350;
  int max_height_ = 32;
  bool is_expanded = false;
};
}  // namespace mmhmm
