#pragma once
#include <dwmapi.h>
#include <windows.h>
#include <vector>

namespace mmhmm {
class DwmThumbnailCapture {
 public:
  DwmThumbnailCapture();
  ~DwmThumbnailCapture();

  bool Capture(HWND target_hwnd, std::vector<unsigned char>& out_bitmap);

 private:
  bool CreateHostWindow(int width, int height);
  void DestroyHostWindow();
  bool RenderThumbnail(HWND target_hwnd, int width, int height);

 private:
  HWND host_hwnd_ = nullptr;
  HTHUMBNAIL thumbnail_ = nullptr;
};
}  // namespace mmhmm
