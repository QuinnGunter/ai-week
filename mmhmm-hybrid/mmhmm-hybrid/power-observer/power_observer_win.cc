#include "power_observer_win.h"
#include "wtsapi32.h"
#include "../browser/main_context.h"

namespace mmhmm {
const wchar_t kPowerObserverClass[] = L"PowerObserverWindowHost";

HMODULE GetModuleFromWndProc(WNDPROC window_proc) {
  HMODULE instance = nullptr;
  void* address = reinterpret_cast<void*>(window_proc);
  if (!GetModuleHandleEx(GET_MODULE_HANDLE_EX_FLAG_FROM_ADDRESS |
                             GET_MODULE_HANDLE_EX_FLAG_UNCHANGED_REFCOUNT,
                         static_cast<wchar_t*>(address), &instance)) {
    NOTREACHED();
  }
  return instance;
}

PowerObserverWin::PowerObserverWin() {
  Initialize();
}

PowerObserverWin::PowerObserverWin(
    std::function<void(PowerState)> power_state_changed,
    std::function<void(PowerMethod)> power_method_changed,
    std::function<void(LockState)> lock_state_changed)
    : power_state_changed_callback_(power_state_changed),
      power_method_changed_callback_(power_method_changed),
      lock_state_changed_callback_(lock_state_changed) {
  Initialize();
}

void PowerObserverWin::Initialize() {
  WNDCLASSEX window_class = {0};
  window_class.cbSize = sizeof(WNDCLASSEX);
  window_class.style = 0;
  window_class.lpfnWndProc = PowerObserverWin::WndProcStatic;
  window_class.hInstance =
      GetModuleFromWndProc(PowerObserverWin::WndProcStatic);
  window_class.lpszClassName = kPowerObserverClass;
  atom_ = RegisterClassEx(&window_class);
  instance_ = window_class.hInstance;

  window_ = CreateWindow(MAKEINTATOM(atom_), 0, 0, 0, 0, 0, 0, nullptr, 0,
                         instance_, 0);
  SetWindowLongPtr(window_, GWLP_USERDATA, reinterpret_cast<LONG_PTR>(this));

  if (!WTSRegisterSessionNotification(window_, NOTIFY_FOR_ALL_SESSIONS)) {
    LOG(ERROR) << "WTSRegisterSessionNotification failed with error code " << GetLastError();
  }

  if(RegisterSuspendResumeNotification(static_cast<HANDLE>(window_),
                                         DEVICE_NOTIFY_WINDOW_HANDLE) == nullptr) {
    LOG(ERROR) << "RegisterSuspendResumeNotification failed with error code "
               << GetLastError();
  }

  // There is no api calls for determining the lock or sleep state.
  // Since the code is running assume we are in a 'normal' state.
  power_state_ = PowerState::Normal;
  lock_state_ = LockState::Unlocked;
  power_method_ = GetBatteryPowerMethod();
}

void PowerObserverWin::SetPowerMethodChangedCallback(
    std::function<void(PowerMethod)> power_method_changed) {
  power_method_changed_callback_ = power_method_changed;
}

void PowerObserverWin::SetPowerStateChangedCallback(
    std::function<void(PowerState)> power_state_changed) {
  power_state_changed_callback_ = power_state_changed;
}

void PowerObserverWin::SetLockStateChangedCallback(
    std::function<void(LockState)> lock_state_changed) {
  lock_state_changed_callback_ = lock_state_changed;
}

PowerMethod PowerObserverWin::GetBatteryPowerMethod() const {
  SYSTEM_POWER_STATUS status;
  if (!GetSystemPowerStatus(&status)) {
    return PowerMethod::Unknown;
  }
  return (status.ACLineStatus == 0) ? PowerMethod::Battery : PowerMethod::AC;
}

LRESULT CALLBACK PowerObserverWin::WndProcStatic(HWND hwnd,
                                                 UINT message,
                                                 WPARAM wparam,
                                                 LPARAM lparam) {
  auto* msg_wnd = reinterpret_cast<PowerObserverWin*>(
      GetWindowLongPtr(hwnd, GWLP_USERDATA));
  if (msg_wnd)
    return msg_wnd->WndProc(hwnd, message, wparam, lparam);
  else
    return ::DefWindowProc(hwnd, message, wparam, lparam);
}

LRESULT CALLBACK PowerObserverWin::WndProc(HWND hwnd,
                                           UINT message,
                                           WPARAM wparam,
                                           LPARAM lparam) {
  if (message == WM_WTSSESSION_CHANGE) {
    const bool should_treat_as_current_session =
        IsCurrentSession(static_cast<DWORD>(lparam));

    if (should_treat_as_current_session) {
      if (wparam == WTS_SESSION_LOCK) {
        LockStateChanged(LockState::Locked);
      } else if (wparam == WTS_SESSION_UNLOCK) {
        LockStateChanged(LockState::Unlocked);
      }
    }
  } else if (message == WM_POWERBROADCAST) {
    if (wparam == PBT_APMRESUMEAUTOMATIC || wparam == PBT_APMRESUMECRITICAL ||
        wparam == PBT_APMRESUMESUSPEND) {
      PowerStateChanged(PowerState::Normal);
    } else if (wparam == PBT_APMSUSPEND) {
      PowerStateChanged(PowerState::Suspended);
    } else if (wparam == PBT_APMPOWERSTATUSCHANGE ||
               wparam == PBT_POWERSETTINGCHANGE) {
      PowerMethodChanged(GetBatteryPowerMethod());
    }
  } else if (message == WM_ENDSESSION) {
    PowerStateChanged(PowerState::Shutdown);
  }
  return ::DefWindowProc(hwnd, message, wparam, lparam);
}

bool PowerObserverWin::IsCurrentSession(DWORD session_id) const {
  DWORD current_session_id = 0;
  if (!ProcessIdToSessionId(GetCurrentProcessId(), &current_session_id)) {
    auto logger = MainContext::Get()->GetLogger();
    if (logger) {
      logger->warn("ProcessIdToSessionId failed, assuming current session");
    }
    return false;
  } else {
    return (session_id == current_session_id);
  }
}

void PowerObserverWin::PowerStateChanged(const PowerState state) {
  if (power_state_ == state)
    return;

  power_state_ = state;

  if (power_state_changed_callback_) {
    power_state_changed_callback_(state);
  }

  auto logger = MainContext::Get()->GetLogger();
  if (logger) {
    logger->info("Power State changed to {}",
                 mmhmm::PowerStateToString(state).ToString());
  }
}

void PowerObserverWin::PowerMethodChanged(
    const PowerMethod method) {
  if (power_method_ == method)
    return;

  power_method_ = method;

  if (power_method_changed_callback_) {
    power_method_changed_callback_(method);
  }

  auto logger = MainContext::Get()->GetLogger();
  if (logger) {
    logger->info("Power Method changed to {}",
                 mmhmm::PowerMethodToString(method).ToString());
  }
}

void PowerObserverWin::LockStateChanged(const LockState state) {
  if (lock_state_ == state)
    return;

  lock_state_ = state;

  if (lock_state_changed_callback_) {
    lock_state_changed_callback_(state);
  }

  auto logger = MainContext::Get()->GetLogger();
  if (logger) {
    logger->info("Lock State changed to {}",
                 mmhmm::LockStateToString(state).ToString());
  }
}
}  // namespace mmhmm
