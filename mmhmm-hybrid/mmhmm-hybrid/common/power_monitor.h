#pragma once

#include "include/cef_values.h"
#include "include/internal/cef_ptr.h"
#include <optional>

namespace mmhmm {
  enum class PowerState {
    Unknown,
    Suspended,
    Normal,
    Shutdown
};

  CefString PowerStateToString(PowerState power_state);
  PowerState PowerStateFromString(CefString string);
  std::optional<PowerState> PowerStateFromCefDictionary(
      CefRefPtr<CefDictionaryValue> dictionary);

  enum class PowerMethod {
    Unknown,
    AC,
    Battery
  };

  CefString PowerMethodToString(PowerMethod power_method);
  PowerMethod PowerMethodFromString(CefString string);
  std::optional<PowerMethod> PowerMethodFromCefDictionary(
      CefRefPtr<CefDictionaryValue> dictionary);

  enum class LockState {
    Unknown,
    Locked,
    Unlocked
  };

  CefString LockStateToString(LockState lock_state);
  LockState LockStateFromString(CefString string);
  std::optional<LockState> LockStateFromCefDictionary(
      CefRefPtr<CefDictionaryValue> dictionary);

  struct PowerMonitor {
  static const std::string dictionaryKey;
  static const std::string powerMethodKey;
  static const std::string powerStateKey;
  static const std::string lockStateKey;
  static const std::string unknownStateString;
  static const std::string suspendedStateString;
  static const std::string normalStateString;
  static const std::string shutdownStateString;
  static const std::string unknownMethodString;
  static const std::string acMethodString;
  static const std::string batteryMethodString;
  static const std::string unknownLockStateString;
  static const std::string lockedStateString;
  static const std::string unlockedStateString;

  PowerMonitor() {}
  PowerMonitor(CefRefPtr<CefDictionaryValue> dictionary) {
    FromCefDictionary(dictionary);
  }

  // Determines whether the machine is on battery.
  PowerMethod powerMethod = PowerMethod::Unknown;

  // Determines the running power state of the machine.
  // Suspended, Normal or Shutdown.
  PowerState powerState = PowerState::Unknown;

  // Determines whether the machine is locked or not.
  LockState lockState = LockState::Unlocked;

  CefRefPtr<CefDictionaryValue> ToCefDictionary() const;
  void FromCefDictionary(CefRefPtr<CefDictionaryValue> dictionary);
};
}  // namespace mmhmm
