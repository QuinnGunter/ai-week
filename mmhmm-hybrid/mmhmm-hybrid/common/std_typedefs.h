#pragma once

#include <string>
#include <vector>
#include <unordered_map>
#include <any>

namespace mmhmm {
  using StdDictionary = std::unordered_map<std::string, std::any>;
  using StdList = std::vector<std::any>;
}
