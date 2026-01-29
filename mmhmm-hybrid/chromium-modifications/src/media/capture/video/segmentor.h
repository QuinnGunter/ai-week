#ifndef MEDIA_CAPTURE_VIDEO_SEGMENTOR_H_
#define MEDIA_CAPTURE_VIDEO_SEGMENTOR_H_

#include <chrono>
#include <cstdint>
#include <memory>
#include <span>
#include <utility>
#include <vector>
#include <variant>

#include "base/memory/raw_ptr.h"
#include "media/base/video_types.h"
#include "media/capture/mojom/image_capture.mojom.h"
#include "tpxai_logging.h"
#include "tpxai_mce_wrapper.h"
#include "segmentor_win.h"
#include "segmentor_mac.h"

namespace mmhmm {

/**
 * Configuration data for the segmentation library.
 * Contains paths to configuration file and model directories.
 */
struct ConfigurationData {
  base::FilePath config_path{};      ///< Path to the configuration file
  base::FilePath models_root_dir{};  ///< Root directory containing ML models
};

/**
 * Enumeration describing if active adapter has dedicated memory.
 */
enum class BasicGpuInfo {
  unknown,
  hasSharedMemory,
  hasDedicatedMemory
};

using ScopedMCEParsedConfig =
    std::unique_ptr<tpxai_mce_parsed_config,
                    decltype(&tpxai_mce_destroy_parsed_config)>;

/**
 * Retrieves segmentation library configuration based on hardware capabilities.
 * @param adapterInfo Whether the system is using dedicated gpu card.
 * adapter (Minigfull on MacOs)
 * @return Configuration data with appropriate paths for the hardware setup
 */
ConfigurationData GetSeglibConfig(BasicGpuInfo adapterInfo);

/**
 * Video segmentation engine that performs real-time background segmentation
 * and masking operations on video frames using machine learning models.
 *
 * This class supports multiple pipeline versions (CPU, GPU, Metal, DirectX)
 * and can generate both uint8 and float masks for different use cases.
 * Thread-safe for configuration updates but not for concurrent segmentation
 * calls.
 */
class Segmentor {
 public:
  /**
   * Type of mask output format.
   */
  enum class MaskType {
    uint8_mask,  ///< 8-bit unsigned integer mask (0-255)
    float_mask   ///< Floating-point mask (0.0-1.0)
  };

  /**
   * Pipeline implementation to use for segmentation processing.
   */
  enum class PipelineVersion {
    gpu,     ///< GPU-accelerated processing (Obsolete, will be removed)
    cpu,     ///< CPU-only processing (As fallback mechanism)
    metal,   ///< Apple Metal API (macOS)
    directX  ///< DirectX-based processing (Windows)
  };

  /**
   * Constructs a new Segmentor with the specified pipeline version.
   * @param pipeline_version The processing pipeline to use
   */
  explicit Segmentor(PipelineVersion pipeline_version);

  ~Segmentor();

  // Non-copyable and non-movable
  Segmentor(Segmentor&&) = delete;
  Segmentor& operator=(Segmentor&&) = delete;
  Segmentor(const Segmentor&) = delete;
  Segmentor& operator=(const Segmentor&) = delete;

  /**
   * Checks if the segmentor has been successfully initialized.
   * @return true if ready to process frames, false otherwise
   */
  bool Initialized() const;

  /**
   * Gets the dimensions of the currently loaded ML model.
   * @return Pair of (width, height) in pixels
   */
  std::pair<int, int> GetCurrentModelSize() const;

  /**
   * Performs segmentation on a video frame with full parameter control.
   * This is the primary segmentation method that processes raw video data
   * and generates a segmentation mask.
   *
   * @param data Raw video frame data
   * @param width Frame width in pixels
   * @param height Frame height in pixels
   * @param pixel_format Video pixel format (e.g., I420, NV12, ARGB)
   * @param segmentation_mode Type of segmentation to perform
   * @param mask_type Output mask format (uint8 or float)
   */
  void SegmentFrame(const std::uint8_t* data,
                    int width,
                    int height,
                    media::VideoPixelFormat pixel_format,
                    media::mojom::SegmentationMode segmentation_mode,
                    MaskType mask_type);

  /**
   * Segmentation method for pre-processed input/output buffers used by accelerated pipelines.
   *
   * @param input Pre-processed input buffer (CVPixelBufferRef or HANDLE, any color format)
   * @param output Output buffer where result will be writen. ((CVPixelBufferRef or HANDLE, BGRA format only))
   * @return Status code (0 for success)
   */
  int SegmentFrame(void* input, void* output);

  /**
   * Updates the segmentation mode for subsequent frame processing.
   * @param segmentation_mode New segmentation mode to apply
   */
  void SetSegmentationMode(media::mojom::SegmentationMode segmentation_mode);

  /**
   * Updates the blur mode for background processing.
   * @param blur_mode New blur mode to apply
   */
  void SetBlurMode(media::mojom::BlurMode blur_mode);

  /**
   * Reads updated configuration from disk if changes are detected.
   * Thread-safe and can be called during active segmentation.
   */
  void ReadAcceleratedConfig();

