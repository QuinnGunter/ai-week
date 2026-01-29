//
// mmhmm
// Copyright � 2020-2022 mmhmm, inc. All rights reserved.
//
#ifndef CONTENT_BROWSER_RENDERER_HOST_IPC_WRITER_WIN_H_
#define CONTENT_BROWSER_RENDERER_HOST_IPC_WRITER_WIN_H_

#include <cstdint>
#include "base/memory/raw_ptr.h"

#include "third_party/mmhmmCameraClient/include/IDriverClient.h"

namespace mmhmm {

  using mmhmmCamera::implementation::IDriverClient;

class IpcWriterWin {
 public:
  IpcWriterWin();
  ~IpcWriterWin();

  bool Initialize();
  bool SendFrame(void* data, uint32_t size, uint32_t stride);
  bool IsOpen();

 private:
  raw_ptr<IDriverClient> driverClient_;
};

}  // namespace mmhmm

#endif  // CONTENT_BROWSER_RENDERER_HOST_IPC_WRITER_WIN_H_
