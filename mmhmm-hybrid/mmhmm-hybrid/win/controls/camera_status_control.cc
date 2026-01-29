#include "camera_status_control.h"

#include <dwrite.h>

#include "colors.h"
#include "image_loader.h"
#include "layout.h"
#include "svg_renderer.h"
#include "../browser/resource.h"

namespace mmhmm::controls {

const wchar_t* CameraControlWindowClass = L"camerastatuscontrolclass";

CameraStatusControl::CameraStatusControl(HWND parent, std::wstring title)
    : BaseControl(parent, title, CameraControlWindowClass) {}

std::unique_ptr<CameraStatusControl> CameraStatusControl::Create(
    HWND parent,
    std::wstring title) {
  BaseControl::Register(CameraControlWindowClass);
  auto camera_status_control = std::unique_ptr<CameraStatusControl>(
      new CameraStatusControl(parent, title));

  BaseControl::CreateBaseWindow(
      parent, title, CameraControlWindowClass, {0}, camera_status_control.get(),
      WS_CHILD | WS_CLIPSIBLINGS | WS_VISIBLE, WS_EX_COMPOSITED);

  return camera_status_control;
}

LRESULT CameraStatusControl::HandleMessage(HWND hwnd,
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

void CameraStatusControl::OnMouseMove() {
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

void CameraStatusControl::OnMouseLeave() {
  is_tracking_mouse_ = false;
  is_mouse_over_ = false;
  Invalidate();
}

bool CameraStatusControl::OnMouseButtonUp(LPARAM lparam) {
  if (click_callback_) {
    click_callback_();
    return false;
  }
  return true;
}

void CameraStatusControl::SetClickCallback(
    std::function<void(void)> click_callback) {
  click_callback_ = click_callback;
}

HRESULT CameraStatusControl::OnRender(
    ComPtr<ID2D1DeviceContext5> device_context) {
  HRESULT result = S_OK;
  UINT dpi = GetDpiForWindow(hwnd_);

  PaintBackground(device_context);
  PaintIcon(device_context, dpi, icon_width_);
  if (ShouldPaintText()) {
    PaintText(device_context, dpi);
  }
  PaintExpander(device_context, dpi, icon_width_);

  return result;
}

void CameraStatusControl::PaintBackground(
    ComPtr<ID2D1DeviceContext5> device_context) {
  RECT rect;
  GetClientRect(hwnd_, &rect);

  auto control_rect = Layout::RectToD2DRect(rect);

  auto clear_color = window_theme_ == WindowTheme::Dark ? DarkBackgroundColor
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

void CameraStatusControl::PaintText(ComPtr<ID2D1DeviceContext5> device_context,
                                    int dpi) {
  if (!text_layout_) {
    CreateTextLayout(title_);
  }

  if (!text_layout_)
    return;

  auto text_color = window_theme_ == WindowTheme::Dark ? StatusTextColorDark
                                                       : StatusTextColorLight;

  if (icon_ == Icon::config) {
    text_color = ConfigColorDark;
  }

  ComPtr<ID2D1SolidColorBrush> text_brush;
  HRESULT hr = device_context->CreateSolidColorBrush(text_color,
                                                     text_brush.GetAddressOf());

  ThrowIfFailed(hr);

  D2D1_POINT_2F point = {0};
  point.x = Layout::ScaleForDPI(icon_rect_width_, dpi);
  device_context->DrawTextLayout(point, text_layout_.Get(), text_brush.Get());
}

void CameraStatusControl::PaintIcon(ComPtr<ID2D1DeviceContext5> device_context,
                                    int dpi,
                                    int icon_width) {
  auto indicator_color = window_theme_ == WindowTheme::Dark
                             ? StatusTextColorDark
                             : StatusTextColorLight;

  if (icon_ == Icon::config) {
    indicator_color =
        window_theme_ == WindowTheme::Dark ? ConfigColorDark : ConfigColorLight;
  }

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

  switch (icon_) {
    case Icon::disconnected:
      DrawIcon(device_context, scaled_icon_width, control_rect,
               &indicator_color, dpi,
               MAKEINTRESOURCE(IDSVG_CAMERA_DISCONNECTED));
      break;
    case Icon::connected:
      DrawIcon(device_context, scaled_icon_width, control_rect,
               &indicator_color, dpi,
               MAKEINTRESOURCE(IDSVG_CAMERA_CONNECTED));
      break;
    case Icon::config:
      DrawIcon(device_context, scaled_icon_width, control_rect,
               &indicator_color, dpi,
               MAKEINTRESOURCE(IDSVG_CAMERA_CONFIG));
      break;
    case Icon::none:
    default:
      break;
  }
}

void CameraStatusControl::PaintExpander(
    ComPtr<ID2D1DeviceContext5> device_context,
    int dpi,
    int icon_width) {
  auto indicator_color = window_theme_ == WindowTheme::Dark
                             ? StatusTextColorDark
                             : StatusTextColorLight;

  if (icon_ == Icon::config) {
    indicator_color =
        window_theme_ == WindowTheme::Dark ? ConfigColorDark : ConfigColorLight;
  }

  // measure text to put expander directly after it
  DWRITE_TEXT_METRICS metrics = {};
  if (text_layout_) {
    text_layout_->GetMetrics(&metrics);
  }

  RECT rect;
  GetClientRect(hwnd_, &rect);
  rect.left += (ShouldPaintText() ? metrics.widthIncludingTrailingWhitespace : 0) +
      Layout::ScaleForDPI(icon_rect_width_, dpi);
  rect.right = rect.left + Layout::ScaleForDPI(icon_rect_width_, dpi);
  rect.bottom = Layout::ScaleForDPI(max_height_, dpi);

  auto scaled_icon_width = Layout::ScaleForDPI(icon_width, dpi);
  RECT icon_rect = {};
  icon_rect.right = scaled_icon_width;
  icon_rect.bottom = scaled_icon_width;
  Layout::CentreRectInRect(&icon_rect, &rect);
  auto control_rect = Layout::RectToD2DRect(icon_rect);

  DrawIcon(device_context, scaled_icon_width, control_rect, &indicator_color,
           dpi, MAKEINTRESOURCE(IDSVG_CHEVRON), is_expanded ? 0.0f : 180.0f);
}

void CameraStatusControl::DrawIcon(ComPtr<ID2D1DeviceContext5> device_context,
                                   UINT icon_dimension,
                                   const D2D1_RECT_F& rect,
                                   D2D1::ColorF* foreground_brush,
                                   UINT dpi,
                                   LPCTSTR icon_id,
                                   float rotation_angle) {
  ComPtr<IStream> stream =
      ImageLoader::LoadImageAsStream(icon_id, MAKEINTRESOURCE(256));

  auto svg = SvgRenderer::CreateSVG(
      device_context, stream, (float)(icon_dimension), (float)(icon_dimension));

  ThrowIfNullptr(svg.Get());

  ComPtr<ID2D1SvgElement> root;
  svg->GetRoot(root.GetAddressOf());
  ThrowIfNullptr(root.Get());
  SvgRenderer::RecolorSubtree(root.Get(), *foreground_brush);

  auto transform = D2D1::Matrix3x2F::Identity();
  // center
  transform = transform * D2D1::Matrix3x2F::Translation(
                              D2D1::SizeF((float)(rect.left), (float)rect.top));

  if (rotation_angle != 0.0f)
    transform = transform * D2D1::Matrix3x2F::Rotation(
                                rotation_angle,
                                D2D1::Point2F(rect.left + icon_dimension / 2,
                                              rect.top + icon_dimension / 2));

  device_context->SetTransform(transform);
  device_context->DrawSvgDocument(svg.Get());
  device_context->SetTransform(D2D1::Matrix3x2F::Identity());
}

void CameraStatusControl::OnActivate() {
  Invalidate();
}

void CameraStatusControl::SetStatus(std::wstring text, Icon icon) {
  text_ = text;
  icon_ = icon;
  try {
    CreateTextLayout(title_);
    Invalidate();
  } catch (...) {
    return;
  }
}

void CameraStatusControl::Expand() {
  is_expanded = true;
  Invalidate();
}

void CameraStatusControl::Collapse() {
  is_expanded = false;
  Invalidate();
}

void CameraStatusControl::CreateTextLayout(std::wstring title) {
  ComPtr<ID2D1DeviceContext5> device_context = GetDeviceContext();
  ThrowIfNullptr(device_context.Get());

  UINT dpi = GetDpiForWindow(hwnd_);

  RECT rect;
  GetClientRect(hwnd_, &rect);
  if (rect.right - rect.left == 0 || rect.bottom - rect.top == 0)
    return;

  auto control_rect = Layout::RectToD2DRect(rect);
  control_rect.left += (Layout::ScaleForDPI(icon_padding_, dpi) * 2) +
                      Layout::ScaleForDPI(icon_width_, dpi);
  control_rect.right = Layout::ScaleForDPI(max_width_, dpi);

  LOGFONT logical_font = {};
  if (!SystemParametersInfoForDpi(SPI_GETICONTITLELOGFONT, sizeof(logical_font),
                                  &logical_font, false, dpi)) {
    throw std::exception("Unable to get font for dpi");
  }

  ComPtr<ID2D1SolidColorBrush> text_brush;
  HRESULT hr = device_context->CreateSolidColorBrush(StatusTextColorDark,
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

RECT CameraStatusControl::GetDesiredSize() {
  UINT dpi = GetDpiForWindow(hwnd_);

  RECT rect;
  GetClientRect(hwnd_, &rect);

  if (visibility_ == Visibility::Hidden) {
    return {0,0,0,0};
  }

  if (text_layout_) {
    DWRITE_TEXT_METRICS metrics;
    text_layout_->GetMetrics(&metrics);

    GetClientRect(hwnd_, &rect);
    rect.right =
        rect.left +
        (ShouldPaintText() ? metrics.widthIncludingTrailingWhitespace : 0) +
        (2 * Layout::ScaleForDPI(icon_rect_width_, dpi));
  } else {
    GetClientRect(hwnd_, &rect);
    rect.right = rect.left + (2 * Layout::ScaleForDPI(icon_rect_width_, dpi));
  }

  return rect;
}

void CameraStatusControl::DpiChanged() {
  SetStatus(text_, icon_);
}

void CameraStatusControl::SetVisibility(Visibility visibility) {
  visibility_ = visibility;

  if (visibility == Visibility::Hidden) {
    ShowWindow(hwnd_, SW_HIDE);
  } else {
    ShowWindow(hwnd_, SW_SHOWNORMAL);
  }
  Invalidate();
}

void CameraStatusControl::SetTextVisibility(Visibility visibility) {
  if (text_visibility_ != visibility) {
    text_visibility_ = visibility;
    Invalidate();
  }
 }

bool CameraStatusControl::ShouldPaintText() const {
   return text_visibility_ == Visibility::Visible;
 }
}  // namespace mmhmm
