#pragma once
#include <Windows.h>
#include <string>
#include <unordered_map>
#include <optional>

namespace mmhmm {
enum class Action {
  CreateOrStopRecording,
  RecordEntireScreen,
  RecordWindow,
  LaunchRecorder
};

inline std::string ActionToString(Action action) {
  switch (action) {
    case Action::CreateOrStopRecording:
      return "createOrStopRecording";
    case Action::RecordEntireScreen:
      return "recordEntireScreen";
    case Action::RecordWindow:
      return "recordWindow";
    case Action::LaunchRecorder:
      return "launchRecorder";
    default:
      return "unknown";
  }
}

inline std::optional<Action> ActionFromString(const std::string& str) {
  if (str == "createOrStopRecording")
    return Action::CreateOrStopRecording;
  if (str == "recordEntireScreen")
    return Action::RecordEntireScreen;
  if (str == "recordWindow")
    return Action::RecordWindow;
  if (str == "launchRecorder")
    return Action::LaunchRecorder;
  return std::nullopt;
}

class Hotkey {
 public:
  Hotkey() = default;
  Hotkey(Action action, const std::string& combo);

  bool Parse(const std::string& combo);
  bool IsValid() const;

  UINT GetModifiers() const { return modifiers_; }
  UINT GetVirtualKey() const { return vk_; }
  std::string GetOriginalString() const { return original_; }
  Action GetAction() const { return action_; }

 private:
  UINT modifiers_ = 0;
  UINT vk_ = 0;
  std::string original_;
  Action action_;

  static std::string Trim(const std::string& str);
  static std::unordered_map<std::string, UINT> BuildModifierMap();
  static std::unordered_map<std::string, UINT> BuildSpecialKeyMap();
};
}  // namespace mmhmm