  /**
   * Reconfigures the accelerated processing engine with new settings.
   * May cause temporary processing interruption.
   */
  void ReconfigureAcceleratedEngine();

  /**
   * Updates the accelerated engine with new configuration data.
   * Less disruptive than full reconfiguration.
   */
  void UpdateAcceleratedEngine();

  // Mask Access Methods

  /**
   * Gets the most recent uint8 segmentation mask.
   * CPU/GPU only backends.
   * @return Read-only span of mask data (values 0-255)
   */
  std::span<const std::uint8_t> GetUint8Mask() const;

  /**
   * Gets the most recent float segmentation mask.
   * CPU/GPU only backends.
   * @return Read-only span of mask data (values 0.0-1.0)
   */
  std::span<const float> GetFloatMask() const;

  /**
   * Gets reference to the opaque mask buffer for advanced processing.
   * CPU/GPU only backends.
   * @return Read-only span of opaque mask data
   */
  std::span<const std::uint8_t> GetOpaqueMaskRef() const;

  // State Management

  /**
   * Checks if a new mask has been calculated since last query.
   * @return true if new mask is available
   */
  bool HasNewMask() const;

  /**
   * Clears the new mask flag after processing.
   * Call after retrieving mask data to reset state.
   */
  void CleanNewMaskFlag();

  /**
   * Records the processing duration for the last frame.
   * Used for performance monitoring and optimization.
   * @param duration Time taken to process the last frame
   */
  void SetLastFrameProcDuration(const std::chrono::milliseconds& duration);

 private:
  constexpr static inline tpxai_frame_span DefaultFrameSpanSw() {
    return tpxai_frame_span{nullptr, 0, 0, 0, tpxai_depth_type::TPXAI_DEPTH_8U,
                            0};
  }

  bool StartSeglib(PipelineVersion pipeline_version);
  bool StartSeglibInternalCpuGpu(PipelineVersion pipeline_version);
  bool StartSeglibInternalAccelerated();
  bool RestartSeglib();
  bool CanReuseBuffers(int width, int height, media::VideoPixelFormat format);
  void AllocateBuffers(MaskType mask_type);
  bool HasConfigFileChanged();

 private:
  tpxai::MCEWrapper seglib_engine_;
  std::variant<PlatformAcceleratedEngineWin, PlatformAcceleratedEngineMac> platform_engine_;
  ScopedMCEParsedConfig parsed_config_{nullptr,
                                       tpxai_mce_destroy_parsed_config};
  bool seglib_logger_setup_ = false;
  bool buffers_allocated_ = false;
  MaskType mask_type_ = MaskType::uint8_mask;
  std::vector<std::uint8_t> uint8_mask_buffer1_;
  std::vector<std::uint8_t> uint8_mask_buffer2_;
  std::vector<float> float_mask_buffer1_;
  std::vector<float> float_mask_buffer2_;
  std::vector<char> frame_buffer_;
  std::vector<uint8_t> opaque_buffer_;
  tpxai_frame_span camera_frame_ = DefaultFrameSpanSw();
  tpxai_frame_span current_mask_ = DefaultFrameSpanSw();
  tpxai_frame_span prev_mask_ = DefaultFrameSpanSw();
  tpxai_nn_model_traits current_model_traits_;
  bool new_mask_calculated_ = false;
  BasicGpuInfo adapterInfo_ = BasicGpuInfo::unknown;
  base::Time config_last_modified_time_;
  int width_ = 0;
  int height_ = 0;
  media::VideoPixelFormat format_;
  media::mojom::SegmentationMode segmentation_mode_ = media::mojom::SegmentationMode::NONE;
  media::mojom::BlurMode blur_mode_ = media::mojom::BlurMode::NONE;
  base::Lock config_access_;
  std::atomic_bool config_has_changed_ = false;
};

class ScopedSegmentorFrameProcTimeUpdater {
 public:
  explicit ScopedSegmentorFrameProcTimeUpdater(Segmentor& segmentor);
  ScopedSegmentorFrameProcTimeUpdater(Segmentor& segmentor1,
                                      Segmentor& segmentor2);
  ~ScopedSegmentorFrameProcTimeUpdater();

  ScopedSegmentorFrameProcTimeUpdater(
      const ScopedSegmentorFrameProcTimeUpdater&) = delete;
  ScopedSegmentorFrameProcTimeUpdater(ScopedSegmentorFrameProcTimeUpdater&&) =
      delete;

  ScopedSegmentorFrameProcTimeUpdater& operator=(
      const ScopedSegmentorFrameProcTimeUpdater&) = delete;
  ScopedSegmentorFrameProcTimeUpdater& operator=(
      ScopedSegmentorFrameProcTimeUpdater&&) = delete;

 private:
  raw_ptr<Segmentor> segmentor1_;
  raw_ptr<Segmentor> segmentor2_;
  std::chrono::steady_clock::time_point start_ =
      std::chrono::steady_clock::now();
};

}  // namespace mmhmm

#endif  // MEDIA_CAPTURE_VIDEO_SEGMENTOR_H_
