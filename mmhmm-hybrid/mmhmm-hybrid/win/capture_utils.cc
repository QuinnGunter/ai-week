#include "capture_utils.h"
#include <windows.h>
#include <cstring>

namespace mmhmm {
struct CaptureContext {
  HWND hwnd = nullptr;
  HDC hdc_window = nullptr;
  HDC hdc_mem_ctx = nullptr;
  HBITMAP hbitmap = nullptr;
  HGDIOBJ prev_bitmap = nullptr;

  explicit CaptureContext(HWND target) : hwnd(target) {
    hdc_window = GetDC(hwnd);
    if (hdc_window) {
      hdc_mem_ctx = CreateCompatibleDC(hdc_window);
    }
  }

  bool CreateBitmap(int width, int height) {
    if (!hdc_window || !hdc_mem_ctx)
      return false;
    hbitmap = CreateCompatibleBitmap(hdc_window, width, height);
    if (!hbitmap)
      return false;
    prev_bitmap = SelectObject(hdc_mem_ctx, hbitmap);
    return true;
  }

  ~CaptureContext() {
    if (hdc_mem_ctx && prev_bitmap) {
      SelectObject(hdc_mem_ctx, prev_bitmap);
    }
    if (hbitmap) {
      DeleteObject(hbitmap);
    }
    if (hdc_mem_ctx) {
      DeleteDC(hdc_mem_ctx);
    }
    if (hdc_window) {
      ReleaseDC(hwnd, hdc_window);
    }
  }
};

bool CaptureWithStrategy(HWND hwnd,
                         int width,
                         int height,
                         CaptureStrategy strategy,
                         std::vector<unsigned char>& out_bitmap) {
  CaptureContext ctx(hwnd);
  if (!ctx.hdc_window || !ctx.hdc_mem_ctx) {
    return false;
  }
  if (!ctx.CreateBitmap(width, height)) {
    return false;
  }

  bool success = false;
  switch (strategy) {
    case CaptureStrategy::BitBltOnly:
      success = BitBlt(ctx.hdc_mem_ctx, 0, 0, width, height, ctx.hdc_window, 0,
                       0, SRCCOPY | CAPTUREBLT);
      break;

    case CaptureStrategy::PrintWindowThenBitBlt:
      if (PrintWindow(hwnd, ctx.hdc_mem_ctx, PW_RENDERFULLCONTENT)) {
        success = true;
      } else {
        success = BitBlt(ctx.hdc_mem_ctx, 0, 0, width, height, ctx.hdc_window,
                         0, 0, SRCCOPY | CAPTUREBLT);
      }
      break;

    case CaptureStrategy::HostWindowBitBlt:
      success = BitBlt(ctx.hdc_mem_ctx, 0, 0, width, height, ctx.hdc_window, 0,
                       0, SRCCOPY | CAPTUREBLT);
      break;
  }

  if (!success)
    return false;

  BITMAP bitmap = {};
  if (!GetObject(ctx.hbitmap, sizeof(BITMAP), &bitmap))
    return false;

  BITMAPFILEHEADER file_header = {};
  BITMAPINFOHEADER info_header = {};
  info_header.biSize = sizeof(BITMAPINFOHEADER);
  info_header.biWidth = bitmap.bmWidth;
  info_header.biHeight = -bitmap.bmHeight;
  info_header.biPlanes = 1;
  info_header.biBitCount = 32;
  info_header.biCompression = BI_RGB;

  DWORD bmp_size = ((bitmap.bmWidth * info_header.biBitCount + 31) / 32) * 4 *
                   bitmap.bmHeight;
  DWORD totalSize =
      bmp_size + sizeof(BITMAPFILEHEADER) + sizeof(BITMAPINFOHEADER);

  file_header.bfType = 0x4D42;  // 'BM'
  file_header.bfSize = totalSize;
  file_header.bfOffBits = sizeof(BITMAPFILEHEADER) + sizeof(BITMAPINFOHEADER);

  out_bitmap.resize(totalSize);
  std::memcpy(out_bitmap.data(), &file_header, sizeof(file_header));
  std::memcpy(out_bitmap.data() + sizeof(file_header), &info_header,
              sizeof(info_header));

  if (!GetDIBits(ctx.hdc_mem_ctx, ctx.hbitmap, 0, bitmap.bmHeight,
                 out_bitmap.data() + file_header.bfOffBits,
                 reinterpret_cast<BITMAPINFO*>(&info_header), DIB_RGB_COLORS)) {
    return false;
  }
  return true;
}

bool CaptureWindowToBitmap(HWND hwnd, std::vector<unsigned char>& out_bitmap) {
  RECT rect = {};
  if (!GetWindowRect(hwnd, &rect))
    return false;
  int width = rect.right - rect.left;
  int height = rect.bottom - rect.top;
  if (width <= 0 || height <= 0)
    return false;

  return CaptureWithStrategy(
      hwnd, width, height, CaptureStrategy::PrintWindowThenBitBlt, out_bitmap);
}

bool CaptureHostToBitmap(HWND hostHwnd,
                         std::vector<unsigned char>& out_bitmap) {
  RECT rect = {};
  if (!GetClientRect(hostHwnd, &rect))
    return false;
  int width = rect.right - rect.left;
  int height = rect.bottom - rect.top;
  if (width <= 0 || height <= 0)
    return false;

  return CaptureWithStrategy(hostHwnd, width, height,
                             CaptureStrategy::HostWindowBitBlt, out_bitmap);
}
}  // namespace mmhmm
