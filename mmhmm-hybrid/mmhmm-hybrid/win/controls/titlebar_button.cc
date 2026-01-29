#include "titlebar_button.h"

#include <dwrite.h>

#include "../browser/resource.h"
#include "colors.h"
#include "image_loader.h"
#include "layout.h"
#include "svg_renderer.h"

namespace mmhmm::controls {

const wchar_t* TitlebarButtonWindowClass = L"titlebarbuttonclass";

TitlebarButton::TitlebarButton(HWND parent, std::wstring text)
    : BaseControl(parent, text, TitlebarButtonWindowClass), text_(text) {}

std::unique_ptr<TitlebarButton> TitlebarButton::Create(
    HWND parent,
    std::wstring text) {
  BaseControl::Register(TitlebarButtonWindowClass);
  auto camera_status_control =
      std::unique_ptr<TitlebarButton>(new TitlebarButton(parent, text));

  BaseControl::CreateBaseWindow(parent, text, TitlebarButtonWindowClass, {0},
                                camera_status_control.get(),
      WS_CHILD | WS_CLIPSIBLINGS | WS_VISIBLE, WS_EX_COMPOSITED);

  return camera_status_control;
}

LRESULT TitlebarButton::HandleMessage(HWND hwnd,
                                           UINT message,
                                           WPARAM wParam,
                                           LPARAM lParam) {
  switch (message) {
    case WM_NCHITTEST: {
      UINT dpi = GetDpiForWindow(hwnd_);
      int border_size = GetSystemMetricsForDpi(SM_CXFRAME, dpi);

      POINTS points = MAKEPOINTS(lParam);
      POINT point = {points.x, points.y};
      ScreenToClient(hwnd_, &point);

      RECT border = {0};
      GetClientRect(hwnd_, &border);
      border.bottom = border_size;

      if (PtInRect(&border, point)) {
        return HTTRANSPARENT;
      } else {
        return HTCLIENT;
      }
    }
    case WM_MOUSEMOVE:
      OnMouseMove();
      return 0;
    case WM_MOUSELEAVE:
      OnMouseLeave();
      return 0;
    case WM_LBUTTONUP:
      return OnMouseButtonUp(lParam);
  }

  return 0;
}

void TitlebarButton::OnMouseMove() {
  if (!hwnd_) {
    return;
  }

  POINT cursor_point;
  GetCursorPos(&cursor_point);
  ScreenToClient(hwnd_, &cursor_point);

  RECT control_rect;
  GetClientRect(hwnd_, &control_rect);
  is_mouse_over_ = PtInRect(&control_rect, cursor_point);

  if (!is_tracking_mouse_) {
    // start tracking if we aren't already
    TRACKMOUSEEVENT tme = {};
    tme.cbSize = sizeof(TRACKMOUSEEVENT);
    tme.dwFlags = TME_HOVER | TME_LEAVE;
    tme.hwndTrack = hwnd_;
    tme.dwHoverTime = HOVER_DEFAULT;
    is_tracking_mouse_ = TrackMouseEvent(&tme);
    Invalidate();
  }
}

void TitlebarButton::OnMouseLeave() {
  is_tracking_mouse_ = false;
  is_mouse_over_ = false;
  Invalidate();
}

bool TitlebarButton::OnMouseButtonUp(LPARAM lparam) {
  if (click_callback_) {
    click_callback_();
    return false;
  }
  return true;
}

void TitlebarButton::SetClickCallback(std::function<void(void)> click_callback) {
  click_callback_ = click_callback;
}

HRESULT TitlebarButton::OnRender(
    ComPtr<ID2D1DeviceContext5> device_context) {
  HRESULT result = S_OK;
  UINT dpi = GetDpiForWindow(hwnd_);
  auto has_focus = Layout::AppHasFocus();

  PaintBackground(device_context);
  PaintIcon(device_context, dpi, icon_width_);
  PaintText(device_context, dpi, has_focus);

  return result;
}

void TitlebarButton::PaintBackground(
    ComPtr<ID2D1DeviceContext5> device_context) {
  RECT rect;
  GetClientRect(hwnd_, &rect);

  auto control_rect = Layout::RectToD2DRect(rect);

  auto clear_color = window_theme_ == WindowTheme::Dark
                         ? DarkBackgroundColor
                         : LightBackgroundColor;
  device_context->Clear(clear_color);

  auto background_color =
      window_theme_ == WindowTheme::Dark
          ? (is_mouse_over_ ? DarkButtonHoverColor : DarkBackgroundColor)
          : (is_mouse_over_ ? LightButtonHoverColor : LightBackgroundColor);

  ComPtr<ID2D1SolidColorBrush> background_brush;
  HRESULT hr = device_context->CreateSolidColorBrush(
      background_color, background_brush.GetAddressOf());
  ThrowIfFailed(hr);

  device_context->FillRectangle(&control_rect, background_brush.Get());
}


void TitlebarButton::PaintText(ComPtr<ID2D1DeviceContext5> device_context,
                                    int dpi,
                                    bool has_focus) {
  if (!text_layout_) {
    CreateTextLayout(title_);
  }

  if (!text_layout_)
    return;

  auto text_color =
      window_theme_ == WindowTheme::Dark
          ? (has_focus ? DarkPenColorNormal : DarkPenColorInactive)
          : (has_focus ? LightPenColorNormal : LightPenColorInactive);

  ComPtr<ID2D1SolidColorBrush> text_brush;
  HRESULT hr = device_context->CreateSolidColorBrush(text_color,
                                                     text_brush.GetAddressOf());

  ThrowIfFailed(hr);

  D2D1_POINT_2F point = {0};
  point.x = (Layout::ScaleForDPI(icon_rect_width_, dpi));
  device_context->DrawTextLayout(point, text_layout_.Get(), text_brush.Get());
}

void TitlebarButton::CreateTextLayout(std::wstring title) {
  ComPtr<ID2D1DeviceContext5> device_context = GetDeviceContext();
  ThrowIfNullptr(device_context.Get());

  UINT dpi = GetDpiForWindow(hwnd_);
  auto has_focus = Layout::AppHasFocus();

  RECT rect;
  GetClientRect(hwnd_, &rect);
  if (rect.right - rect.left == 0 || rect.bottom - rect.top == 0)
    return;

  auto control_rect = Layout::RectToD2DRect(rect);
  control_rect.right = Layout::ScaleForDPI(max_width_, dpi);

  LOGFONT logical_font = {};
  if (!SystemParametersInfoForDpi(SPI_GETICONTITLELOGFONT, sizeof(logical_font),
                                  &logical_font, false, dpi)) {
    throw std::exception("Unable to get font for dpi");
  }

  auto text_color =
      window_theme_ == WindowTheme::Dark
          ? (has_focus ? DarkPenColorNormal : DarkPenColorInactive)
          : (has_focus ? LightPenColorNormal : LightPenColorInactive);


  ComPtr<ID2D1SolidColorBrush> text_brush;
  HRESULT hr = device_context->CreateSolidColorBrush(text_color,
                                                     text_brush.GetAddressOf());

  ThrowIfFailed(hr);

  IDWriteFactory* write_factory = {};
  hr = DWriteCreateFactory(DWRITE_FACTORY_TYPE_SHARED, __uuidof(IDWriteFactory),
                           (IUnknown**)&write_factory);

  ThrowIfFailed(hr);

  ComPtr<IDWriteTextFormat> write_text_format;

  hr = write_factory->CreateTextFormat(
      logical_font.lfFaceName, nullptr, DWRITE_FONT_WEIGHT_REGULAR,
      DWRITE_FONT_STYLE_NORMAL, DWRITE_FONT_STRETCH_NORMAL,
      std::abs(logical_font.lfHeight), L"en-us",
      write_text_format.GetAddressOf());

  ThrowIfFailed(hr);

  write_text_format->SetParagraphAlignment(DWRITE_PARAGRAPH_ALIGNMENT_CENTER);

  hr = write_factory->CreateTextLayout(
      text_.c_str(), (UINT32)text_.length(), write_text_format.Get(),
      control_rect.right - control_rect.left,
      control_rect.bottom - control_rect.top, text_layout_.GetAddressOf());

  ThrowIfFailed(hr);
}

void TitlebarButton::OnActivate() {
  Invalidate();
}

RECT TitlebarButton::GetDesiredSize() const {
  UINT dpi = GetDpiForWindow(hwnd_);

  RECT rect;
  GetClientRect(hwnd_, &rect);

  if (text_layout_) {
    DWRITE_TEXT_METRICS metrics;
    text_layout_->GetMetrics(&metrics);

    rect.right =
        rect.left + Layout::ScaleForDPI(icon_rect_width_, dpi) + (metrics.width) + (icon_padding_*2);
  } else {
    rect.right = rect.left + Layout::ScaleForDPI(icon_rect_width_, dpi) +
                 max_width_ + (icon_padding_ * 2);
  }

  return rect;
}

void TitlebarButton::DpiChanged() {
  try {
    CreateTextLayout(title_);
    Invalidate();
  } catch (...) {
    return;
  }
}

void TitlebarButton::SetVisibility(Visibility visibility) {
  visibility_ = visibility;

  if (visibility == Visibility::Hidden) {
    ShowWindow(hwnd_, SW_HIDE);
  } else {
    ShowWindow(hwnd_, SW_SHOWNORMAL);
  }
}

void TitlebarButton::PaintIcon(ComPtr<ID2D1DeviceContext5> device_context,
                               int dpi,
                               int icon_width) {
  auto indicator_color = AirtimeCreatorIconColor;

  RECT rect;
  GetClientRect(hwnd_, &rect);
  rect.right = Layout::ScaleForDPI(icon_rect_width_, dpi);
  rect.bottom = Layout::ScaleForDPI(max_height_, dpi);

  auto scaled_icon_width = Layout::ScaleForDPI(icon_width, dpi);
  RECT icon_rect = {};
  icon_rect.right = scaled_icon_width;
  icon_rect.bottom = scaled_icon_width;

  Layout::CentreRectInRect(&icon_rect, &rect);

  auto control_rect = Layout::RectToD2DRect(icon_rect);
  DrawIcon(device_context, scaled_icon_width, control_rect, &indicator_color,
           dpi, MAKEINTRESOURCE(IDSVG_AIRTIME), 0);
}

void TitlebarButton::DrawIcon(ComPtr<ID2D1DeviceContext5> device_context,
                                     UINT icon_dimension,
                                     const D2D1_RECT_F& rect,
                                     D2D1::ColorF* foreground_brush,
                                     UINT dpi,
                                     LPCTSTR icon_id,
                                     float rotation_angle) {
    ComPtr<IStream> stream =
        ImageLoader::LoadImageAsStream(icon_id, MAKEINTRESOURCE(256));

    auto svg =
        SvgRenderer::CreateSVG(device_context, stream, (float)(icon_dimension),
                               (float)(icon_dimension));

    ThrowIfNullptr(svg.Get());

    ComPtr<ID2D1SvgElement> root;
    svg->GetRoot(root.GetAddressOf());
    ThrowIfNullptr(root.Get());
    SvgRenderer::RecolorSubtree(root.Get(), *foreground_brush);

    auto transform = D2D1::Matrix3x2F::Identity();
    // center
    transform = transform * D2D1::Matrix3x2F::Translation(D2D1::SizeF(
                                (float)(rect.left), (float)rect.top));

    if (rotation_angle != 0.0f)
      transform = transform * D2D1::Matrix3x2F::Rotation(
                                  rotation_angle,
                                  D2D1::Point2F(rect.left + icon_dimension / 2,
                                                rect.top + icon_dimension / 2));

    device_context->SetTransform(transform);
    device_context->DrawSvgDocument(svg.Get());
    device_context->SetTransform(D2D1::Matrix3x2F::Identity());
  }
  }  // namespace mmhmm
