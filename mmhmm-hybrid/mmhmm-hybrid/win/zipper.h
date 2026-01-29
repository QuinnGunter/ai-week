#pragma once
#include <string>
#include <vector>

namespace mmhmm {
  namespace zip {
    void WriteZip(const std::wstring destination_filename, const std::vector<std::wstring> files);
  }
}