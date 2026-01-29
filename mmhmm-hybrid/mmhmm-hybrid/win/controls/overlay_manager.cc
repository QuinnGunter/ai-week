#include "overlay_manager.h"

namespace mmhmm::controls::overlay {
std::shared_ptr<OverlayWindow> OverlayManager::GetOverlayWindow(
    WindowOverlayTarget target, 
    uint64_t target_id) {
  if (overlays_.count(target_id) == 0) {
    overlays_[target_id] =
        std::make_shared<OverlayWindow>(target,target_id);
  }
  return overlays_[target_id];
}

void OverlayManager::ClearOverlayWindows() {
  overlays_.clear();
}
}  // namespace mmhmm::controls::overlay
