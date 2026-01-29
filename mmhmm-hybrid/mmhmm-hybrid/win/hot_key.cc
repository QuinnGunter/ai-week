#include <algorithm>
#include <cctype>
#include <sstream>
#include "hot_key.h"

namespace mmhmm {
Hotkey::Hotkey(Action action, const std::string& combo) : action_(action) {
  Parse(combo);
}

bool Hotkey::Parse(const std::string& combo) {
  modifiers_ = 0;
  vk_ = 0;
  original_ = combo;

  const auto modifierMap = BuildModifierMap();
  const auto specialKeys = BuildSpecialKeyMap();

  auto isSingleChar = [](const std::string& s) { return s.length() == 1; };

  auto resolveSingleCharVK = [](char c) -> std::optional<SHORT> {
    SHORT vk = VkKeyScanA(c);
    return (vk == -1) ? std::nullopt : std::optional<SHORT>{vk};
  };

  std::istringstream ss(combo);
  std::string token;

  while (std::getline(ss, token, '+')) {
    std::string part = Trim(token);

    if (auto modIt = modifierMap.find(part); modIt != modifierMap.end()) {
      modifiers_ |= modIt->second;
      continue;
    }

    if (auto specialIt = specialKeys.find(part);
        specialIt != specialKeys.end()) {
      vk_ = specialIt->second;
      continue;
    }

    if (isSingleChar(part)) {
      auto vkOpt = resolveSingleCharVK(part[0]);
      if (!vkOpt)
        return false;
      vk_ = LOBYTE(*vkOpt);
      continue;
    }

    return false;
  }

  return modifiers_ != 0 && vk_ != 0;
}

bool Hotkey::IsValid() const {
  return modifiers_ != 0 && vk_ != 0;
}

std::string Hotkey::Trim(const std::string& str) {
  auto start = str.find_first_not_of(" \t");
  auto end = str.find_last_not_of(" \t");
  return (start == std::string::npos) ? "" : str.substr(start, end - start + 1);
}

std::unordered_map<std::string, UINT> Hotkey::BuildModifierMap() {
  return {{"Ctrl", MOD_CONTROL},
          {"Alt", MOD_ALT},
          {"Shift", MOD_SHIFT},
          {"Win", MOD_WIN}};
}

std::unordered_map<std::string, UINT> Hotkey::BuildSpecialKeyMap() {
  std::unordered_map<std::string, UINT> map = {
      {"Esc", VK_ESCAPE},  {"Enter", VK_RETURN}, {"Tab", VK_TAB},
      {"Space", VK_SPACE}, {"Up", VK_UP},        {"Down", VK_DOWN},
      {"Left", VK_LEFT},   {"Right", VK_RIGHT},  {"Del", VK_DELETE},
      {"Ins", VK_INSERT},  {"Home", VK_HOME},    {"End", VK_END},
      {"PgUp", VK_PRIOR},  {"PgDn", VK_NEXT}};

  for (int i = 0; i <= 9; ++i) {
    map["Num " + std::to_string(i)] = VK_NUMPAD0 + i;
  }

  for (int i = 1; i <= 24; ++i) {
    map["F" + std::to_string(i)] = VK_F1 + (i - 1);
  }

  return map;
}
}  // namespace mmhmm
