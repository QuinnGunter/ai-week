#include "WarmupManager.h"

#include <fstream>
#include <filesystem>

#include "nlohmann/json.hpp"

#include "SplashScreen.h"

#include "FileUtils.h"
#include "..\..\mmhmm-hybrid\win\app_settings_service.h"
#include "..\..\common\string_util.h"

#include "evaluate_inference_backends.h"
#include "tpxai_logging.h"

namespace fs = std::filesystem;

namespace mmhmm::segmentation::warmup {

WarmupManager::WarmupManager(std::shared_ptr<spdlog::logger> logger)
    : logger_(logger) {
  appDataPath_ = client::ToNarrowString(AppSettingsService::GetAppDataPath());
}

namespace {

bool forceEvaluation(const std::shared_ptr<spdlog::logger>& logger, const std::string& configPath) {
  const json existingConfig = json::parse(std::ifstream(configPath));
  if (existingConfig.contains("seglib") && existingConfig["seglib"].contains("directx_config")) {
    return false;
  }
  SPDLOG_LOGGER_INFO(logger, "directx_config node does not exist in the config file. Forcing evaluation.");
  return true;
}

}

void WarmupManager::WarmModels() {
  try
  {
    SPDLOG_LOGGER_INFO(logger_, "Starting seglib model warmup procedure...");

    const auto [pathUtf, pathUnicode] = GetExecutablePath();
    const std::string resourcesConfigPath =
        pathUtf + "\\resources\\seglib_win_segnetu.json";
    const std::string modelsCacheConfigPath =
        appDataPath_ + "\\ModelsCache\\seglib_win_segnetu.json";

    bool evaluateInferenceBackends = true;
    if(fs::exists(resourcesConfigPath)) {
      if(!forceEvaluation(logger_, resourcesConfigPath)) {
        evaluateInferenceBackends = false;
        UpdateAppSettings(resourcesConfigPath);
      }
      else {
        fs::remove(resourcesConfigPath);
      }
    }
    else if(fs::exists(modelsCacheConfigPath)) {
      if(!forceEvaluation(logger_, modelsCacheConfigPath)) {
        evaluateInferenceBackends = false;
        UpdateAppSettings(modelsCacheConfigPath);
      }
      else {
        fs::remove(modelsCacheConfigPath);
      }
    }
    else {
      const fs::path modelsCacheConfigParentPath = fs::path(modelsCacheConfigPath).parent_path();
      if (!fs::exists(modelsCacheConfigParentPath)) {
        fs::create_directories(modelsCacheConfigParentPath);
      }
    }

    if(!evaluateInferenceBackends) {
      SPDLOG_LOGGER_INFO(logger_, "Skipping inference backends evaluation.");
      return;
    }

    const std::string openVinoGPUInferenceConfigPath =
        pathUtf + "\\resources\\seglib_win_segnetu.json.gpu";
    const std::string openVinoCPUInferenceConfigPath =
        pathUtf + "\\resources\\seglib_win_segnetu.json.cpu";
    const std::string winMLInferenceConfigPath =
        pathUtf + "\\resources\\seglib_win_segnetu.json.winml";
    const std::string onnxInferenceConfigPath =
        pathUtf + "\\resources\\seglib_win_segnetu.json.segnet";
    const fs::path modelsRootDir = fs::path(pathUtf) / "resources";
    const std::string modelsRootDirStr = modelsRootDir.string();
    
    tpxai_mce_evaluate_inference_backends_config evalConfig;
    std::memset(&evalConfig, 0, sizeof(evalConfig));

    evalConfig.measure_inference_duration_app_exe = "measure_inference_duration_app.exe";
    std::vector<const char*> search_paths{pathUtf.c_str()};
    evalConfig.custom_exe_search_paths = search_paths.data();
    evalConfig.custom_exe_search_paths_count = search_paths.size();

    evalConfig.backends_specs_count = 4;
    std::vector<tpxai_mce_evaluate_inference_backend_spec> specs(evalConfig.backends_specs_count);
    specs[0].json_config_path = openVinoGPUInferenceConfigPath.c_str();
    specs[0].models_root_dir = modelsRootDirStr.c_str();
    specs[0].segmentation_index = 1;
    specs[0].evaluation_timeout_seconds = 120;
    specs[0].intel_gpu_friendly = true;

    specs[1].json_config_path = openVinoCPUInferenceConfigPath.c_str();
    specs[1].models_root_dir = modelsRootDirStr.c_str();
    specs[1].segmentation_index = 1;
    specs[1].evaluation_timeout_seconds = 60;
    specs[1].intel_gpu_friendly = false;

    specs[2].json_config_path = winMLInferenceConfigPath.c_str();
    specs[2].models_root_dir = modelsRootDirStr.c_str();
    specs[2].segmentation_index = 1;
    specs[2].evaluation_timeout_seconds = 120;
    specs[2].intel_gpu_friendly = false;

    specs[3].json_config_path = onnxInferenceConfigPath.c_str();
    specs[3].models_root_dir = modelsRootDirStr.c_str();
    specs[3].segmentation_index = 1;
    specs[3].evaluation_timeout_seconds = 60;
    specs[3].intel_gpu_friendly = false;

    evalConfig.backends_specs = specs.data();

    tpxai_setup_default_logger();

    size_t selectedBackendIndex = 0;
    const auto ret = tpxai_evaluate_inference_backends(&evalConfig, &selectedBackendIndex);
    if (ret != 0) {
      SPDLOG_LOGGER_ERROR(logger_,
                         "Failed to evaluate inference backends. Fallback to onnx. Error code: {}",
                         ret);
      selectedBackendIndex = 3;
    }
    SPDLOG_LOGGER_INFO(logger_, "Selected backend index: {}", selectedBackendIndex);
    fs::copy(specs[selectedBackendIndex].json_config_path, modelsCacheConfigPath, fs::copy_options::overwrite_existing);
    UpdateAppSettings(modelsCacheConfigPath);
  } catch (std::exception ex) {
    SPDLOG_LOGGER_INFO(logger_, "Error during model warm up. Error: {}",
                       ex.what());
  } catch (...) {
    SPDLOG_LOGGER_INFO(logger_, "Unknown error during model warm up");
  }
}

void WarmupManager::UpdateAppSettings(const std::string& configPath) {
  AppSettingsService::LoadSettings();
  mmhmmSettings& settingsRef = AppSettingsService::AppSettings();

  std::string segmentationType = GetSegmentationType(configPath);

  if (settingsRef.segmentationType != segmentationType) {
    settingsRef.segmentationType = segmentationType;
    AppSettingsService::SaveSettings();
  }
}

std::string WarmupManager::GetSegmentationType(const std::string& configPath) {
  std::ifstream file(configPath);
  if (!file.is_open()) {
    SPDLOG_LOGGER_ERROR(logger_, "Unable to open segmentation config file");
    return "unknown";
  }

  try {
    json j;
    file >> j;
    auto segmentations = j["seglib"]["mce_config"]["segmentations"];
    for (const auto& segmentation : segmentations) {
      if (segmentation.contains("nn_segmentation_impl")) {
        auto nn_segmentation_impl = segmentation["nn_segmentation_impl"];

        // Checking the type
        for (auto it = nn_segmentation_impl.begin();
             it != nn_segmentation_impl.end(); ++it) {
          return it.key();
        }
      }
    }
  } catch (...) {
    SPDLOG_LOGGER_ERROR(logger_, "Unable to parse segmentation config file");
  }

  return "unknown";
}

}  // namespace mmhmm::segmentation::warmup
