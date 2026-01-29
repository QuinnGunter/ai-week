#pragma once

#include <string>
#include <stdexcept>

#include "Windows.h"

namespace mmhmm::segmentation::warmup {
inline std::pair<std::string, std::wstring> GetExecutablePath() {
  std::pair<std::string, std::wstring> paths;
  char utf_buffer[MAX_PATH];
  DWORD length = GetModuleFileNameA(NULL, utf_buffer, MAX_PATH);
  if (length == 0) {
    throw std::runtime_error(
        "Unable to retreive application start up path! UTF.");
  }

  std::string utf_path(utf_buffer, length);
  size_t pos = utf_path.find_last_of("\\/");
  if (pos != std::string::npos) {
    paths.first = utf_path.substr(0, pos);
  } else {
    paths.first = utf_path;
  }

  wchar_t unicode_buffer[MAX_PATH];
  length = GetModuleFileNameW(NULL, unicode_buffer, MAX_PATH);
  if (length == 0) {
    throw std::runtime_error(
        "Unable to retreive application start up path! Unicode.");
  }

  std::wstring unicode_path(unicode_buffer, length);
  pos = unicode_path.find_last_of(L"\\/");
  if (pos != std::wstring::npos) {
    paths.second = unicode_path.substr(0, pos);
  } else {
    paths.second = unicode_path;
  }

  return paths;
}
}  // namespace mmhmm::segmentation::warmup