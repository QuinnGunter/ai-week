#include "power_monitor.h"

namespace mmhmm {
const std::string PowerMonitor::dictionaryKey = "powerMonitor";
const std::string PowerMonitor::powerMethodKey = "powerMethod";
const std::string PowerMonitor::powerStateKey = "powerState";
const std::string PowerMonitor::lockStateKey = "lockState";
const std::string PowerMonitor::unknownStateString = "Unknown";
const std::string PowerMonitor::suspendedStateString = "Suspended";
const std::string PowerMonitor::normalStateString = "Normal";
const std::string PowerMonitor::shutdownStateString = "Shutdown";
const std::string PowerMonitor::unknownMethodString = "Unknown";
const std::string PowerMonitor::acMethodString = "AC";
const std::string PowerMonitor::batteryMethodString = "Battery";
const std::string PowerMonitor::unknownLockStateString = "Unknown";
const std::string PowerMonitor::lockedStateString = "Locked";
const std::string PowerMonitor::unlockedStateString = "Unlocked";

CefString PowerStateToString(PowerState power_state) {
  switch (power_state) {
    case mmhmm::PowerState::Unknown:
      return PowerMonitor::unknownStateString;
    case mmhmm::PowerState::Suspended:
      return PowerMonitor::suspendedStateString;
    case mmhmm::PowerState::Normal:
      return PowerMonitor::normalStateString;
    case mmhmm::PowerState::Shutdown:
      return PowerMonitor::shutdownStateString;
    default: {
      DCHECK(false);
      return PowerMonitor::unknownStateString;
    }
  }
}
PowerState PowerStateFromString(CefString string) {
  if (string == PowerMonitor::unknownStateString)
    return PowerState::Unknown;
  if (string == PowerMonitor::suspendedStateString)
    return PowerState::Suspended;
  if (string == PowerMonitor::normalStateString)
    return PowerState::Normal;
  if (string == PowerMonitor::shutdownStateString)
    return PowerState::Shutdown;

  DCHECK(false);
  return PowerState::Unknown;
}

std::optional<PowerState> PowerStateFromCefDictionary(
  CefRefPtr<CefDictionaryValue> dictionary) {
  if (!dictionary)
    return std::nullopt;

  if (dictionary->HasKey(PowerMonitor::powerStateKey)) {
    return PowerState{dictionary->GetInt(PowerMonitor::powerStateKey)};
  }

  return std::nullopt;
}

CefString PowerMethodToString(PowerMethod power_method) {
  switch (power_method) {
    case mmhmm::PowerMethod::Unknown:
      return PowerMonitor::unknownMethodString;
    case mmhmm::PowerMethod::AC:
      return PowerMonitor::acMethodString;
    case mmhmm::PowerMethod::Battery:
      return PowerMonitor::batteryMethodString;
    default: {
      DCHECK(false);
      return PowerMonitor::unknownMethodString;
    }
  }
}

PowerMethod PowerMethodFromString(CefString string) {
  if (string == PowerMonitor::unknownMethodString)
    return PowerMethod::Unknown;
  if (string == PowerMonitor::acMethodString)
    return PowerMethod::AC;
  if (string == PowerMonitor::batteryMethodString)
    return PowerMethod::Battery;

  DCHECK(false);
  return PowerMethod::Unknown;
}

std::optional<PowerMethod> PowerMethodFromCefDictionary(
    CefRefPtr<CefDictionaryValue> dictionary) {
  if (!dictionary)
    return std::nullopt;

  if (dictionary->HasKey(PowerMonitor::powerMethodKey)) {
    return PowerMethod{dictionary->GetInt(PowerMonitor::powerMethodKey)};
  }

  return std::nullopt;
}

CefString LockStateToString(LockState lock_state) {
  switch (lock_state) {
    case mmhmm::LockState::Unknown:
      return PowerMonitor::unknownLockStateString;
    case mmhmm::LockState::Locked:
      return PowerMonitor::lockedStateString;
    case mmhmm::LockState::Unlocked:
      return PowerMonitor::unlockedStateString;
    default: {
      DCHECK(false);
      return PowerMonitor::unknownLockStateString;
    }
  }
}

LockState LockStateFromString(CefString string) {
  if (string == PowerMonitor::unknownLockStateString)
    return LockState::Unknown;
  if (string == PowerMonitor::lockedStateString)
    return LockState::Locked;
  if (string == PowerMonitor::unlockedStateString)
    return LockState::Unlocked;

  DCHECK(false);
  return LockState::Unknown;
}

std::optional<LockState> LockStateFromCefDictionary(
    CefRefPtr<CefDictionaryValue> dictionary) {
  if (!dictionary)
    return std::nullopt;

  if (dictionary->HasKey(PowerMonitor::lockStateKey)) {
    return LockState{dictionary->GetInt(PowerMonitor::lockStateKey)};
  }

  return std::nullopt;
}

CefRefPtr<CefDictionaryValue> PowerMonitor::ToCefDictionary() const {
  CefRefPtr<CefDictionaryValue> dictionary = CefDictionaryValue::Create();
  dictionary->SetInt(powerMethodKey, static_cast<int>(powerMethod));
  dictionary->SetInt(powerStateKey, static_cast<int>(powerState));
  dictionary->SetInt(lockStateKey, static_cast<int>(lockState));
  return dictionary;
}

void PowerMonitor::FromCefDictionary(CefRefPtr<CefDictionaryValue> dictionary) {
  if (!dictionary)
    return;

  if (dictionary->HasKey(powerMethodKey)) {
    powerMethod = PowerMethod{dictionary->GetInt(powerMethodKey)};
  }
  if (dictionary->HasKey(powerStateKey)) {
    powerState = PowerState{dictionary->GetInt(powerStateKey)};
  }
  if (dictionary->HasKey(lockStateKey)) {
    lockState = LockState{dictionary->GetInt(lockStateKey)};
  }
}
}  // namespace mmhmm
