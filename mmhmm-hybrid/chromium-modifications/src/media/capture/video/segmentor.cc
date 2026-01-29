#include "segmentor.h"

#include "base/files/file_path.h"
#include "base/files/file_util.h"
#include "base/logging.h"
#include "base/path_service.h"
#include "third_party/libyuv/include/libyuv.h"

namespace mmhmm {

Segmentor::Segmentor(PipelineVersion pipeline_version) {
  if (not StartSeglib(pipeline_version)) {
    LOG(ERROR) << "Unable to start seglib instance";
  }
}

Segmentor::~Segmentor() {
  if (seglib_logger_setup_) {
    tpxai_remove_logger();
  }
}

bool Segmentor::Initialized() const {
  return static_cast<bool>(seglib_engine_);
}

std::pair<int, int> Segmentor::GetCurrentModelSize() const {
  return {current_model_traits_.width, current_model_traits_.height};
}

void Segmentor::SegmentFrame(const std::uint8_t* data,
                             int width,
                             int height,
                             media::VideoPixelFormat pixel_format,
                             media::mojom::SegmentationMode segmentation_mode,
                             MaskType mask_type) {
  DCHECK(width > 0);
  DCHECK(height > 0);
  DCHECK(pixel_format == media::PIXEL_FORMAT_BGRA or
         pixel_format == media::PIXEL_FORMAT_I420A);
  if (buffers_allocated_ and not CanReuseBuffers(width, height, pixel_format)) {
    if (not RestartSeglib()) {
      LOG(ERROR) << "Seglib restart failed";
      return;
    }
    buffers_allocated_ = false;
  }

  if (not buffers_allocated_) {
    width_ = width;
    height_ = height;
    format_ = pixel_format;
    AllocateBuffers(mask_type);
    buffers_allocated_ = true;
    mask_type_ = mask_type;
  } else {
    CHECK_EQ(mask_type_, mask_type);
  }

  if (segmentation_mode != media::mojom::SegmentationMode::SILHOUETTE) {
    return;
  }

  if (new_mask_calculated_) {
    std::swap(prev_mask_.data, current_mask_.data);
  }

  if (format_ == media::PIXEL_FORMAT_I420A) {
    const int y_length = width * height;
    const int y_stride = width;
    const int uv_length = (width / 2) * (height / 2);
    const int uv_stride = width / 2;
    const int rgb_stride = width * 3;

    libyuv::I420ToRGB24(data, y_stride, data + y_length, uv_stride,
                        data + y_length + uv_length, uv_stride,
                        static_cast<uint8_t*>(camera_frame_.data), rgb_stride,
                        width, height);
  } else {
    DCHECK(format_ == media::PIXEL_FORMAT_BGRA);
    camera_frame_.data = const_cast<uint8_t*>(data);
    DCHECK(camera_frame_.data);
  }

  const bool seglib_status = seglib_engine_.NextFrame(
      camera_frame_, prev_mask_, current_mask_, new_mask_calculated_);
  if (not seglib_status) {
    new_mask_calculated_ = false;
  }
  seglib_engine_.CurrentModelTraits(current_model_traits_);
}

std::span<const std::uint8_t> Segmentor::GetUint8Mask() const {
  CHECK_EQ(mask_type_, MaskType::uint8_mask);
  const std::size_t span_size = uint8_mask_buffer1_.size();
  CHECK(span_size > 0);
  return new_mask_calculated_
             ? std::span{static_cast<const std::uint8_t*>(current_mask_.data),
                         span_size}
             : std::span{static_cast<const std::uint8_t*>(prev_mask_.data),
                         span_size};
}

std::span<const float> Segmentor::GetFloatMask() const {
  CHECK_EQ(mask_type_, MaskType::float_mask);
  const std::size_t span_size = float_mask_buffer1_.size();
  return new_mask_calculated_
             ? std::span{static_cast<const float*>(current_mask_.data),
                         span_size}
             : std::span{static_cast<const float*>(prev_mask_.data), span_size};
}

bool Segmentor::HasNewMask() const {
  return new_mask_calculated_;
}

void Segmentor::CleanNewMaskFlag() {
  if (new_mask_calculated_) {
    std::swap(prev_mask_.data, current_mask_.data);
    new_mask_calculated_ = false;
  }
}

void Segmentor::SetLastFrameProcDuration(
    const std::chrono::milliseconds& duration) {
  if (new_mask_calculated_) {
    seglib_engine_.SetLastFrameProcDuration(duration.count());
  }
}

std::span<const std::uint8_t> Segmentor::GetOpaqueMaskRef() const {
  return opaque_buffer_;
}

namespace {

void SeglibExtLogSinkCallback(tpxai_log_level level,
                              const char* message,
                              void* /*context*/) {
  switch (level) {
    case tpxai_log_level::TPXAI_LOG_LEVEL_TRACE:
      VLOG(3) << message;
      break;
    case tpxai_log_level::TPXAI_LOG_LEVEL_DEBUG:
      DLOG(INFO) << message;
      break;
    case tpxai_log_level::TPXAI_LOG_LEVEL_INFO:
      LOG(INFO) << message;
      break;
    case tpxai_log_level::TPXAI_LOG_LEVEL_WARN:
      LOG(WARNING) << message;
      break;
    case tpxai_log_level::TPXAI_LOG_LEVEL_ERROR:
      LOG(ERROR) << message;
      break;
    case tpxai_log_level::TPXAI_LOG_LEVEL_OFF:
      break;
    case tpxai_log_level::TPXAI_LOG_LEVEL_CRITICAL:
      LOG(FATAL) << message;
  }
}

ScopedMCEParsedConfig CreateScopedMCEParsedConfigFromJSONFile(
    const char* json_file_path,
    const tpxai_mce_config_source_context* config_src_context = nullptr) {
  tpxai_mce_parsed_config* parsed_config = nullptr;
  if (tpxai_mce_parse_json_file_config(json_file_path, config_src_context,
                                       &parsed_config) != 0) {
    return {nullptr, tpxai_mce_destroy_parsed_config};
  }
  return ScopedMCEParsedConfig(parsed_config, tpxai_mce_destroy_parsed_config);
}

}  // namespace

bool Segmentor::StartSeglib(PipelineVersion pipeline_version) {
  auto seglib_log_config = tpxai_create_default_logger_config();
  seglib_log_config.log_function = SeglibExtLogSinkCallback;
  seglib_log_config.log_function_level = tpxai_log_level::TPXAI_LOG_LEVEL_INFO;
  seglib_log_config.log_function_mt_safety =
      tpxai_log_sink_multi_thread_safety::TPXAI_LOG_SINK_MULTI_THREAD_SAFE;
  seglib_log_config.console_sink_log_level =
      tpxai_log_level::TPXAI_LOG_LEVEL_OFF;
  seglib_logger_setup_ = tpxai_setup_logger(&seglib_log_config);
  if (not seglib_logger_setup_) {
    LOG(ERROR) << "Unable to setup seglib logger";
  }

  if (pipeline_version == PipelineVersion::gpu ||
      pipeline_version == PipelineVersion::cpu) {
    return StartSeglibInternalCpuGpu(pipeline_version);
  } else {
    return StartSeglibInternalAccelerated();
  }
}

bool Segmentor::StartSeglibInternalCpuGpu(PipelineVersion pipeline_version) {
  CHECK(not static_cast<bool>(seglib_engine_)) << "seglib already started";

  const ConfigurationData config_data = GetSeglibConfig(adapterInfo_);
  LOG(INFO) << "Config path: " << config_data.config_path
            << ", model root dir: " << config_data.models_root_dir;

  tpxai_mce_config_source_context cfg_src_ctx;
  std::memset(&cfg_src_ctx, 0, sizeof(cfg_src_ctx));
  std::string models_root_dir_str = config_data.models_root_dir.AsUTF8Unsafe();
  cfg_src_ctx.models_root_dir = models_root_dir_str.c_str();

  if (pipeline_version == PipelineVersion::gpu) {
    // for the GPU version the smoothstep must not be performed by seglib, as
    // there is postprocessing implemented on GPU that includes smoothstep as
    // well.
    parsed_config_ = CreateScopedMCEParsedConfigFromJSONFile(
        config_data.config_path.AsUTF8Unsafe().c_str(), &cfg_src_ctx);
    tpxai_mce_engine_config seglib_config =
        *tpxai_mce_get_parsed_config(parsed_config_.get());
    seglib_config.bottom_alpha_threshold = 0.f;
    seglib_config.upper_alpha_threshold = 1.f;
    seglib_engine_ = tpxai::MCEWrapper{seglib_config};
  } else {
    seglib_engine_ = tpxai::MCEWrapper{
        config_data.config_path.AsUTF8Unsafe().c_str(), &cfg_src_ctx};
  }

  std::memset(&current_model_traits_, 0, sizeof current_model_traits_);
  bool status = static_cast<bool>(seglib_engine_);
  if (status) {
    status = seglib_engine_.CurrentModelTraits(current_model_traits_);
  }
  return status;
}

void Segmentor::SetSegmentationMode(media::mojom::SegmentationMode segmentation_mode) {
  base::AutoLock lock(config_access_);
  segmentation_mode_ = segmentation_mode;
  config_has_changed_ = true;
}

void Segmentor::SetBlurMode(media::mojom::BlurMode blur_mode) {
  base::AutoLock lock(config_access_);
  if (blur_mode == blur_mode_) {
    return;
  }
  blur_mode_ = blur_mode;
  config_has_changed_ = true;
}

bool Segmentor::HasConfigFileChanged() {
  const auto& config_data = GetSeglibConfig(adapterInfo_);
  
  // Get current file info
  base::File::Info current_file_info;
  if (!base::GetFileInfo(config_data.config_path, &current_file_info)) {
    LOG(WARNING) << "Could not get file info for config file";
    return false;  // Assume unchanged if we can't check
  }
  
  // Compare the modification times
  base::Time current_mod_time = current_file_info.last_modified;
  
  // Check if the stored time is valid and if the file has been modified
  if (config_last_modified_time_.is_null()) {
    // If we don't have a stored time, assume it has changed
    LOG(INFO) << "No previous modification time stored, assuming config changed";
    return true;
  }
  
  // Check if the file is newer than our stored time
  bool has_changed = current_mod_time > config_last_modified_time_;
  
  if (has_changed) {
    LOG(INFO) << "Config file has been modified. Previous: "
    << config_last_modified_time_
    << ", Current: " << current_mod_time;
  }
  
  return has_changed;
}

bool Segmentor::RestartSeglib() {
  bool status =
      seglib_engine_.Restart(current_model_traits_.segmentation_spec_index);
  if (status) {
    status = seglib_engine_.CurrentModelTraits(current_model_traits_);
  }
  return status;
}

void Segmentor::AllocateBuffers(MaskType mask_type) {
  const int frame_channels = (format_ == media::PIXEL_FORMAT_I420A) ? 3 : 4;
  static constexpr int mask_channels = 1;

  new_mask_calculated_ = false;

  tpxai_depth_type mask_depth;
  void* mask_buffer_addr1 = nullptr;
  void* mask_buffer_addr2 = nullptr;
  DCHECK(width_ > 0);
  DCHECK(height_ > 0);
  const std::size_t size = width_ * height_;
  if (mask_type == MaskType::uint8_mask) {
    uint8_mask_buffer1_.resize(size, '\0');
    uint8_mask_buffer2_.resize(size, '\0');
    mask_depth = tpxai_depth_type::TPXAI_DEPTH_8U;
    mask_buffer_addr1 = uint8_mask_buffer1_.data();
    mask_buffer_addr2 = uint8_mask_buffer2_.data();
  } else {
    DCHECK(mask_type == MaskType::float_mask);
    float_mask_buffer1_.resize(size, 0.f);
    float_mask_buffer2_.resize(size, 0.f);
    mask_depth = tpxai_depth_type::TPXAI_DEPTH_32F;
    mask_buffer_addr1 = float_mask_buffer1_.data();
    mask_buffer_addr2 = float_mask_buffer2_.data();
  }
  DCHECK(mask_buffer_addr1);
  DCHECK(mask_buffer_addr2);

  opaque_buffer_.resize(size, 255);

  std::memset(&camera_frame_, 0, sizeof camera_frame_);
  camera_frame_.width = width_;
  camera_frame_.height = height_;
  camera_frame_.channels = frame_channels;
  camera_frame_.depth = tpxai_depth_type::TPXAI_DEPTH_8U;
  if (format_ == media::PIXEL_FORMAT_I420A) {
    // incoming I420A frames are converted to format before being passed to
    // seglib
    frame_buffer_.resize(size * frame_channels, '\0');
    camera_frame_.data = frame_buffer_.data();
  }

  std::memset(&current_mask_, 0, sizeof current_mask_);
  current_mask_.data = mask_buffer_addr1;
  current_mask_.width = width_;
  current_mask_.height = height_;
  current_mask_.channels = mask_channels;
  current_mask_.depth = mask_depth;

  std::memset(&prev_mask_, 0, sizeof prev_mask_);
  prev_mask_.data = mask_buffer_addr2;
  prev_mask_.width = width_;
  prev_mask_.height = height_;
  prev_mask_.channels = mask_channels;
  prev_mask_.depth = mask_depth;
}

bool Segmentor::CanReuseBuffers(int width,
                                int height,
                                media::VideoPixelFormat format) {
  return width == width_ and height == height_ and format == format_;
}

ScopedSegmentorFrameProcTimeUpdater::ScopedSegmentorFrameProcTimeUpdater(
    Segmentor& segmentor)
    : segmentor1_{&segmentor}, segmentor2_{nullptr} {
  segmentor1_->CleanNewMaskFlag();
}

ScopedSegmentorFrameProcTimeUpdater::ScopedSegmentorFrameProcTimeUpdater(
    Segmentor& segmentor1,
    Segmentor& segmentor2)
    : segmentor1_{&segmentor1}, segmentor2_{&segmentor2} {
  segmentor1_->CleanNewMaskFlag();
  segmentor2_->CleanNewMaskFlag();
}

ScopedSegmentorFrameProcTimeUpdater::~ScopedSegmentorFrameProcTimeUpdater() {
  const auto duration = std::chrono::duration_cast<std::chrono::milliseconds>(
      std::chrono::steady_clock::now() - start_);
  segmentor1_->SetLastFrameProcDuration(duration);
  if (segmentor2_) {
    segmentor2_->SetLastFrameProcDuration(duration);
  }
}

}  // namespace mmhmm
