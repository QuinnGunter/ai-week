#pragma once
#include <mutex>
#include <map>

#include "overlay_window.h"
#include "common\window_overlay.h"

namespace mmhmm::controls::overlay {
class OverlayManager {
 public:
  OverlayManager() {}
  ~OverlayManager() {}

  std::shared_ptr<OverlayWindow> GetOverlayWindow(
      WindowOverlayTarget target, uint64_t target_hwnd);
  void ClearOverlayWindows();

  private:
  std::map<uint64_t, std::shared_ptr<OverlayWindow>> overlays_;
};
}  // namespace controls::overlay
