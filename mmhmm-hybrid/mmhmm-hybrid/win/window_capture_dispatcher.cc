#include "window_capture_dispatcher.h"
#include <dwmapi.h>
#include <vector>
#include "capture_utils.h"
#include "dwm_thumbnail_capture.h"

namespace mmhmm {
bool WindowCaptureDispatcher::Capture(HWND hwnd,
                                      std::vector<unsigned char>& out_bitmap) {
  if (!IsWindow(hwnd)) {
    return false;
  }
  if (IsExcludedFromCapture(hwnd)) {
    return false;
  }

  if (CaptureWindowToBitmap(hwnd, out_bitmap)) {
    return true;
  }
  DwmThumbnailCapture dwm;
  if (dwm.Capture(hwnd, out_bitmap)) {
    return true;
  }
  return false;
}

bool WindowCaptureDispatcher::IsExcludedFromCapture(HWND hwnd) {
  DWORD affinity = 0;
  return GetWindowDisplayAffinity(hwnd, &affinity) &&
         affinity == WDA_EXCLUDEFROMCAPTURE;
}
}  // namespace mmhmm
