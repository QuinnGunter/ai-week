// Copyright (c) 2022 The Chromium Embedded Framework Authors. All rights
// reserved. Use of this source code is governed by a BSD-style license that
// can be found in the LICENSE file.

#pragma once

#include <string>
#include <vector>

namespace client {

template <typename S1, typename S2>
auto PickOrUseDefault(const S1& value, const S2& fallback) {
  return value.empty() ? fallback : value;
}

// Convert |str| to lowercase.
std::string ToLower(const std::string& str);

// Convert |wstr| to lowercase.
std::wstring ToLower(const std::wstring& str);

// Replace all instances of |from| with |to| in |str|.
std::string AsciiStrReplace(const std::string& str,
                            const std::string& from,
                            const std::string& to);

bool ContainsPhraseInVectorW(const std::vector<std::wstring>& vec,
                             const std::wstring& phrase);

bool ContainsPhraseInVectorA(const std::vector<std::string>& vec,
                             const std::string& phrase);

std::wstring ToWideString(std::string string);
std::string ToNarrowString(std::wstring string);

}  // namespace client
