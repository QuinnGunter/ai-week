#include "segmentor.h"

#include "base/files/file_path.h"
#include "base/files/file_util.h"
#include "base/logging.h"
#include "base/path_service.h"
#include "third_party/libyuv/include/libyuv.h"

#include "base/mac/mac_util.h"

namespace mmhmm {

const char* GetSeglibConfigFileName(BasicGpuInfo adapterInfo) {
  if (base::mac::GetCPUType() == base::mac::CPUType::kArm) {
    return "seglib_metal.json";
  } else {
    if (adapterInfo == BasicGpuInfo::hasDedicatedMemory) {
      return "seglib_metal_intel_strong.json";
    }
    return "seglib_metal_intel.json";
  }
}

ConfigurationData GetSeglibConfig(BasicGpuInfo adapterInfo) {
  base::FilePath exe_dir_path;
  base::PathService::Get(base::DIR_ASSETS, &exe_dir_path);
  
  base::FilePath config_path = exe_dir_path.DirName()
    .Append("Resources")
    .Append(GetSeglibConfigFileName(adapterInfo));
  base::FilePath user_data_dir;
  
  if (base::PathService::Get(base::DIR_APP_DATA, &user_data_dir)) {
    base::FilePath app_support_config_path = user_data_dir
      .Append("mmhmm")
      .Append("segmentation")
      .Append(GetSeglibConfigFileName(adapterInfo));
    
    if (base::PathExists(app_support_config_path)) {
      config_path = app_support_config_path;
    }
  }
  
  const base::FilePath model_root_dir =
  exe_dir_path.DirName().Append("Resources");
  
  return ConfigurationData({config_path, model_root_dir});
}

bool Segmentor::StartSeglibInternalAccelerated() {
  LOG(INFO) << "Starting seglib metal accelerated engine";
  PlatformAcceleratedEngineMac* mac_engine = std::get_if<PlatformAcceleratedEngineMac>(&platform_engine_);
  if (mac_engine) {
    CHECK(not static_cast<bool>(mac_engine->engine_)) << "seglib metal accelerated engine already started";
  } else {
    platform_engine_ = PlatformAcceleratedEngineMac();
    mac_engine = std::get_if<PlatformAcceleratedEngineMac>(&platform_engine_);
  }
  DCHECK(mac_engine);

  const auto& config_data = GetSeglibConfig(adapterInfo_);
  LOG(INFO) << "Config path: " << config_data.config_path
            << ", model root dir: " << config_data.models_root_dir;
  
  base::File::Info file_info;
  if (base::GetFileInfo(config_data.config_path, &file_info)) {
    // Store the last modification time
    config_last_modified_time_ = file_info.last_modified;
  }
  
  const auto config_path_str = config_data.config_path.AsUTF8Unsafe();
  const auto models_root_dir_str = config_data.models_root_dir.AsUTF8Unsafe();
  mac_engine->engine_ = tpxai::MetalEngineWrapper{config_path_str.c_str(), models_root_dir_str.c_str()};
  if(!mac_engine->engine_) {
    LOG(ERROR) << "Unable to start seglib metal accelerated engine";
    return false;
  }
  // Once engine is instantiated check what type of GPU is active.
  // True means discrete, False - an integrated GPU.
  // On Intel Mac we want to run bigger model only with discrete GPU.
  if (mac_engine->engine_.HasDedicatedMemory()) {
    base::AutoLock lock(config_access_);
    adapterInfo_ = BasicGpuInfo::hasDedicatedMemory;
    ReconfigureAcceleratedEngine();
  }
  ReadAcceleratedConfig();
  return true;
}

int Segmentor::SegmentFrame(void* input,
                            void* output) {
  if (config_has_changed_) {
    base::AutoLock lock(config_access_);
    if (HasConfigFileChanged()) {
      ReconfigureAcceleratedEngine();
      ReadAcceleratedConfig();
    } else {
      UpdateAcceleratedEngine();
    }
    config_has_changed_ = false;
  }
  
  tpxai::CVPixelBuffer inputWrapper({input});
  tpxai::CVPixelBuffer outputWrapper({output});
  
  auto& mac_engine = std::get<PlatformAcceleratedEngineMac>(platform_engine_);
  return mac_engine.engine_.NextFrame(inputWrapper, outputWrapper);
}

void Segmentor::ReadAcceleratedConfig() {
  auto& mac_engine = std::get<PlatformAcceleratedEngineMac>(platform_engine_);
  int result = mac_engine.engine_.GetConfig(mac_engine.config_);
   
  if (result != 0) {
    LOG(ERROR) << "Unable to get metal config from seglib. Error: " << result;
  }
}

void Segmentor::ReconfigureAcceleratedEngine() {
  config_access_.AssertAcquired();
  
  const auto& config_data = GetSeglibConfig(adapterInfo_);
  
  base::FilePath config_path = config_data.config_path;
  base::File::Info file_info;
  if (base::GetFileInfo(config_path, &file_info)) {
    // Store the last modification time
    config_last_modified_time_ = file_info.last_modified;
  }
  
  auto& mac_engine = std::get<PlatformAcceleratedEngineMac>(platform_engine_);
  const auto config_path_str = config_data.config_path.AsUTF8Unsafe();
  const auto models_root_dir_str = config_data.models_root_dir.AsUTF8Unsafe();
  const int result = mac_engine.engine_.Configure(config_path_str.c_str(), models_root_dir_str.c_str());

  if (result != 0) {
    LOG(ERROR) << "Unable to reconfigure metal engine in seglib. Error: " << result;
  }
}

void Segmentor::UpdateAcceleratedEngine() {
  config_access_.AssertAcquired();
  
  auto& mac_engine = std::get<PlatformAcceleratedEngineMac>(platform_engine_);
  if (blur_mode_ != media::mojom::BlurMode::NONE) {
    mac_engine.config_.processor_type = tpxai_metal_processor_type::TPXAI_METAL_PROCESSOR_TYPE_BLUR;
    mac_engine.config_.use_strong_blur = (blur_mode_ == media::mojom::BlurMode::STRONG);
  } else if (segmentation_mode_ == media::mojom::SegmentationMode::SILHOUETTE) {
    mac_engine.config_.processor_type = tpxai_metal_processor_type::TPXAI_METAL_PROCESSOR_TYPE_SEGMENTATION;
  } else {
    mac_engine.config_.processor_type = tpxai_metal_processor_type::TPXAI_METAL_PROCESSOR_TYPE_PASSTHROUGH;
  }
  
  int result = mac_engine.engine_.Configure(mac_engine.config_);
  
  if (result != 0) {
    LOG(ERROR) << "Unable to reconfigure metal engine in seglib. Error: " << result;
  }
}

}  // namespace mmhmm
