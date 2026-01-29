//
// mmhmm
// Copyright © 2020-2022 mmhmm, inc. All rights reserved.
//
#include "ipc_writer_win.h"
#include "base/logging.h"
#include "third_party/mmhmmCameraClient/include/CameraEnums.h"

namespace mmhmm
{
  const int BUFFER_COUNT = 10;
  const int BUFFER_WIDTH = 1920;
  const int BUFFER_HEIGHT = 1080;

  IpcWriterWin::IpcWriterWin() : driverClient_(nullptr)
  {

  }

  IpcWriterWin::~IpcWriterWin() {
    if (driverClient_) {
      delete driverClient_;
      driverClient_ = nullptr;
    }
  }

  bool IpcWriterWin::Initialize() {
    driverClient_ = IDriverClient::CreateDriverClient(
        BUFFER_WIDTH, BUFFER_HEIGHT, mmhmmCamera::implementation::CameraFormat::NV12, BUFFER_COUNT);

    return driverClient_ != nullptr;
  }

  bool IpcWriterWin::SendFrame(void* data, uint32_t size, uint32_t stride) {

    if (!driverClient_) {
      return false;
    }

    // Note about stride.
    // On Windows we can receive buffer only from gmbHandle which is texture or
    // cpu buffer from copy back. Both DirectX11 and DirectX12 doesn't have native support,
    // for any 3 planar formats like I420. Even if Chromium will support HDR formats like P010 or P016
    // we will still receive 2 planes format. Including NV12. Also stride for those formats it's the same plane1Stride = plane2Stride.
    // That's why gfx::GmbHandle structure contains only one parameter for stride.
    if (driverClient_->IsReady()) {
      driverClient_->SendBuffer((uint8_t*)data, (size_t)size, BUFFER_WIDTH,
                                BUFFER_HEIGHT, stride, stride);
    }

    return true;
  }

  bool IpcWriterWin::IsOpen() {
    if (!driverClient_) {
      return false;
    }

    return driverClient_->IsReady();
  }
}
