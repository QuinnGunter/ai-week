#pragma once
#include "overlay_window.h"

#include "exceptions.h"
#include "image_loader.h"
#include "svg_renderer.h"
#include "../browser/resource.h"
#include <stdio.h>
#include "layout.h"
#include "colors.h"
#include "common/string_util.h"

#include <d2d1helper.h>
#include <d3d11_2.h>
#include <dxgi1_3.h>
#include <wrl.h>

using namespace mmhmm::controls;

namespace mmhmm::controls::overlay {

const int TimerTickMS = 16;
const std::wstring OverlayClassName = L"overlaywindow";
const std::wstring WindowName = L"Overlay Window";

BOOL CALLBACK OverlayWindow::MonitorEnumProc(HMONITOR monitor,
                                     HDC hdc,
                                     LPRECT rect,
                                     LPARAM data) {
  OverlayWindow* overlay = reinterpret_cast<OverlayWindow*>(data);
  MONITORINFOEX info = {0};
  info.cbSize = sizeof(info);
  GetMonitorInfo(monitor, &info);

  DISPLAY_DEVICE dd = {};
  dd.cb = sizeof(DISPLAY_DEVICE);

  int device_index = 0;
  while (EnumDisplayDevices(NULL, device_index, &dd, 0)) {
    if (std::wstring(dd.DeviceName) == std::wstring(info.szDevice) &&
        device_index == overlay->monitor_index_) {
        overlay->external_window_position_ = info.rcMonitor;
    }
    device_index++;
  }

  return TRUE;
}

OverlayWindow::OverlayWindow(WindowOverlayTarget target, uint64_t target_id) {
  target == WindowOverlayTarget::Window ? InitWindowOverlay(target_id)
                                        : InitScreenOverlay(target_id);
  InitWindow(external_window_position_);
}

void OverlayWindow::InitWindowOverlay(uint64_t target_id) {
  external_window_ = (HWND)target_id;
  GetWindowRect(external_window_, &external_window_position_);
  ExternalWindowHookHandler::listener_ = this;
  DWORD processId;
  DWORD threadId = GetWindowThreadProcessId(external_window_, &processId);
  SetWinEventHook(EVENT_OBJECT_LOCATIONCHANGE, EVENT_OBJECT_LOCATIONCHANGE,
                  nullptr, ExternalWindowHookHandler::WinEventProc, processId,
                  threadId, WINEVENT_OUTOFCONTEXT);
}

void OverlayWindow::InitScreenOverlay(uint64_t target_id) {
  monitor_index_ = target_id;
  EnumDisplayMonitors(0, 0, MonitorEnumProc, (LPARAM)this);
}

void OverlayWindow::InitWindow(RECT position) {
  WNDCLASS wc = {};
  wc.hCursor = LoadCursor(nullptr, IDC_ARROW);
  wc.hInstance = hinstance_;
  wc.lpszClassName = OverlayClassName.c_str();
  wc.style = CS_HREDRAW | CS_VREDRAW;
  wc.lpfnWndProc = [](HWND window, UINT message, WPARAM wparam,
                      LPARAM lparam) -> LRESULT {
    OverlayWindow* self = nullptr;
    if (message == WM_NCCREATE) {
      LPCREATESTRUCT lpcs = reinterpret_cast<LPCREATESTRUCT>(lparam);
      self = static_cast<OverlayWindow*>(lpcs->lpCreateParams);
      self->overlay_window_ = window;
      SetWindowLongPtr(window, GWLP_USERDATA, reinterpret_cast<LONG_PTR>(self));
      SetTimer(window, 1, TimerTickMS, NULL);
    } else {
      self = reinterpret_cast<OverlayWindow*>(
          GetWindowLongPtr(window, GWLP_USERDATA));
    }

    switch (message) {
      case WM_NCHITTEST: {
        LRESULT hit = DefWindowProc(window, message, wparam, lparam);
        if (hit == HTCLIENT)
          hit = HTCAPTION;
        return hit;
      }
      case WM_PAINT:
      case WM_TIMER: {
        self->Paint(window);
        break;
      }
      case WM_DESTROY: {
        PostQuitMessage(0);
        return 0;
      }
      case WM_NCDESTROY: {
        KillTimer(window, 1);
        break;
      }
    }
    return DefWindowProc(window, message, wparam, lparam);
  };
  RegisterClass(&wc);

  DWORD overlay_style =
      WS_EX_TRANSPARENT | WS_EX_LAYERED | WS_EX_TOPMOST | WS_EX_TOOLWINDOW;

  overlay_window_ = CreateWindowEx(
      overlay_style, wc.lpszClassName, WindowName.c_str(),
      WS_POPUP | WS_VISIBLE, position.left, position.top,
      position.right - position.left, position.bottom - position.top, nullptr,
      nullptr, hinstance_, this);

  SetWindowPos(overlay_window_, HWND_TOPMOST, 0, 0, 0, 0,
               SWP_NOMOVE | SWP_NOSIZE);

  InitDirect2D(overlay_window_);
  SetWindowDisplayAffinity(overlay_window_, WDA_EXCLUDEFROMCAPTURE);
  Paint(overlay_window_);
}

OverlayWindow::~OverlayWindow() {
  if (overlay_window_) {
    DestroyWindow(overlay_window_);
  }
}

void OverlayWindow::UpdateOverlayPosition(RECT position) const {
  SetWindowPos(overlay_window_, HWND_TOPMOST, position.left, position.top,
               position.right - position.left, position.bottom - position.top,
               SWP_SHOWWINDOW);
  UpdateWindow(overlay_window_);
}

void OverlayWindow::InitDirect2D(HWND window) {
#if defined(_DEBUG)
  D2D1_FACTORY_OPTIONS const options = {D2D1_DEBUG_LEVEL_INFORMATION};
  UINT const dxgi_factory_flags = DXGI_CREATE_FACTORY_DEBUG;
  UINT const d3d11_device_flags = D3D11_CREATE_DEVICE_BGRA_SUPPORT | D3D11_CREATE_DEVICE_DEBUG;
#else
  D2D1_FACTORY_OPTIONS const options = {};
  UINT const dxgi_factory_flags = 0;
  UINT const d3d11_device_flags = D3D11_CREATE_DEVICE_BGRA_SUPPORT;
#endif

  ThrowIfFailed(D3D11CreateDevice(nullptr, D3D_DRIVER_TYPE_HARDWARE, nullptr,
                                  d3d11_device_flags, nullptr, 0,
                                  D3D11_SDK_VERSION, &d3d_device_, nullptr,
                                  nullptr));

  ThrowIfFailed(d3d_device_.As(&dxgi_device_));

  ThrowIfFailed(CreateDXGIFactory2(
      dxgi_factory_flags, __uuidof(dxgi_factory_),
      reinterpret_cast<void**>(dxgi_factory_.GetAddressOf())));

  DXGI_SWAP_CHAIN_DESC1 description = {};
  description.Format = DXGI_FORMAT_B8G8R8A8_UNORM;
  description.BufferUsage = DXGI_USAGE_RENDER_TARGET_OUTPUT;
  description.SwapEffect = DXGI_SWAP_EFFECT_FLIP_SEQUENTIAL;
  description.BufferCount = 2;
  description.SampleDesc.Count = 1;
  description.AlphaMode = DXGI_ALPHA_MODE_PREMULTIPLIED;

  RECT rect = {};
  GetClientRect(window, &rect);
  description.Width = max_width_;
  description.Height = max_height_;

  ThrowIfFailed(dxgi_factory_->CreateSwapChainForComposition(
      dxgi_device_.Get(), &description, nullptr, swapChain_.GetAddressOf()));

  ThrowIfFailed(D2D1CreateFactory(D2D1_FACTORY_TYPE_SINGLE_THREADED, options,
                                  d2d_factory_.GetAddressOf()));
  ThrowIfFailed(d2d_factory_->CreateDevice(dxgi_device_.Get(),
                                           d2d_device_.GetAddressOf()));
  ThrowIfFailed(d2d_device_->CreateDeviceContext(
      D2D1_DEVICE_CONTEXT_OPTIONS_NONE, device_context_.GetAddressOf()));

  ThrowIfFailed(
      swapChain_->GetBuffer(0, __uuidof(surface_),
                            reinterpret_cast<void**>(surface_.GetAddressOf())));

  D2D1_BITMAP_PROPERTIES1 properties = {};
  properties.pixelFormat.alphaMode = D2D1_ALPHA_MODE_PREMULTIPLIED;
  properties.pixelFormat.format = DXGI_FORMAT_B8G8R8A8_UNORM;
  properties.bitmapOptions =
      D2D1_BITMAP_OPTIONS_TARGET | D2D1_BITMAP_OPTIONS_CANNOT_DRAW;
  ThrowIfFailed(device_context_->CreateBitmapFromDxgiSurface(
      surface_.Get(), properties, bitmap_.GetAddressOf()));
  device_context_->SetTarget(bitmap_.Get());

  ThrowIfFailed(DCompositionCreateDevice(
      dxgi_device_.Get(), __uuidof(composition_device_),
      reinterpret_cast<void**>(composition_device_.GetAddressOf())));

  ThrowIfFailed(composition_device_->CreateTargetForHwnd(
      window, true, target_.GetAddressOf()));

  ThrowIfFailed(composition_device_->CreateVisual(visual_.GetAddressOf()));
  ThrowIfFailed(visual_->SetContent(swapChain_.Get()));
  ThrowIfFailed(target_->SetRoot(visual_.Get()));
  ThrowIfFailed(composition_device_->Commit());
  ThrowIfFailed(device_context_->CreateSolidColorBrush(ConfigColorDark,
                                                       brush_.GetAddressOf()));
}

void CALLBACK OverlayWindow::WinEventProc(HWINEVENTHOOK hook,
                                         DWORD event,
                                         HWND hwnd,
                                         LONG id_object,
                                         LONG id_child,
                                         DWORD id_event_thread,
                                         DWORD time)
{
  if (hwnd == external_window_ && id_object == OBJID_WINDOW &&
      id_child == CHILDID_SELF) {
    if (event == EVENT_OBJECT_LOCATIONCHANGE) {
      WINDOWPLACEMENT placement = {0};
      placement.length = sizeof(WINDOWPLACEMENT);
      GetWindowPlacement(external_window_, &placement);
      if (placement.showCmd != last_show_cmd_) {
        last_show_cmd_ = placement.showCmd;
        switch (placement.showCmd) {
          case SW_SHOWMAXIMIZED:
            ShowWindow(overlay_window_, SW_MAXIMIZE);
            break;
          case SW_SHOWMINIMIZED:
            ShowWindow(overlay_window_, SW_MINIMIZE);
            break;
          default:
            ShowWindow(overlay_window_, SW_RESTORE);
            break;
        }
      }
      RECT window_rect;
      if (GetWindowRect(external_window_, &window_rect)) {
        UpdateOverlayPosition(window_rect);
      }
    } else if (event == EVENT_OBJECT_DESTROY) {
      CloseWindow(overlay_window_);
    }
  }
}

void OverlayWindow::Paint(HWND window) {
  UINT dpi = GetDpiForWindow(overlay_window_);

  device_context_->BeginDraw();
  device_context_->Clear();

  PaintBackground(device_context_, window);

  for (auto& cursor : cursors_) {
    D2D1::ColorF color = D2D1::ColorF(cursor.color.GetColor());
    color.a = cursor.color.opacity;
    brush_->SetColor(color);
    auto const control_rect =
        D2D1::RectF(cursor.coordinate.x, cursor.coordinate.y, cursor_width_,
                    cursor_height_);
    PaintCursor(device_context_, cursor_width_, control_rect, &color, dpi);
    auto const nametag_rect = D2D1::RectF(
        cursor.coordinate.x + (cursor_width_ * 0.5),
        cursor.coordinate.y + (cursor_height_ * 0.7),
        cursor.coordinate.x + (cursor_width_ * 0.5) + nametag_width_,
        cursor.coordinate.y + (cursor_height_ * 0.7) + nametag_height_);
    PaintNametag(device_context_, nametag_rect, brush_.Get(), brush_.Get(),
                 dpi);

    ComPtr<IDWriteTextLayout> name_text_layout;
    auto layout = text_layouts_.find(cursor.name);
    if (layout == text_layouts_.end()) {
      name_text_layout = CreateTextLayout(client::ToWideString(cursor.name),
                                          nametag_rect, dpi);
      text_layouts_[cursor.name] = name_text_layout;
    } else {
      name_text_layout = layout->second;
    }
    PaintText(device_context_, name_text_layout, color, nametag_rect, dpi);
  }

  ThrowIfFailed(device_context_->EndDraw());
  ThrowIfFailed(swapChain_->Present(1,0));
}

void OverlayWindow::PaintBackground(ComPtr<ID2D1DeviceContext5> device_context, HWND window) {
  RECT rect = {0};
  GetWindowRect(window, &rect);
  int width = rect.right - rect.left;
  int height = rect.bottom - rect.top;
  brush_->SetColor(ConfigColorDark);

  auto const background_rect = D2D1::RectF(0, 0, width, height);
  device_context_->DrawRectangle(background_rect, brush_.Get(),
                                 border_thickness_);
}

void OverlayWindow::PaintCursor(
    ComPtr<ID2D1DeviceContext5> device_context,
    UINT icon_dimension,
    const D2D1_RECT_F& rect,
    D2D1::ColorF* foreground_brush,
    UINT dpi) {

 if (cursor_svg_ == nullptr) {
    cursor_svg_ = LoadSvg(device_context, icon_dimension);
 } 

  ThrowIfNullptr(cursor_svg_.Get());

  ComPtr<ID2D1SvgElement> root;
  cursor_svg_->GetRoot(root.GetAddressOf());
  ThrowIfNullptr(root.Get());
  SvgRenderer::RecolorSubtree(root.Get(), *foreground_brush);

  auto transform = D2D1::Matrix3x2F::Identity();
  transform = transform * D2D1::Matrix3x2F::Translation(
                              D2D1::SizeF((float)(rect.left), (float)rect.top));

  device_context->SetTransform(transform);
  device_context->DrawSvgDocument(cursor_svg_.Get());
  device_context->SetTransform(D2D1::Matrix3x2F::Identity());
}

void OverlayWindow::PaintNametag(ComPtr<ID2D1DeviceContext5> device_context,
                  const D2D1_RECT_F& rect,
                  ID2D1SolidColorBrush* foreground_brush,
                  ID2D1SolidColorBrush* background_brush,
                  UINT dpi) const {

  auto rounded_rect = D2D1::RoundedRect(rect, nametag_rounding_, nametag_rounding_);
  device_context->FillRoundedRectangle(rounded_rect, background_brush);
}

ComPtr<ID2D1SvgDocument> OverlayWindow::LoadSvg(
    ComPtr<ID2D1DeviceContext5> device_context,
    UINT icon_dimension) {
  ComPtr<IStream> stream = ImageLoader::LoadImageAsStream(
      MAKEINTRESOURCE(IDSVG_CURSOR), MAKEINTRESOURCE(256));

  return mmhmm::controls::SvgRenderer::CreateSVG(
      device_context, stream, (float)(icon_dimension), (float)(icon_dimension));
}

void OverlayWindow::DrawCursors(std::vector<WindowOverlayParticipant> cursors) {
  cursors_ = cursors;
  InvalidateRect(overlay_window_, nullptr, false);
}

ComPtr<IDWriteTextLayout> OverlayWindow::CreateTextLayout(std::wstring text,
                                                          D2D1_RECT_F rect,
                                                          UINT dpi) {
  ComPtr<IDWriteTextLayout> text_layout;
  ThrowIfNullptr(device_context_.Get());

  LOGFONT logical_font = {};
  if (!SystemParametersInfoForDpi(SPI_GETICONTITLELOGFONT, sizeof(logical_font),
                                  &logical_font, false, dpi)) {
    throw std::exception("Unable to get font for dpi");
  }

  ComPtr<ID2D1SolidColorBrush> text_brush;
  HRESULT hr = device_context_->CreateSolidColorBrush(StatusTextColorDark,
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

  write_text_format->SetTextAlignment(DWRITE_TEXT_ALIGNMENT_CENTER);

  DWRITE_TRIMMING trimming = {DWRITE_TRIMMING_GRANULARITY_CHARACTER, 0, 0};
  ComPtr<IDWriteInlineObject> trimmingSign;
  hr = write_factory->CreateEllipsisTrimmingSign(write_text_format.Get(),
                                                 trimmingSign.GetAddressOf());
  hr = write_text_format->SetTrimming(&trimming, trimmingSign.Get());

  ThrowIfFailed(hr);

  write_text_format->SetParagraphAlignment(DWRITE_PARAGRAPH_ALIGNMENT_CENTER);

  hr = write_factory->CreateTextLayout(
      text.c_str(), (UINT32)text.length(), write_text_format.Get(),
      rect.right - rect.left - (2 * text_padding_),
      rect.bottom - rect.top, text_layout.GetAddressOf());

  text_layout->SetWordWrapping(DWRITE_WORD_WRAPPING_NO_WRAP);
  ThrowIfFailed(hr);

  return text_layout;
}

void OverlayWindow::PaintText(ComPtr<ID2D1DeviceContext5> device_context,
                              ComPtr<IDWriteTextLayout> text_layout,
                              D2D1::ColorF parent_color,
                              D2D1_RECT_F rect,
                              int dpi) {
  double luminance = GetPerceivedLuminance(parent_color);
  brush_->SetColor(luminance < 0.5 ? D2D1::ColorF(0xEEEEEE)
                                   : D2D1::ColorF(D2D1::ColorF::Black));
  D2D1_POINT_2F point = {0};
  point.x = rect.left + text_padding_;
  point.y = rect.top;
  device_context->DrawTextLayout(point, text_layout.Get(), brush_.Get());
}

OverlayWindow* ExternalWindowHookHandler::listener_;
void CALLBACK ExternalWindowHookHandler::WinEventProc(HWINEVENTHOOK hook,
                                                      DWORD event,
                                                      HWND hwnd,
                                                      LONG id_object,
                                                      LONG id_child,
                                                      DWORD id_event_thread,
                                                      DWORD time) {
  if (listener_) {
    listener_->WinEventProc(hook, event, hwnd, id_object, id_child,
                            id_event_thread, time);
  }
}
}  // namespace mmhmm::controls::overlay
