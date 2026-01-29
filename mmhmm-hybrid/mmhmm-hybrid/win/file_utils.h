#pragma once
#include "string"

#include <Windows.h>

namespace mmhmm {
  namespace files {
    struct SaveFileNameResult {
      std::wstring filename = {};
      bool successful = false;
    };
    bool WriteStringToFile(std::wstring data, std::wstring filepath);
    bool OpenFileInExplorer(std::wstring filepath);
    SaveFileNameResult GetSaveFileNameFromDialog(HWND parent, std::wstring filename, std::wstring extensions);
  }
}
