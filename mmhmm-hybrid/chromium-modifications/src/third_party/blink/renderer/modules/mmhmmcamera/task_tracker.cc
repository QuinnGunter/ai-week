#include "task_tracker.h"

namespace mmhmm {

TaskTracker::TaskTracker(int max_task_count) {
  if (max_task_count >= 0) {
    for (int i = 0; i < max_task_count; i++) {
      tracker_pool_.push_back(std::make_pair(i, false));
    }
  }
}

bool TaskTracker::ReserveTaskToken(int& token) {
  std::lock_guard<std::mutex> guard(tracker_pool_lock_);

  for (auto& tracker : tracker_pool_) {
    if (not tracker.second) {
      token = tracker.first;
      tracker.second = true; //mark as reserved
      return true;
    }
  }

  return false;
}

bool TaskTracker::ReturnTaskToken(int token) {
  std::lock_guard<std::mutex> guard(tracker_pool_lock_);

  for (auto& tracker : tracker_pool_) {
    if (tracker.first == token) {
      tracker.second = false;
      return true;
    }
  }

  return false;
}
}  // namespace mmhmm
