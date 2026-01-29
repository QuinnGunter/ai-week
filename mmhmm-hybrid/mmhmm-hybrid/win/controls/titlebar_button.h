//
// mmhmm Windows
// Copyright © 2020-2025 mmhmm, inc. All rights reserved.
//
#pragma once
#include <windows.h>

#include <dwrite.h>
#include <functional>
#include "base_control.h"
#include "../common/titlebar_button.h"

using namespace client;

namespace {
typedef HANDLE HTHEME;
}

namespace mmhmm::controls {

extern const wchar_t* TitlebarButtonWindowClass;

class TitlebarButton : public BaseControl {
 private:
  TitlebarButton(HWND parent, std::wstring text);

 public:
  virtual ~TitlebarButton() {}
  static std::unique_ptr<TitlebarButton> Create(HWND parent,
                                                     std::wstring title);
  LRESULT HandleMessage(HWND hWnd, UINT message, WPARAM wParam, LPARAM lParam);

  void OnActivate();
  void OnMouseMove();
  void OnMouseLeave();
  bool OnMouseButtonUp(LPARAM lparam);
  void SetClickCallback(std::function<void(void)> click_callback);
  RECT GetDesiredSize() const;
  HRESULT OnRender(ComPtr<ID2D1DeviceContext5> device_context) override;
  void DpiChanged() override;
  void SetVisibility(Visibility visibility) override;

 private:
  void PaintBackground(ComPtr<ID2D1DeviceContext5> device_context);
  void PaintIcon(ComPtr<ID2D1DeviceContext5> device_context,
                 int dpi,
                 int icon_width);
  void PaintText(ComPtr<ID2D1DeviceContext5> device_context,
                 int dpi,
                 bool has_focus);
  void DrawIcon(ComPtr<ID2D1DeviceContext5> device_context,
                UINT icon_dimension,
                const D2D1_RECT_F& rect,
                D2D1::ColorF* foreground_brush,
                UINT dpi,
                LPCTSTR icon_id,
                float rotation_angle);
  void CreateTextLayout(std::wstring title);

 private:
  std::function<void(void)> click_callback_;
  bool is_mouse_over_ = false;
  bool is_tracking_mouse_ = false;
  int icon_width_ = 18;
  int icon_rect_width_ = 26;
  int icon_padding_ = 4;
  ComPtr<IDWriteTextLayout> text_layout_;
  int max_width_ = 60;
  int max_height_ = 32;
  std::wstring text_ = L"";
};
}  // namespace mmhmm
