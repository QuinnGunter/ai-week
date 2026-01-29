#include "power_observer.h"

#if defined(OS_WIN)
#include "power_observer_win.h"
#elif defined(OS_MAC)
#include "power_observer_mac.h"
#endif

namespace mmhmm {
std::shared_ptr<PowerObserver> PowerObserver::Create() {
#if defined(OS_WIN)
  return std::make_shared<PowerObserverWin>();
#elif defined(OS_MAC)
  return std::make_shared<PowerObserverMac>();
#else
#error Unsupported platform
#endif
}

std::shared_ptr<PowerObserver> PowerObserver::Create(
    std::function<void(PowerState)> power_state_changed,
    std::function<void(PowerMethod)> power_method_changed,
    std::function<void(LockState)> lock_state_changed) {
#if defined(OS_WIN)
  return std::make_shared<PowerObserverWin>(
      power_state_changed, power_method_changed, lock_state_changed);
#elif defined(OS_MAC)
  return std::make_shared<PowerObserverMac>(
      power_state_changed, power_method_changed, lock_state_changed);
#else
#error Unsupported platform
#endif
}
}  // namespace mmhmm
