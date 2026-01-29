#pragma once
#include <Windows.h>
#include <unordered_map>
#include "hot_key.h"

namespace mmhmm {
class HotkeyManager {
 public:
  HotkeyManager(HWND hwnd);
  ~HotkeyManager();

  bool Register(const Hotkey& hotkey);
  bool Unregister(Action action);
  bool Update(const Hotkey& hotkey);
  void UnregisterAll();
  bool UpdateOrRegister(const Hotkey& hotkey);
  bool IsRegistered(Action action) const;
  const Hotkey* GetHotkey(Action action) const;

 private:
  HWND hwnd_;
  std::unordered_map<Action, Hotkey> hotkeys_;
};
}  // namespace mmhmm
