//
// mmhmm Windows
// Copyright � 2020-2022 mmhmm, inc. All rights reserved.
//
#ifndef CONTENT_BROWSER_RENDERER_HOST_MAPPED_MEMORY_IMPL_H_
#define CONTENT_BROWSER_RENDERER_HOST_MAPPED_MEMORY_IMPL_H_

#include <memory>
#include <string>
#include "build/build_config.h"
#include "content/browser/renderer_host/ipc_writer.h"
#include "content/common/content_export.h"
#include "mojo/public/cpp/base/big_buffer.h"
#include "mojo/public/cpp/bindings/receiver.h"
#include "third_party/blink/public/mojom/mappedmemory/mapped_memory.mojom.h"

namespace content {

class CONTENT_EXPORT MappedMemoryImpl : public blink::mojom::MappedMemory {
 public:
  MappedMemoryImpl();
  ~MappedMemoryImpl() override;

  static void Create(
      mojo::PendingReceiver<blink::mojom::MappedMemory> receiver);

 private:
  void Dispose(const std::string& name, DisposeCallback callback) override;

  void Initialize(InitializeCallback callback) override;
  void SendHandle(::gfx::GpuMemoryBufferHandle gmb_handle) override;

 private:
  mmhmm::IpcWriter ipcWriter_;
};

}  // namespace content

#endif  // CONTENT_BROWSER_RENDERER_HOST_MAPPED_MEMORY_IMPL_H_
