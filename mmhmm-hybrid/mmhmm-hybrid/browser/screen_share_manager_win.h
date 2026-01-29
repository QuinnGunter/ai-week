//
// mmhmm Windows
// Copyright � 2020-2022 mmhmm, inc. All rights reserved.
//
#pragma once

#include "include/cef_v8.h"

namespace mmhmm
{
  struct Monitor
  {
    void* hmon;
    std::wstring devname;
    std::wstring friendlyname;
  };

  struct Window
  {
    void* hwnd;
    std::wstring title;
    std::wstring className;
    std::wstring id;
  };

  struct ScreenShareItem
  {
    void* hwnd;
    std::wstring type;
    std::wstring id;
    std::wstring title;
    std::wstring preview;
    std::wstring processName;
  };

  struct WindowsInfo
  {
    std::vector<ScreenShareItem> windows;
    const wchar_t** ignoreList;
    DWORD pid;
  };

  struct DeviceInfo
  {
    std::vector<ScreenShareItem>* monitors;
    int device_index;
  };

  class ScreenShareManagerWin {
  public:
    ScreenShareManagerWin();
    static void OnGetScreenshareMediaRequest(CefRefPtr<CefBrowser> browser, bool includeScreens, bool includeWindows, int requestId);
    static void OnEnumerateScreenshareMediaRequest(CefRefPtr<CefBrowser> browser, bool includeScreens, bool includeWindows, int requestId);

    static bool GetMediaPreview(std::string type, int id, std::vector<unsigned char>* image);
    static void FocusWindow(std::wstring id);

  private:
    static void EnumerateScreens(std::vector<ScreenShareItem>& items);
    static void EnumerateWindows(std::vector<ScreenShareItem>& items);

    static BOOL CALLBACK MonitorEnumProc(HMONITOR monitor, HDC hdc, LPRECT rect, LPARAM data);
    static BOOL CALLBACK EnumWindowsProc(HWND hwnd, LPARAM lParam);

    static bool GetWindowPreview(int64_t id, std::vector<unsigned char>* out_bitmap);
    static bool GetScreenPreview(int64_t id, std::vector<unsigned char>* out);

    static std::wstring GetProcessName(HWND hwnd);
    static bool IsWindowValidAndVisible(HWND hwnd);
    static bool IsWindowCloaked(HWND hwnd);
    static std::wstring GetWindowTitle(HWND hwnd);
    static std::wstring GetWindowClassName(HWND hwnd);
    static HWND GetHwndFromId(const std::wstring& id);
    static bool IsWindowId(const std::wstring& id);
  };
}
