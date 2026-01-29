#pragma once
#include <functional>
#include "power_observer.h"

namespace mmhmm {
class PowerObserverMac : public PowerObserver {
 public:
  PowerObserverMac() {}
  PowerObserverMac(std::function<void(PowerState)> power_state_changed,
                   std::function<void(PowerMethod)> power_method_changed,
                   std::function<void(LockState)> lock_state_changed) {}
  PowerObserverMac(const PowerObserverMac&) = delete;
  PowerObserverMac& operator=(const PowerObserverMac&) = delete;

  void SetPowerMethodChangedCallback(
      std::function<void(PowerMethod)> power_method_changed) override {}
  void SetPowerStateChangedCallback(
      std::function<void(PowerState)> power_state_changed) override {}
  void SetLockStateChangedCallback(
      std::function<void(LockState)> lock_state_changed) override {}
};
}  // namespace mmhmm
