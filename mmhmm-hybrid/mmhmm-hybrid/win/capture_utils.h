#pragma once
#include <windows.h>
#include <vector>

namespace mmhmm {
enum class CaptureStrategy {
  BitBltOnly,
  PrintWindowThenBitBlt,
  HostWindowBitBlt
};

bool CaptureWithStrategy(HWND hwnd,
                         int width,
                         int height,
                         CaptureStrategy strategy,
                         std::vector<unsigned char>& out_bitmap);
bool CaptureWindowToBitmap(HWND hwnd, std::vector<unsigned char>& out_bitmap);
bool CaptureHostToBitmap(HWND host_hwnd,
                         std::vector<unsigned char>& out_bitmap);
}  // namespace mmhmm
