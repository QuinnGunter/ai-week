#ifndef MEDIA_CAPTURE_VIDEO_SEGMENTOR_MAC_H_
#define MEDIA_CAPTURE_VIDEO_SEGMENTOR_MAC_H_

#include "metal/metal_engine_wrapper.hpp"

namespace mmhmm {

/**
* Platform-specific accelerated processing engine for hardware-optimized segmentation.
* Wraps Metal-based acceleration functionality with associated configuration.
* Used internally by the Segmentor class to leverage GPU/hardware acceleration
* when available on the target platform.
*/

struct PlatformAcceleratedEngineMac {
  tpxai::MetalEngineWrapper engine_;
  tpxai_metal_engine_config config_{};
};

}  // namespace mmhmm

#endif  // MEDIA_CAPTURE_VIDEO_SEGMENTOR_MAC_H_
