#include "segmentor.h"
#include "segmentor_win.h"

#include "base/files/file_path.h"
#include "base/files/file_util.h"
#include "base/path_service.h"

#include "base/win/win_util.h"

namespace mmhmm {

const wchar_t* GetSeglibConfigFileName() {
  return L"seglib_win_segnetu.json";
}

static ConfigurationData GetSeglibConfig(BasicGpuInfo adapterInfo) {
  base::FilePath exe_dir_path;
  base::PathService::Get(base::DIR_ASSETS, &exe_dir_path);
  
  base::FilePath config_path =
  exe_dir_path.Append(L"Resources").Append(GetSeglibConfigFileName());
  const base::FilePath model_root_dir = exe_dir_path.Append(L"Resources");
  
  // With vision talk models, seglib config can be placed also in ModelCache directory
  // In case when it's not present in application directory we should check there
  if (!base::PathExists(config_path)) {
    base::PathService::Get(base::DIR_LOCAL_APP_DATA, &exe_dir_path);
    config_path = exe_dir_path.Append(L"mmhmm-desktop")
      .Append(L"ModelsCache")
      .Append(GetSeglibConfigFileName());
  }
  
  return ConfigurationData({config_path, model_root_dir});
}

bool Segmentor::StartSeglibInternalAccelerated() {
  LOG(INFO) << "Starting seglib DX accelerated engine";
  PlatformAcceleratedEngineWin* win_engine = std::get_if<PlatformAcceleratedEngineWin>(&platform_engine_);
  if (win_engine) {
    CHECK(not static_cast<bool>(win_engine->engine_)) << "seglib DX accelerated engine already started";
  } else {
    platform_engine_ = PlatformAcceleratedEngineWin();
    win_engine = std::get_if<PlatformAcceleratedEngineWin>(&platform_engine_);
  }
  DCHECK(win_engine);

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
  win_engine->engine_ = seglib::dx::DXEngineWrapper{config_path_str.c_str(), models_root_dir_str.c_str()};
  if(!win_engine->engine_) {
    LOG(ERROR) << "Unable to start seglib DX accelerated engine";
    return false;
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

  seglib::dx::DXTexture2DHandle inputHandle;
  inputHandle.handle = input;

  seglib::dx::DXTexture2DHandle outputHandle;
  outputHandle.handle = output;

  auto& win_engine = std::get<PlatformAcceleratedEngineWin>(platform_engine_);
  return win_engine.engine_.NextFrame(inputHandle, outputHandle);
}

void Segmentor::ReadAcceleratedConfig() {
  auto& win_engine = std::get<PlatformAcceleratedEngineWin>(platform_engine_);
  int result = win_engine.engine_.GetConfig(win_engine.config_);

  if (result != 0) {
    LOG(ERROR) << "Unable to get dx config from seglib. Error: " << result;
  }
}

void Segmentor::ReconfigureAcceleratedEngine() {
  config_access_.AssertAcquired();

  const auto& config_data = GetSeglibConfig(adapterInfo_);

  base::File::Info file_info;
  if (base::GetFileInfo(config_data.config_path, &file_info)) {
    // Store the last modification time
    config_last_modified_time_ = file_info.last_modified;
  }

  auto& win_engine = std::get<PlatformAcceleratedEngineWin>(platform_engine_);
  const auto config_path_str = config_data.config_path.AsUTF8Unsafe();
  const int result = win_engine.engine_.Configure(config_path_str.c_str());

  if (result != 0) {
    LOG(ERROR) << "Unable to reconfigure dx engine in seglib. Error: "
               << result;
  }
}

void Segmentor::UpdateAcceleratedEngine() {
  config_access_.AssertAcquired();

  auto& win_engine = std::get<PlatformAcceleratedEngineWin>(platform_engine_);
  if (blur_mode_ != media::mojom::BlurMode::NONE) {
    win_engine.config_.processor_type =
        seglib_dx_processor_type::SEGLIB_DX_PROCESSOR_TYPE_BLUR;
    win_engine.config_.blur_params.blur_type =
        (blur_mode_ == media::mojom::BlurMode::STRONG)
            ? seglib_dx_blur_type::SEGLIB_DX_BLUR_TYPE_STRONG
            : seglib_dx_blur_type::SEGLIB_DX_BLUR_TYPE_LIGHT;
  } else if (segmentation_mode_ == media::mojom::SegmentationMode::SILHOUETTE) {
    win_engine.config_.processor_type =
        seglib_dx_processor_type::SEGLIB_DX_PROCESSOR_TYPE_SEGMENTATION;
  } else {
    win_engine.config_.processor_type =
        seglib_dx_processor_type::SEGLIB_DX_PROCESSOR_TYPE_PASSTHROUGH;
  }

  int result = win_engine.engine_.Configure(win_engine.config_);

  if (result != 0) {
    LOG(ERROR) << "Unable to reconfigure dx engine in seglib. Error: "
               << result;
  }
}

}  // namespace mmhmm
