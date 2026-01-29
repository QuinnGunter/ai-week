#include "dwm_thumbnail_capture.h"
#include <dwmapi.h>
#include <vector>
#include "capture_utils.h"

namespace mmhmm {

namespace {
LRESULT CALLBACK DummyWndProc(HWND hwnd,
                              UINT msg,
                              WPARAM wParam,
                              LPARAM lParam) {
  return DefWindowProc(hwnd, msg, wParam, lParam);
}

bool EnsureHostClassRegistered(HINSTANCE hInstance) {
  const wchar_t* kClassName = L"DwmCaptureHost";

  WNDCLASS wc = {};
  wc.lpfnWndProc = DummyWndProc;
  wc.hInstance = hInstance;
  wc.lpszClassName = kClassName;

  if (RegisterClass(&wc)) {
    return true;
  }
  if (GetLastError() == ERROR_CLASS_ALREADY_EXISTS) {
    return true; // exists but still useable
  }
  return false;
}
}  // namespace

DwmThumbnailCapture::DwmThumbnailCapture() {}

DwmThumbnailCapture::~DwmThumbnailCapture() {
  if (thumbnail_) {
    DwmUnregisterThumbnail(thumbnail_);
    thumbnail_ = nullptr;
  }
  DestroyHostWindow();
}

bool DwmThumbnailCapture::CreateHostWindow(int width, int height) {
  if (width <= 0 || height <= 0)
    return false;

  HINSTANCE hInstance = GetModuleHandle(nullptr);
  if (!EnsureHostClassRegistered(hInstance)) {
    return false;
  }

  // We need an offscreen window to host the thumbnail.
  host_hwnd_ = CreateWindowExW(WS_EX_LAYERED, L"DwmCaptureHost", L"",
                               WS_POPUP | WS_VISIBLE, -10000, -10000, width,
                               height, nullptr, nullptr, hInstance, nullptr);

  if (!host_hwnd_)
    return false;

  ShowWindow(host_hwnd_, SW_SHOWNOACTIVATE);
  UpdateWindow(host_hwnd_);

  return true;
}

void DwmThumbnailCapture::DestroyHostWindow() {
  if (host_hwnd_) {
    DestroyWindow(host_hwnd_);
    host_hwnd_ = nullptr;
  }
}

bool DwmThumbnailCapture::RenderThumbnail(HWND target_hwnd,
                                          int width,
                                          int height) {
  if (!host_hwnd_ || !IsWindow(target_hwnd))
    return false;

  BOOL composition_enabled = FALSE;
  if (FAILED(DwmIsCompositionEnabled(&composition_enabled)) ||
      !composition_enabled) {
    return false;
  }

  if (thumbnail_) {
    DwmUnregisterThumbnail(thumbnail_);
    thumbnail_ = nullptr;
  }

  HRESULT hr = DwmRegisterThumbnail(host_hwnd_, target_hwnd, &thumbnail_);
  if (FAILED(hr) || !thumbnail_) {
    return false;
  }

  DWM_THUMBNAIL_PROPERTIES props = {};
  props.dwFlags = DWM_TNP_RECTDESTINATION | DWM_TNP_VISIBLE;
  props.rcDestination = {0, 0, width, height};
  props.fVisible = TRUE;

  return SUCCEEDED(DwmUpdateThumbnailProperties(thumbnail_, &props));
}

bool DwmThumbnailCapture::Capture(HWND target_hwnd,
                                  std::vector<unsigned char>& out_bitmap) {
  if (!IsWindow(target_hwnd))
    return false;

  SIZE size = {};
  HRESULT hrSize = DwmQueryThumbnailSourceSize(target_hwnd, &size);
  if (FAILED(hrSize) || size.cx <= 0 || size.cy <= 0) {
    return false;
  }

  if (!CreateHostWindow(size.cx, size.cy))
    return false;

  if (!RenderThumbnail(target_hwnd, size.cx, size.cy)) {
    DestroyHostWindow();
    return false;
  }

  const bool ok = CaptureHostToBitmap(host_hwnd_, out_bitmap);
  DestroyHostWindow();
  return ok;
}
}  // namespace mmhmm
