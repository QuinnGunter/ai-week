//
// mmhmm Windows
// Copyright � 2020-2022 mmhmm, inc. All rights reserved.
//

#include "content/browser/renderer_host/mapped_memory_impl.h"

#include <utility>
#include "base/functional/bind.h"
#include "base/location.h"
#include "base/pickle.h"
#include "base/strings/utf_string_conversions.h"
#include "base/task/sequenced_task_runner.h"
#include "build/build_config.h"
#include "mojo/public/cpp/bindings/callback_helpers.h"
#include "mojo/public/cpp/bindings/self_owned_receiver.h"
#include "mojo/public/cpp/system/platform_handle.h"

namespace content {

MappedMemoryImpl::MappedMemoryImpl() {}
MappedMemoryImpl::~MappedMemoryImpl() = default;

void MappedMemoryImpl::Create(
    mojo::PendingReceiver<blink::mojom::MappedMemory> receiver) {
  mojo::MakeSelfOwnedReceiver(std::make_unique<MappedMemoryImpl>(),
                              std::move(receiver));
}

void MappedMemoryImpl::Dispose(const std::string& name, DisposeCallback callback) {
  std::move(callback).Run(true);
}

void MappedMemoryImpl::Initialize(InitializeCallback callback) {
  bool result = ipcWriter_.Initialize();
  std::move(callback).Run(result);
}

void MappedMemoryImpl::SendHandle(::gfx::GpuMemoryBufferHandle gmb_handle) {
  if (gmb_handle.is_null()) {
    DLOG(ERROR) << "No valid gpu handle.";
    return;
  }
#if BUILDFLAG(IS_WIN)
  if (!gmb_handle.region().IsValid()) {
	DLOG(ERROR) << "No valid shared memory region.";
	return;
  }
  
  auto mapper = gmb_handle.region().Map();
  
  ipcWriter_.SendFrame(mapper.memory(), gmb_handle.region().GetSize(),
                       gmb_handle.stride);
#endif
#if BUILDFLAG(IS_APPLE)
  ipcWriter_.SendFrame(gmb_handle.io_surface().get());
#endif
}
}  // namespace content
