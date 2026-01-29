#pragma once
#include "power_observer.h"
#include <functional>

namespace mmhmm {
class PowerObserverWin : public PowerObserver {
 public:
  PowerObserverWin();
  PowerObserverWin(std::function<void(PowerState)> power_state_changed,
                   std::function<void(PowerMethod)> power_method_changed,
                   std::function<void(LockState)> lock_state_changed);
  PowerObserverWin(const PowerObserverWin&) = delete;
  PowerObserverWin& operator=(const PowerObserverWin&) = delete;

  void SetPowerMethodChangedCallback(
      std::function<void(PowerMethod)> power_method_changed) override;
  void SetPowerStateChangedCallback(
      std::function<void(PowerState)> power_state_changed) override;
  void SetLockStateChangedCallback(
      std::function<void(LockState)> lock_state_changed) override;

 private:
  void Initialize();
  static LRESULT CALLBACK WndProcStatic(HWND hwnd,
                                        UINT message,
                                        WPARAM wparam,
                                        LPARAM lparam);

  LRESULT CALLBACK WndProc(HWND hwnd,
                           UINT message,
                           WPARAM wparam,
                           LPARAM lparam);

  PowerMethod GetBatteryPowerMethod() const;
  bool IsCurrentSession(const DWORD session_id) const;
  void PowerStateChanged(const PowerState state);
  void PowerMethodChanged(const PowerMethod method);
  void LockStateChanged(const LockState state);

 private:
  ATOM atom_;
  HMODULE instance_;
  HWND window_;

  std::function<void(PowerMethod)> power_method_changed_callback_;
  std::function<void(PowerState)> power_state_changed_callback_;
  std::function<void(LockState)> lock_state_changed_callback_;
};
}  // namespace mmhmm
