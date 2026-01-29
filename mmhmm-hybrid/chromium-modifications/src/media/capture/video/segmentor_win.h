#ifndef MEDIA_CAPTURE_VIDEO_SEGMENTOR_WIN_H_
#define MEDIA_CAPTURE_VIDEO_SEGMENTOR_WIN_H_

#include "directx/dx_engine_wrapper.hpp"

namespace mmhmm {

/**
* Platform-specific accelerated processing engine for hardware-optimized segmentation.
* Wraps DirectX-based acceleration functionality with associated configuration.
* Used internally by the Segmentor class to leverage GPU/hardware acceleration
* when available on the target platform.
*/ 

struct PlatformAcceleratedEngineWin {
  seglib::dx::DXEngineWrapper engine_;
  seglib_dx_engine_config config_{};
};

}  // namespace mmhmm
#endif 
