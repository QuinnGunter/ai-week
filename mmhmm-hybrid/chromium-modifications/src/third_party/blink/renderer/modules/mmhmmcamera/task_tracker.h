//
// mmhmm Windows
// Copyright © 2020-2024 mmhmm, inc. All rights reserved.
//
#ifndef THIRD_PARTY_BLINK_RENDERER_MODULES_MMHMMCAMERA_TASK_TRACKER_H_
#define THIRD_PARTY_BLINK_RENDERER_MODULES_MMHMMCAMERA_TASK_TRACKER_H_

#include <mutex>
#include "third_party/blink/renderer/platform/wtf/vector.h"
#include "third_party/blink/renderer/platform/wtf/thread_safe_ref_counted.h"


namespace mmhmm {
class TaskTracker : public blink::ThreadSafeRefCounted<TaskTracker> {
 public:
  TaskTracker() = delete;
  TaskTracker(int max_task_count);

  bool ReserveTaskToken(int& token);
  bool ReturnTaskToken(int id);

 private:
  blink::Vector <
      std::pair<int, bool>> tracker_pool_;
  std::mutex tracker_pool_lock_;
};
}  // namespace mmhmm

#endif //THIRD_PARTY_BLINK_RENDERER_MODULES_MMHMMCAMERA_TASK_TRACKER_H_
