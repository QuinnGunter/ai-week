#pragma once
#include <memory>
#include "../common/power_monitor.h"
#include <functional>

namespace mmhmm {
class PowerObserver {
 public:
  virtual ~PowerObserver() {}
  static std::shared_ptr<PowerObserver> Create();
  static std::shared_ptr<PowerObserver> Create(
      std::function<void(PowerState)> power_state_changed,
      std::function<void(PowerMethod)> power_method_changed,
      std::function<void(LockState)> lock_state_changed);

  virtual void SetPowerMethodChangedCallback(
      std::function<void(PowerMethod)> power_method_changed) = 0;
  virtual void SetPowerStateChangedCallback(
      std::function<void(PowerState)> power_state_changed) = 0;
  virtual void SetLockStateChangedCallback(
      std::function<void(LockState)> lock_state_changed) = 0;
  virtual PowerMethod GetPowerMethod() const { return power_method_; }
  virtual PowerState GetPowerState() const { return power_state_; }
  virtual LockState GetLockState() const { return lock_state_; }

 protected:
  PowerMethod power_method_ = PowerMethod::Unknown;
  PowerState power_state_ = PowerState::Unknown;
  LockState lock_state_ = LockState::Unknown;

  std::function<void(PowerMethod)> power_method_changed_callback_;
  std::function<void(PowerState)> power_state_changed_callback_;
  std::function<void(LockState)> lock_state_changed_callback_;
};
}  // namespace mmhmm
