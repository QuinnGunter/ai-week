#pragma once

#include <memory>
#include <string>

#include <spdlog/spdlog.h>

namespace mmhmm::segmentation::warmup {

class WarmupManager final {
 public:
  explicit WarmupManager(std::shared_ptr<spdlog::logger> logger);

  void WarmModels();

 private:
  void UpdateAppSettings(const std::string& configPath);
  std::string GetSegmentationType(const std::string& configPath);

  std::shared_ptr<spdlog::logger> logger_;
  std::string appDataPath_;
};

}  // namespace mmhmm::segmentation::warmup
