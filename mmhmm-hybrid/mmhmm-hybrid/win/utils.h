//
// mmhmm Windows
// Copyright © 2020-2024 mmhmm, inc. All rights reserved.
//
#pragma once
#include <Windows.h>
#include <string>

namespace mmhmm {
namespace utils {
HANDLE SetClipboardDataEx(UINT format, void* data, DWORD size);
bool IsWindowMaximized(HWND handle);
std::wstring GenerateGuidString();

}
}  // namespace mmhmm