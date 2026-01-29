#include "hot_key_manager.h"
#include <vector>

namespace mmhmm {
HotkeyManager::HotkeyManager(HWND hwnd) : hwnd_(hwnd) {}

HotkeyManager::~HotkeyManager() {
  UnregisterAll();
}

bool HotkeyManager::Register(const Hotkey& hotkey) {
  int id = static_cast<int>(hotkey.GetAction());
  if (!hotkey.IsValid())
    return false;

  if (::RegisterHotKey(hwnd_, id, hotkey.GetModifiers(),
                       hotkey.GetVirtualKey())) {
    hotkeys_[hotkey.GetAction()] = hotkey;
    return true;
  }
  return false;
}

bool HotkeyManager::Unregister(Action action) {
  int id = static_cast<int>(action);
  if (::UnregisterHotKey(hwnd_, id)) {
    hotkeys_.erase(action);
    return true;
  }
  return false;
}

bool HotkeyManager::Update(const Hotkey& hotkey) {
  bool unregistered = Unregister(hotkey.GetAction());
  if (!unregistered) {
    return false;
  }
  return Register(hotkey);
}

void HotkeyManager::UnregisterAll() {
  for (auto it = hotkeys_.begin(); it != hotkeys_.end();) {
    int id = static_cast<int>(it->first);
    ::UnregisterHotKey(hwnd_, id);
    it = hotkeys_.erase(it);
  }
}

bool HotkeyManager::IsRegistered(Action action) const {
  return hotkeys_.count(action) > 0;
}

const Hotkey* HotkeyManager::GetHotkey(Action action) const {
  auto it = hotkeys_.find(action);
  return it != hotkeys_.end() ? &it->second : nullptr;
}

bool HotkeyManager::UpdateOrRegister(const Hotkey& hotkey) {
  if (IsRegistered(hotkey.GetAction())) {
    return Update(hotkey);
  } else {
    return Register(hotkey);
  }
}
}  // namespace mmhmm
