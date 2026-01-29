//
// mmhmm Windows
// Copyright © 2020-2024 mmhmm, inc. All rights reserved.
//
#pragma once
#include <windows.h>

#include <d2d1_3.h>
#include <functional>
#include <wrl/client.h>

#include "base_control.h"
#include "camera_status_control.h"
#include "titlebar_button.h"
#include "../browser/root_window.h"
#include "../common/titlebar_button.h"

using namespace client;
using namespace Microsoft::WRL;

namespace mmhmm::controls {

extern const wchar_t* TitlebarWindowClass;

typedef struct {
  RECT close;
  RECT maximize;
  RECT minimize;
  RECT menu;
} TitleBarButtonRects;

enum class TitleBarHoveredButton { None, Minimize, Maximize, Close, Menu };

typedef struct TitlebarButtons {
  bool has_close_button = false;
  bool has_maximise_button = false;
  bool has_minimize_button = false;
  bool has_menu_button = false;
} TitlebarButtons;

class Titlebar : public BaseControl {
 private:
  Titlebar(HWND hwnd,
           std::wstring title,
           TitlebarButtons buttons,
           bool auto_hide_toolbar);

 public:
  virtual ~Titlebar() {}
  static std::unique_ptr<Titlebar> Create(HWND parent,
                                          std::wstring title,
                                          TitlebarButtons buttons,
                                          bool auto_hide_toolbar);
  LRESULT HandleMessage(HWND hWnd,
                        UINT message,
                        WPARAM wParam,
                        LPARAM lParam) override;
  void OnMouseMove();
  bool OnMouseButtonDown() const;
  bool OnMouseButtonUp(LPARAM lparam);
  void SetCloseCallback(std::function<void(void)> close_callback);
  void SetMaximizeCallback(std::function<void(void)> maximize_callback);
  void SetMinimizeCallback(std::function<void(void)> minimize_callback);
  void SetShowMenuCallback(
      std::function<void(POINT click_point)> show_menu_callback);
  void SetActionButtonClickedCallback(
      std::function<void(void)> action_button_click_callback);
  void SetToolboxButtonClickedCallback(
      std::function<void(void)> toolbox_button_click_callback);
  HRESULT OnRender(ComPtr<ID2D1DeviceContext5> device_context) override;
  void OnActivate() const;
  RECT GetTitlebarRect(HWND parent);
  void OnThemeChanged(WindowTheme theme) override;
  TitleBarButtonRects GetButtonRecs(const RECT* title_bar_rect) const;
  void SetShowIndicator(bool show);
  void OnSize();
  void SetStatus(std::wstring text, Icon icon);
  void ExpandStatus();
  void CollapseStatus();
  void DpiChanged() override;
  void SetVisibility(Visibility visibility) override;
  void SetCameraStatusVisibility(Visibility visibility);
  void SetToolboxVisibility(Visibility visibilty);

 private:
  void StatusClicked();
  void ToolboxClicked();
  void DrawButton(ComPtr<ID2D1DeviceContext5> device_context,
                  UINT icon_dimension,
                  const RECT& rect,
                  ID2D1Brush* background_brush,
                  D2D1::ColorF* foreground_color,
                  UINT dpi,
                  bool mouse_over,
                  LPCTSTR icon_id);

 private:
  TitleBarHoveredButton hovered_button_ = TitleBarHoveredButton::None;
  bool should_paint_title_ = true;
  bool auto_hide_toolbar_ = false;
  bool is_mouse_inside_ = false;
  bool should_paint_indicator_ = false;
  std::function<void(void)> close_callback_;
  std::function<void(void)> maximize_callback_;
  std::function<void(void)> minimize_callback_;
  std::function<void(POINT click_point)> show_menu_callback_;
  std::function<void(void)> action_button_click_callback_;
  std::function<void(void)> toolbox_button_click_callback_;
  TitlebarButtons buttons_;
  std::unique_ptr<CameraStatusControl> camera_status_;
  std::unique_ptr<TitlebarButton> toolbox_button_;
  bool is_status_expanded_ = false;
  int button_width_ = 47;
  int icon_width_ = 16;
  int compact_width_ = 600;
};
}  // namespace mmhmm

