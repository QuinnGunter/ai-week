#include "image_loader.h"

#include "exceptions.h"
#include "../browser/util_win.h"

namespace mmhmm::controls {
ComPtr<IStream> ImageLoader::LoadImageAsStream(LPCTSTR name, LPCTSTR type) {
  auto handle = client::GetCodeModuleHandle();
  auto resource = FindResource(handle, name, type);
  ThrowIfNullptr(resource);
  unsigned long size = SizeofResource(handle, resource);
  if (!size)
    return nullptr;
  HGLOBAL loaded_resource = LoadResource(handle, resource);
  ThrowIfNullptr(loaded_resource);

  const void* locked_resource = LockResource(loaded_resource);
  ThrowIfNullptr(locked_resource);

  HGLOBAL buffer = GlobalAlloc(GMEM_MOVEABLE, size);
  ThrowIfNullptr(buffer);

  void* locked_buffer = GlobalLock(buffer);
  ThrowIfNullptr(locked_buffer);

  CopyMemory(locked_buffer, locked_resource, size);

  ComPtr<IStream> stream = NULL;
  HRESULT hr = CreateStreamOnHGlobal(buffer, false, stream.GetAddressOf());
  ThrowIfFailed(hr);

  return stream;
}
}  // namespace mmhmm
