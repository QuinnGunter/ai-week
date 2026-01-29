#include "titlebar.h"

#include <uxtheme.h>
#include <vssym32.h>

#include "colors.h"
#include "image_loader.h"
#include "layout.h"
#include "svg_renderer.h"
#include "../browser/resource.h"
#include "../win/utils.h"
#include "../../browser/util_win.h"
#include "titlebar_button.h"

namespace mmhmm::controls {

const wchar_t* TitlebarWindowClass = L"titlebarclass";

#ifndef GET_X_PARAM
#define GET_X_PARAM(lp) ((int)(short)LOWORD(lp))
#endif

#ifndef GET_Y_PARAM
#define GET_Y_PARAM(lp) ((int)(short)HIWORD(lp))
#endif

#define SHADOW_HEIGHT 1
#define MAXIMIZED_RECTANGLE_OFFSET 2

TitleBarButtonRects Titlebar::GetButtonRecs(const RECT* title_bar_rect) const {
  TitleBarButtonRects button_rects = {};
  UINT dpi = GetDpiForWindow(hwnd_);

  int button_width = Layout::ScaleForDPI(button_width_, dpi);
  button_rects.close = *title_bar_rect;
  button_rects.close.top += SHADOW_HEIGHT;
  button_rects.close.left = button_rects.close.right - button_width;

  if (buttons_.has_maximise_button) {
    button_rects.maximize = button_rects.close;
    button_rects.maximize.left -= button_width;
    button_rects.maximize.right -= button_width;
  }

  if (buttons_.has_minimize_button) {
    button_rects.minimize = buttons_.has_maximise_button ? button_rects.maximize
                                                         : button_rects.close;
    button_rects.minimize.left -= button_width;
    button_rects.minimize.right -= button_width;
  }

  if (buttons_.has_menu_button) {
    button_rects.menu = button_rects.close;
    button_rects.menu.left = 0;
    button_rects.menu.top = SHADOW_HEIGHT;
    button_rects.menu.right = button_width;
  }
  return button_rects;
}

Titlebar::Titlebar(HWND hwnd,
                   std::wstring title,
                   TitlebarButtons buttons,
                   bool auto_hide_toolbar)
    : BaseControl(hwnd, title, TitlebarWindowClass),
      buttons_(buttons),
      auto_hide_toolbar_(auto_hide_toolbar) {}

std::unique_ptr<Titlebar> Titlebar::Create(HWND parent,
                                           std::wstring title,
                                           TitlebarButtons buttons,
                                           bool auto_hide_toolbar) {
  BaseControl::Register(TitlebarWindowClass);
  auto titlebar_control = std::unique_ptr<Titlebar>(
      new Titlebar(parent, title, buttons, auto_hide_toolbar));

  BaseControl::CreateBaseWindow(parent, title, TitlebarWindowClass, {0}, titlebar_control.get(),
                                WS_CHILD | WS_CLIPSIBLINGS | WS_VISIBLE,
                                WS_EX_LAYERED | WS_EX_COMPOSITED);
  SetLayeredWindowAttributes(titlebar_control->hwnd_, 0, 255, LWA_ALPHA);
  return titlebar_control;
}

LRESULT Titlebar::HandleMessage(HWND hwnd,
                                UINT message,
                                WPARAM wParam,
                                LPARAM lParam) {
  switch (message) {
    case WM_CREATE: {
      // Can't do this in the constructor.
      // Need to wait until handle has been created so we can pass as a parent.
      camera_status_ = CameraStatusControl::Create(hwnd_, L"CameraStatus");
      camera_status_->SetClickCallback(
          std::bind(&Titlebar::StatusClicked, this));
      toolbox_button_ = TitlebarButton::Create(hwnd_, GetResourceString(IDS_CONTROLS_TOOBOX_CAPTION).c_str());
      toolbox_button_->SetClickCallback(
          std::bind(&Titlebar::ToolboxClicked, this));
    } break;
    case WM_NCHITTEST:
      return HTTRANSPARENT;
    case WM_DESTROY:
      break;
    case WM_MOUSEMOVE:
      OnMouseMove();
      break;
    case WM_LBUTTONUP:
      OnMouseButtonUp(lParam);
      break;
    case WM_LBUTTONDOWN:
      OnMouseButtonDown();
      break;
    case WM_SIZE:
      OnSize();
      break;
  }

  return 0;
}

void Titlebar::OnMouseMove() {
  if (!hwnd_) {
    return;
  }

  POINT cursor_point;
  GetCursorPos(&cursor_point);
  ScreenToClient(hwnd_, &cursor_point);

  RECT title_bar_rect;
  GetClientRect(hwnd_, &title_bar_rect);
  auto button_rects = GetButtonRecs(&title_bar_rect);

  //Adjust hit test to ignore the border resize area
  UINT dpi = GetDpiForWindow(hwnd_);
  int border_size = GetSystemMetricsForDpi(SM_CXFRAME, dpi);
  button_rects.close.top += border_size;
  button_rects.maximize.top += border_size;
  button_rects.menu.top += border_size;
  button_rects.minimize.top += border_size;

  auto new_hovered_button = TitleBarHoveredButton::None;
  if (PtInRect(&button_rects.close, cursor_point)) {
    new_hovered_button = TitleBarHoveredButton::Close;
  } else if (buttons_.has_minimize_button &&
             PtInRect(&button_rects.minimize, cursor_point)) {
    new_hovered_button = TitleBarHoveredButton::Minimize;
  } else if (buttons_.has_maximise_button &&
             PtInRect(&button_rects.maximize, cursor_point)) {
    new_hovered_button = TitleBarHoveredButton::Maximize;
  } else if (buttons_.has_menu_button &&
             PtInRect(&button_rects.menu, cursor_point)) {
    new_hovered_button = TitleBarHoveredButton::Menu;
  }
  if (new_hovered_button != hovered_button_) {
    InvalidateRect(hwnd_, &button_rects.close, FALSE);
    InvalidateRect(hwnd_, &button_rects.minimize, FALSE);
    InvalidateRect(hwnd_, &button_rects.maximize, FALSE);
    InvalidateRect(hwnd_, &button_rects.menu, FALSE);

    hovered_button_ = new_hovered_button;
  }
}

bool Titlebar::OnMouseButtonDown() const {
  return hovered_button_ != TitleBarHoveredButton::None;
}

bool Titlebar::OnMouseButtonUp(LPARAM lparam) {
  switch (hovered_button_) {
    case TitleBarHoveredButton::Minimize:
      if (minimize_callback_) {
        minimize_callback_();
      }
      return true;
    case TitleBarHoveredButton::Maximize:
      if (maximize_callback_) {
        maximize_callback_();
      }
      return true;
    case TitleBarHoveredButton::Close:
      if (close_callback_) {
        close_callback_();
      }
      return true;
    case TitleBarHoveredButton::Menu:
      if (show_menu_callback_) {
        POINT click_point = {GET_X_PARAM(lparam), GET_Y_PARAM(lparam)};
        show_menu_callback_(click_point);
      }
      return true;
    default:
    case TitleBarHoveredButton::None:
      return false;
  }
}

void Titlebar::SetCloseCallback(std::function<void(void)> close_callback) {
  close_callback_ = close_callback;
}

void Titlebar::SetMaximizeCallback(
    std::function<void(void)> maximize_callback) {
  maximize_callback_ = maximize_callback;
}

void Titlebar::SetMinimizeCallback(
    std::function<void(void)> minimize_callback) {
  minimize_callback_ = minimize_callback;
}

void Titlebar::SetShowMenuCallback(
    std::function<void(POINT)> show_menu_callback) {
  show_menu_callback_ = show_menu_callback;
}

void Titlebar::SetActionButtonClickedCallback(
    std::function<void(void)> action_button_click_callback) {
  action_button_click_callback_ = action_button_click_callback;
}

void Titlebar::SetToolboxButtonClickedCallback(
    std::function<void(void)> toolbox_button_click_callback) {
  toolbox_button_click_callback_ = toolbox_button_click_callback;
}

HRESULT Titlebar::OnRender(ComPtr<ID2D1DeviceContext5> device_context) {
  HRESULT hr = S_OK;

  device_context->SetTransform(D2D1::Matrix3x2F::Identity());

  auto has_focus = Layout::AppHasFocus();
  auto background_color = window_theme_ == WindowTheme::Dark
                                      ? DarkBackgroundColor
                                      : LightBackgroundColor;

  device_context->Clear(background_color);

  RECT rect;
  GetClientRect(hwnd_, &rect);

  auto title_bar_rect = Layout::RectToD2DRect(rect);

  ComPtr<ID2D1SolidColorBrush> title_bar_brush;
  hr = device_context->CreateSolidColorBrush(background_color,
                                             title_bar_brush.GetAddressOf());
  ThrowIfFailed(hr);

  device_context->FillRectangle(title_bar_rect, title_bar_brush.Get());

  ComPtr<ID2D1SolidColorBrush> button_hover_brush;
  auto button_hover_color = window_theme_ == WindowTheme::Dark
                                        ? DarkButtonHoverColor
                                        : LightButtonHoverColor;
  hr = device_context->CreateSolidColorBrush(button_hover_color,
                                             button_hover_brush.GetAddressOf());
  ThrowIfFailed(hr);

  ComPtr<ID2D1SolidColorBrush> close_hover_brush;
  hr = device_context->CreateSolidColorBrush(CloseButtonBackgroundColor,
                                             close_hover_brush.GetAddressOf());
  ThrowIfFailed(hr);

  auto title_bar_item_color =
      has_focus ? LightPenColorNormal : LightPenColorInactive;
  if (window_theme_ == WindowTheme::Dark) {
    title_bar_item_color =
        has_focus ? DarkPenColorNormal : DarkPenColorInactive;
  }

  auto button_rects = GetButtonRecs(&rect);
  UINT dpi = GetDpiForWindow(hwnd_);
  int icon_dimension = Layout::ScaleForDPI(icon_width_, dpi);

  ComPtr<ID2D1SolidColorBrush> button_foreground_brush;
  hr = device_context->CreateSolidColorBrush(
      title_bar_item_color, button_foreground_brush.GetAddressOf());

  ThrowIfFailed(hr);

  if (buttons_.has_menu_button) {
    DrawButton(device_context, icon_dimension, button_rects.menu,
               button_hover_brush.Get(), &title_bar_item_color, dpi,
               hovered_button_ == TitleBarHoveredButton::Menu,
               MAKEINTRESOURCE(IDSVG_MENU));
  }

  if (buttons_.has_minimize_button) {
    DrawButton(device_context, icon_dimension, button_rects.minimize,
               button_hover_brush.Get(), &title_bar_item_color, dpi,
               hovered_button_ == TitleBarHoveredButton::Minimize,
               MAKEINTRESOURCE(IDSVG_MINIMIZE));
  }

  if (buttons_.has_maximise_button) {
    DrawButton(device_context, icon_dimension, button_rects.maximize,
               button_hover_brush.Get(), &title_bar_item_color, dpi,
               hovered_button_ == TitleBarHoveredButton::Maximize,
               mmhmm::utils::IsWindowMaximized(parent_)
                   ? MAKEINTRESOURCE(IDSVG_RESTORE)
                   : MAKEINTRESOURCE(IDSVG_MAXIMIZE));
  }

  if (buttons_.has_close_button) {
    DrawButton(device_context, icon_dimension, button_rects.close,
               close_hover_brush.Get(), &title_bar_item_color, dpi,
               hovered_button_ == TitleBarHoveredButton::Close,
               MAKEINTRESOURCE(IDSVG_CLOSE));
  }

  return hr;
}

void Titlebar::DrawButton(ComPtr<ID2D1DeviceContext5> device_context,
                          UINT icon_dimension,
                          const RECT& rect,
                          ID2D1Brush* background_brush,
                          D2D1::ColorF* foreground_brush,
                          UINT dpi,
                          bool mouse_over,
                          LPCTSTR icon_id) {
  if (mouse_over) {
    device_context->FillRectangle(Layout::RectToD2DRect(rect),
                                  background_brush);
  }

  RECT icon_rect = {0};
  icon_rect.right = icon_dimension;
  icon_rect.bottom = icon_dimension;
  Layout::CentreRectInRect(&icon_rect, &rect);

  ComPtr<IStream> stream =
      ImageLoader::LoadImageAsStream(icon_id, MAKEINTRESOURCE(256));

  ThrowIfNullptr(stream.Get());

  auto svg = SvgRenderer::CreateSVG(
      device_context, stream, (float)(icon_dimension), (float)(icon_dimension));

  ThrowIfNullptr(svg.Get());

  ComPtr<ID2D1SvgElement> root;
  svg->GetRoot(root.GetAddressOf());
  ThrowIfNullptr(root.Get());
  SvgRenderer::RecolorSubtree(root.Get(), *foreground_brush);

  auto transform = D2D1::Matrix3x2F::Identity();
  transform = transform * D2D1::Matrix3x2F::Translation(D2D1::SizeF(
                              (float)(icon_rect.left), (float)icon_rect.top));

  device_context->SetTransform(transform);
  device_context->DrawSvgDocument(svg.Get());
  device_context->SetTransform(D2D1::Matrix3x2F::Identity());
}

void Titlebar::OnActivate() const {
  Invalidate();
}

RECT Titlebar::GetTitlebarRect(HWND parent) {
  SIZE title_bar_size = {0};
  const int top_and_bottom_borders = 2;
  HTHEME theme = OpenThemeData(parent, L"WINDOW");
  UINT dpi = GetDpiForWindow(parent);
  GetThemePartSize(theme, NULL, WP_CAPTION, CS_ACTIVE, NULL, TS_TRUE,
                   &title_bar_size);
  CloseThemeData(theme);

  int height =
      Layout::ScaleForDPI(title_bar_size.cy, dpi) + top_and_bottom_borders;

  RECT rect;
  GetClientRect(parent, &rect);
  rect.bottom = rect.top + height;
  return rect;
}

void Titlebar::OnThemeChanged(WindowTheme theme) {
  camera_status_->SetTheme(theme);
  if (toolbox_button_) {
    toolbox_button_->SetTheme(theme);
  }
}

void Titlebar::SetShowIndicator(bool show) {
  should_paint_indicator_ = show;
}

void Titlebar::OnSize() {
  if (camera_status_) {
    RECT title_bar_rect;
    GetClientRect(hwnd_, &title_bar_rect);

    UINT dpi = GetDpiForWindow(hwnd_);
    int compact_width = Layout::ScaleForDPI(compact_width_, dpi);
    if (title_bar_rect.right - title_bar_rect.left < compact_width) {
      camera_status_->SetTextVisibility(Visibility::Hidden);
    } else {
      camera_status_->SetTextVisibility(Visibility::Visible);
    }

    if (buttons_.has_menu_button) {
      auto button_rects = GetButtonRecs(&title_bar_rect);
      title_bar_rect.left += button_rects.menu.right - button_rects.menu.left;
    }

    RECT status_rect = camera_status_->GetDesiredSize();
    SetWindowPos(camera_status_->GetHwnd(), HWND_TOP, title_bar_rect.left,
                 title_bar_rect.top, status_rect.right - status_rect.left,
                 title_bar_rect.bottom - title_bar_rect.top, 0);

    if (toolbox_button_) {
      RECT toolbox_rect = toolbox_button_->GetDesiredSize();
      title_bar_rect.left += status_rect.right - status_rect.left;
      SetWindowPos(toolbox_button_->GetHwnd(), HWND_TOP, title_bar_rect.left,
                   title_bar_rect.top, toolbox_rect.right - toolbox_rect.left,
                   title_bar_rect.bottom - title_bar_rect.top, 0);
    }
  }
}

void Titlebar::StatusClicked() {
  if (action_button_click_callback_) {
    action_button_click_callback_();
  }
}

void Titlebar::ToolboxClicked() {
  if (toolbox_button_click_callback_) {
    toolbox_button_click_callback_();
  }
}

void Titlebar::SetStatus(std::wstring text, Icon icon) {
  if (camera_status_) {
    camera_status_->SetStatus(text, icon);
    OnSize();
  }
}

void Titlebar::ExpandStatus() {
  if (camera_status_) {
    is_status_expanded_ = true;
    camera_status_->Expand();
  }
}

void Titlebar::CollapseStatus() {
  if (camera_status_) {
    is_status_expanded_ = false;
    camera_status_->Collapse();
  }
}

void Titlebar::DpiChanged() {
  if (camera_status_) {
    camera_status_->DpiChanged();
  }

  if (toolbox_button_) {
    toolbox_button_->DpiChanged();
  }

  OnSize();
}

void Titlebar::SetVisibility(Visibility visibility) {
  visibility_ = visibility;
  OnSize();
}

void Titlebar::SetCameraStatusVisibility(Visibility visibility) {
  if (camera_status_) {
    camera_status_->SetVisibility(visibility);
  }
  OnSize();
}

void Titlebar::SetToolboxVisibility(Visibility visibilty) {
  if (toolbox_button_) {
    toolbox_button_->SetVisibility(visibilty);
  }
  OnSize();
}
}  // namespace mmhmm

