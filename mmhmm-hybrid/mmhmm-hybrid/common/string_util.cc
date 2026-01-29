// Copyright (c) 2022 The Chromium Embedded Framework Authors. All rights
// reserved. Use of this source code is governed by a BSD-style license that
// can be found in the LICENSE file.

// we are going to silence codecvt deprecation warning on MacOS
// however we should consider using unified library for
// UNICODE manipulation like ICU
#ifdef __APPLE__
#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wdeprecated-declarations"
#endif

#include "tests/shared/common/string_util.h"

#include <algorithm>
#include <locale>
#include <codecvt>
#include "string_util.h"

namespace client {

std::string ToLower(const std::string& str) {
  std::string lowerStr = str;
  std::transform(lowerStr.begin(), lowerStr.end(), lowerStr.begin(), ::tolower);
  return lowerStr;
}

std::wstring ToLower(const std::wstring& str) {
  std::wstring lowerStr = str;
  std::transform(lowerStr.begin(), lowerStr.end(), lowerStr.begin(),
                 ::towlower);
  return lowerStr;
}

std::string AsciiStrReplace(const std::string& str,
                            const std::string& from,
                            const std::string& to) {
  std::string result = str;
  std::string::size_type pos = 0;
  std::string::size_type from_len = from.length();
  std::string::size_type to_len = to.length();
  do {
    pos = result.find(from, pos);
    if (pos != std::string::npos) {
      result.replace(pos, from_len, to);
      pos += to_len;
    }
  } while (pos != std::string::npos);
  return result;
}

bool ContainsPhraseInVectorW(const std::vector<std::wstring>& vec,
                             const std::wstring& phrase) {
  std::wstring lowerPhrase = ToLower(phrase);
  for (const auto& element : vec) {
    std::wstring lowerElement = ToLower(element);
    if (lowerElement.find(lowerPhrase) != std::wstring::npos) {
      return true;
    }
  }
  return false;
}

bool ContainsPhraseInVectorA(const std::vector<std::string>& vec,
                             const std::string& phrase) {
  std::string lowerPhrase = ToLower(phrase);
  for (const auto& element : vec) {
    std::string lowerElement = ToLower(element);
    if (lowerElement.find(lowerPhrase) != std::string::npos) {
      return true;
    }
  }
  return false;
}

std::wstring ToWideString(std::string string) {
  static std::wstring_convert<std::codecvt_utf8_utf16<wchar_t>> converter;
  return std::wstring(converter.from_bytes(string));
}

std::string ToNarrowString(std::wstring string) {
  static std::wstring_convert<std::codecvt_utf8<wchar_t>, wchar_t> converter;
  return converter.to_bytes(string);
}

}  // namespace client
#ifdef __APPLE__
#pragma clang diagnostic pop
#endif
