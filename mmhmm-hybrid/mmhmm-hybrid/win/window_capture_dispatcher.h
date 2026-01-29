#pragma once
#include <windows.h>
#include <vector>

namespace mmhmm {
class WindowCaptureDispatcher {
 public:
  bool Capture(HWND hwnd, std::vector<unsigned char>& out_bitmap);

 private:
  bool IsExcludedFromCapture(HWND hwnd);
};
}  // namespace mmhmm
