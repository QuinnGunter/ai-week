#pragma once

#include <memory>
#include "windows.h"
#include "hot_key_manager.h"

namespace mmhmm {
class TrayApp {
 public:
  TrayApp();
  ~TrayApp();

  bool TrySetHotKey(Action action, std::string key);
  std::string GetHotKeyValue(Action action);

 private:
  void InitWindow();
  void ShowMenu() const;
  void AddTrayIcon();
  void RemoveTrayIcon();
  void DoToggleRecording();
  void DoScreenRecording();
  void DoWindowRecording();
  void RegisterHotKeys();

 private:
  HINSTANCE hinstance_;
  HWND app_window_hwnd_;
  UINT WM_TASK_BAR_CREATED{0};
  std::unique_ptr<HotkeyManager> hot_key_manager_;
};
}  // namespace mmhmm
