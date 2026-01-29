#include "utils.h"
#include "objbase.h"

namespace mmhmm {
namespace utils {
HANDLE SetClipboardDataEx(UINT format, void* data, DWORD size) {
  if (format == CF_BITMAP || format == CF_DSPBITMAP || format == CF_PALETTE ||
      format == CF_METAFILEPICT || format == CF_DSPMETAFILEPICT ||
      format == CF_ENHMETAFILE || format == CF_DSPENHMETAFILE ||
      format == CF_OWNERDISPLAY) {
    return NULL;  // these are not HGLOBAL format
  }
  HANDLE handle = NULL;
  HGLOBAL global_handle =
      GlobalAlloc(GMEM_MOVEABLE | GMEM_SHARE | GMEM_ZEROINIT, size);
  if (global_handle) {
    void* locked_memory = GlobalLock(global_handle);
    if (locked_memory) {
      CopyMemory(locked_memory, data, size);
      GlobalUnlock(global_handle);
      handle = SetClipboardData(format, global_handle);
    }
    if (!handle) {
      GlobalFree(locked_memory);
    }
  }
  return handle;
}

bool IsWindowMaximized(HWND handle) {
  WINDOWPLACEMENT placement = { 0 };
  placement.length = sizeof(WINDOWPLACEMENT);
  if (GetWindowPlacement(handle, &placement)) {
    return placement.showCmd == SW_SHOWMAXIMIZED;
  }
  return false;
}

std::wstring GenerateGuidString() {

  GUID guid;
  if (SUCCEEDED(CoCreateGuid(&guid))) {
    wchar_t guid_string[39];
    if (StringFromGUID2(guid, guid_string, 39) > 0) {
      return std::wstring(guid_string);
    }
  }

  return std::wstring();
}

}  // namespace utils
}  // namespace mmhmm
