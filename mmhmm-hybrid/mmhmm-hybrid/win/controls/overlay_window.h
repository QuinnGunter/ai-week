#pragma once
#include <windows.h>
#include <vector>
#include <memory>
#include <map>

#include <d2d1_3.h>
#include <dcomp.h>
#include <wrl/client.h>
#include <d2d1_2helper.h>
#include <d3d11_4.h>
#include <dxgi1_3.h>
#include <wrl.h>
#include <dwrite.h>

#include "common\window_overlay.h"

using namespace Microsoft::WRL;
using namespace mmhmm;
namespace mmhmm::controls::overlay {

class OverlayWindow;

class ExternalWindowHookHandler {
 public:
  static void CALLBACK WinEventProc(HWINEVENTHOOK hook,
                                    DWORD event,
                                    HWND hwnd,
                                    LONG id_object,
                                    LONG id_child,
                                    DWORD id_event_thread,
                                    DWORD time);
  static OverlayWindow* listener_;
};

class OverlayWindow {
 public:
  OverlayWindow(WindowOverlayTarget target, uint64_t target_id);
  ~OverlayWindow();

  void DrawCursors(std::vector<WindowOverlayParticipant> cursors_);

  void WinEventProc(HWINEVENTHOOK hook,
                             DWORD event,
                             HWND hwnd,
                             LONG id_object,
                             LONG id_child,
                             DWORD id_event_thread,
                             DWORD time);

  private:
  void UpdateOverlayPosition(RECT pos) const;
  void InitWindowOverlay(uint64_t target_id);
  void InitScreenOverlay(uint64_t target_id);
  void InitDirect2D(HWND hwnd);
  void InitWindow(RECT position);
  void Paint(HWND hwnd);
  void PaintCursor(ComPtr<ID2D1DeviceContext5> device_context,
                   UINT icon_dimension,
                   const D2D1_RECT_F& rect,
                   D2D1::ColorF* foreground_brush,
                   UINT dpi);
  void PaintNametag(ComPtr<ID2D1DeviceContext5> device_context,
                   const D2D1_RECT_F& rect,
                   ID2D1SolidColorBrush* foreground_brush,
                   ID2D1SolidColorBrush* background_brush,
                   UINT dpi) const;
  void PaintText(ComPtr<ID2D1DeviceContext5> device_context,
                 ComPtr<IDWriteTextLayout> text_layout,
                 D2D1::ColorF parent_color,
                 D2D1_RECT_F rect, int dpi);
  void PaintBackground(ComPtr<ID2D1DeviceContext5> device_context, HWND window);
  ComPtr<ID2D1SvgDocument> LoadSvg(ComPtr<ID2D1DeviceContext5> device_context,
                                   UINT icon_dimension);
  ComPtr<IDWriteTextLayout> CreateTextLayout(std::wstring text,
                                             D2D1_RECT_F rect,
                                             UINT dpi);
  static BOOL CALLBACK MonitorEnumProc(HMONITOR monitor,
                                       HDC hdc,
                                       LPRECT rect,
                                       LPARAM data);

  private:
  ComPtr<ID3D11Device> d3d_device_;
  ComPtr<IDXGIDevice> dxgi_device_;
  ComPtr<IDXGIFactory2> dxgi_factory_;
  ComPtr<IDXGISwapChain1> swapChain_;
  ComPtr<ID2D1Factory6> d2d_factory_;
  ComPtr<ID2D1Device5> d2d_device_;
  ComPtr<ID2D1DeviceContext5> device_context_;
  ComPtr<IDXGISurface2> surface_;
  ComPtr<ID2D1Bitmap1> bitmap_;
  ComPtr<IDCompositionDevice> composition_device_;
  ComPtr<IDCompositionTarget> target_;
  ComPtr<IDCompositionVisual> visual_;
  ComPtr<ID2D1SolidColorBrush> brush_;
  ComPtr<ID2D1SvgDocument> cursor_svg_;

  HINSTANCE hinstance_ = nullptr;
  HWND external_window_ = nullptr;
  HWND overlay_window_ = nullptr;
  HWND picker_window_ = nullptr;
  HWND selected_window_ = nullptr;
  RECT external_window_position_ = {};
  UINT last_show_cmd_ = 0;
  std::vector<WindowOverlayParticipant> cursors_;
  std::map<std::string, ComPtr<IDWriteTextLayout>> text_layouts_;
  const int text_padding_ = 6;
  const int nametag_rounding_ = 12;
  const int max_width_ = 3840;
  const int max_height_ = 2160;
  const int cursor_width_ = 32;
  const int cursor_height_ = 32;
  const int nametag_height_ = 25;
  const int nametag_width_ = 60;
  const int border_thickness_ = 5;
  int monitor_index_ = 4;
};
}  // namespace controls::overlay
