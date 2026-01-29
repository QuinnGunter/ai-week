#include "screen_share_manager_win.h"
#include "include/cef_v8.h"
#include <dwmapi.h>
#include <array>
#include <psapi.h>
#include "util_win.h"
#include "resource.h"
#include "../common/string_util.h"
#include "browser/main_context.h"
#include "../win/window_capture_dispatcher.h"

namespace mmhmm
{
  ScreenShareManagerWin::ScreenShareManagerWin()
  {

  }

  void ScreenShareManagerWin::EnumerateScreens(std::vector<ScreenShareItem>& items)
  {
    DeviceInfo device_info;
    device_info.monitors = &items;
    device_info.device_index = 0;
    EnumDisplayMonitors(nullptr, nullptr, MonitorEnumProc, (LPARAM)&device_info);
  }

  void ScreenShareManagerWin::EnumerateWindows(std::vector<ScreenShareItem>& items)
  {
    EnumWindows(EnumWindowsProc, reinterpret_cast<LPARAM>(&items));
  }

  static bool GetMonitorTarget(LPCWSTR device,
    DISPLAYCONFIG_TARGET_DEVICE_NAME* target)
  {
    bool found = false;

    UINT32 numPath, numMode;
    if (GetDisplayConfigBufferSizes(QDC_ONLY_ACTIVE_PATHS, &numPath,
      &numMode) == ERROR_SUCCESS) {
      DISPLAYCONFIG_PATH_INFO* paths =
        new DISPLAYCONFIG_PATH_INFO[numPath];
      DISPLAYCONFIG_MODE_INFO* modes =
        new DISPLAYCONFIG_MODE_INFO[numMode];
      if (QueryDisplayConfig(QDC_ONLY_ACTIVE_PATHS, &numPath, paths,
        &numMode, modes,
        NULL) == ERROR_SUCCESS) {
        for (size_t i = 0; i < numPath; ++i) {
          const DISPLAYCONFIG_PATH_INFO* const path =
            &paths[i];

          DISPLAYCONFIG_SOURCE_DEVICE_NAME
            source;
          source.header.type =
            DISPLAYCONFIG_DEVICE_INFO_GET_SOURCE_NAME;
          source.header.size = sizeof(source);
          source.header.adapterId =
            path->sourceInfo.adapterId;
          source.header.id = path->sourceInfo.id;
          if (DisplayConfigGetDeviceInfo(
            &source.header) == ERROR_SUCCESS &&
            wcscmp(device, source.viewGdiDeviceName) ==
            0) {
            target->header.type =
              DISPLAYCONFIG_DEVICE_INFO_GET_TARGET_NAME;
            target->header.size = sizeof(*target);
            target->header.adapterId =
              path->sourceInfo.adapterId;
            target->header.id = path->targetInfo.id;
            found = DisplayConfigGetDeviceInfo(
              &target->header) ==
              ERROR_SUCCESS;
            break;
          }
        }
      }

      delete[] modes;
      delete[] paths;
    }

    return found;
  }

  BOOL CALLBACK ScreenShareManagerWin::MonitorEnumProc(HMONITOR monitor, HDC hdc, LPRECT rect, LPARAM data)
  {
    MONITORINFOEX mi = { 0 };
    mi.cbSize = sizeof(MONITORINFOEX);
    GetMonitorInfo(monitor, &mi);

    mmhmm::DeviceInfo* device_info = reinterpret_cast<mmhmm::DeviceInfo*>(data);

    ScreenShareItem m;
    m.hwnd = monitor;

    DISPLAY_DEVICE dd;
    dd.cb = sizeof(DISPLAY_DEVICE);

    int device_index = 0;
    while (EnumDisplayDevices(NULL, device_index, &dd, 0))
    {
      if (std::wstring(dd.DeviceName) == std::wstring(mi.szDevice))
      {
        std::wstringstream friendly_name;
        DISPLAYCONFIG_TARGET_DEVICE_NAME target;
        
          m.id = L"screen:" + std::to_wstring(device_index) + L":0";
          if (mi.dwFlags == MONITORINFOF_PRIMARY) {
            friendly_name << client::ToNarrowString(
                                 client::GetResourceString(
                                     IDS_SCREEN_CAPTURE_PRIMARY_MONITOR))
                                 .c_str()
                          << " - ";
          }
          if (GetMonitorTarget(mi.szDevice, &target)) {
            friendly_name << std::wstring(target.monitorFriendlyDeviceName);
          }
          else {
            friendly_name << std::wstring(dd.DeviceString);
          }
          m.title = friendly_name.str();
          m.type = L"screen";
          m.preview = L"http://mmhmm-client-media/" + m.id;
          m.processName = L"screen";
          device_info->monitors->push_back(m);
          device_info->device_index++;
          break;
      }

      device_index++;
    }

    return true;
  }

  void ScreenShareManagerWin::OnGetScreenshareMediaRequest(CefRefPtr<CefBrowser> browser, bool includeScreens, bool includeWindows, int requestId)
  {
    std::vector<mmhmm::ScreenShareItem> items;

    if (includeScreens)
    {
      mmhmm::ScreenShareManagerWin::EnumerateScreens(items);
    }

    if (includeWindows)
    {
      mmhmm::ScreenShareManagerWin::EnumerateWindows(items);
    }

    CefRefPtr<CefProcessMessage> msg = CefProcessMessage::Create("getScreenshareMedia_success");
    CefRefPtr<CefListValue> args = msg->GetArgumentList();
    args->SetBool(0, true);
    args->SetInt(1, requestId);
    args->SetString(2, items[requestId].type);
    args->SetString(3, items[requestId].id);
    args->SetString(4, items[requestId].title);
    args->SetString(5, items[requestId].processName);

    browser->GetMainFrame()->SendProcessMessage(PID_RENDERER, msg);
  }

  void ScreenShareManagerWin::OnEnumerateScreenshareMediaRequest(CefRefPtr<CefBrowser> browser, bool includeScreens, bool includeWindows, int requestId)
  {
    std::vector<mmhmm::ScreenShareItem> items;

    if (includeScreens)
    {
      mmhmm::ScreenShareManagerWin::EnumerateScreens(items);
    }

    if (includeWindows)
    {
      mmhmm::ScreenShareManagerWin::EnumerateWindows(items);
    }

    CefRefPtr<CefProcessMessage> msg = CefProcessMessage::Create("enumerateScreenshareMedia_success");
    CefRefPtr<CefListValue> args = msg->GetArgumentList();
    args->SetBool(0, true);
    args->SetInt(1, requestId);
    int index = 2;
    for (auto& item : items)
    {
      CefRefPtr<CefDictionaryValue> jsonItem = CefDictionaryValue::Create();
      jsonItem->SetString("id", item.id);
      jsonItem->SetString("preview", item.preview);
      jsonItem->SetString("title", item.title);
      jsonItem->SetString("type", item.type);
      jsonItem->SetString("processName", item.processName);
      args->SetDictionary(index, jsonItem);
      index++;
    }

    browser->GetMainFrame()->SendProcessMessage(PID_RENDERER, msg);
  }


  BOOL CALLBACK ScreenShareManagerWin::EnumWindowsProc(HWND hwnd, LPARAM lParam)
  {
    if (!IsWindowValidAndVisible(hwnd)) {
      return TRUE;
    }

    DWORD affinity = 0;
    if (GetWindowDisplayAffinity(hwnd, &affinity) &&
        affinity == WDA_EXCLUDEFROMCAPTURE) {
        return TRUE;  // Skip windows that can't be captured
    }

    HWND owner = GetWindow(hwnd, GW_OWNER);
    LONG exstyle = GetWindowLong(hwnd, GWL_EXSTYLE);
    if (owner && !(exstyle & WS_EX_APPWINDOW)) {
      return TRUE;
    }

    if (exstyle & WS_EX_TOOLWINDOW) {
      return TRUE;
    }

    std::vector<ScreenShareItem>& items =
        *reinterpret_cast<std::vector<ScreenShareItem>*>(lParam);

    std::wstring title = GetWindowTitle(hwnd);
    if (title.length() == 0) {
      return TRUE;
    }

    std::wstring class_name = GetWindowClassName(hwnd);
    if (wcscmp(class_name.c_str(), L"Progman") == 0 ||
        wcscmp(class_name.c_str(), L"Button") == 0)
      return TRUE;

    std::wstring id = L"window";
    id.append(L":");
    id.append(std::to_wstring((intptr_t)hwnd));
    id.append(L":0");

    ScreenShareItem window{hwnd,
                           L"desktop",
                           id,
                           title,
                           L"http://mmhmm-client-media/" + id,
                           GetProcessName(hwnd)};

    items.push_back(window);
    return TRUE;
  }

  bool ScreenShareManagerWin::GetMediaPreview(std::string type, int id, std::vector<unsigned char>* image)
  {
    if (type == "window")
    {
      return GetWindowPreview(id, image);
    }
    else
    {
      return GetScreenPreview(id, image);
    }
  }

  bool ScreenShareManagerWin::GetScreenPreview(int64_t id, std::vector<unsigned char>* out)
  {
    bool result = false;
    HDC hdcScreen = NULL;
    HDC hdcMemDC = NULL;
    HBITMAP hbmScreen = NULL;
    HGDIOBJ hbmOldSrceen = NULL;
    BITMAP bmpScreen;
    DWORD dwSizeofDIB = 0;
    char* lpbitmap = NULL;
    HANDLE hDIB = NULL;
    DWORD dwBmpSize = 0;

    DISPLAY_DEVICE device;
    device.cb = sizeof(device);

    if (!EnumDisplayDevices(NULL, id, &device, 0))
      goto done;

    DEVMODE device_mode;
    device_mode.dmSize = sizeof(device_mode);
    device_mode.dmDriverExtra = 0;
    if (!EnumDisplaySettingsEx(
      device.DeviceName, ENUM_CURRENT_SETTINGS, &device_mode, 0))
      goto done;

    int x, y, w, h;
    x = device_mode.dmPosition.x;
    y = device_mode.dmPosition.y;
    w = device_mode.dmPelsWidth;
    h = device_mode.dmPelsHeight;


    hdcScreen = GetDC(NULL);
    hdcMemDC = CreateCompatibleDC(hdcScreen);
    if (!hdcMemDC)
      goto done;

    hbmScreen = CreateCompatibleBitmap(hdcScreen, w, h);
    if (!hdcMemDC)
    {
      goto done;
    }

    // Select the compatible bitmap into the compatible memory DC.
    hbmOldSrceen = SelectObject(hdcMemDC, hbmScreen);

    if (!BitBlt(hdcMemDC,
      0, 0,
      w, h,
      hdcScreen,
      x, y,
      CAPTUREBLT | SRCCOPY))
    {
      goto done;
    }

    // Get the BITMAP from the HBITMAP.
    GetObject(hbmScreen, sizeof(BITMAP), &bmpScreen);

    BITMAPFILEHEADER   bmfHeader;
    BITMAPINFOHEADER   bi;

    bi.biSize = sizeof(BITMAPINFOHEADER);
    bi.biWidth = w;
    bi.biHeight = h;
    bi.biPlanes = 1;
    bi.biBitCount = 32;
    bi.biCompression = BI_RGB;
    bi.biSizeImage = 0;
    bi.biXPelsPerMeter = 0;
    bi.biYPelsPerMeter = 0;
    bi.biClrUsed = 0;
    bi.biClrImportant = 0;

    dwBmpSize = ((w * bi.biBitCount + 31) / 32) * 4 * h;

    // Add the size of the headers to the size of the bitmap to get the total file size.
    dwSizeofDIB = dwBmpSize + sizeof(BITMAPFILEHEADER) + sizeof(BITMAPINFOHEADER);

    hDIB = GlobalAlloc(GHND, dwSizeofDIB);
    lpbitmap = (char*)GlobalLock(hDIB);

    // Gets the "bits" from the bitmap, and copies them into a buffer 
    // that's pointed to by lpbitmap, offset enough to fit the file header and bitmap info header.
    bmpScreen;
    GetDIBits(hdcMemDC, hbmScreen, 0,
      (UINT)bmpScreen.bmHeight,
      lpbitmap + (DWORD)sizeof(BITMAPFILEHEADER) + (DWORD)sizeof(BITMAPINFOHEADER),
      (BITMAPINFO*)&bi, DIB_RGB_COLORS);

    // Offset to where the actual bitmap bits start.
    bmfHeader.bfOffBits = (DWORD)sizeof(BITMAPFILEHEADER) + (DWORD)sizeof(BITMAPINFOHEADER);

    // Size of the file.
    bmfHeader.bfSize = dwSizeofDIB;

    // bfType must always be BM for Bitmaps.
    bmfHeader.bfType = 0x4D42; // BM.

    //copy in the file header
    memcpy(lpbitmap, &bmfHeader, (DWORD)sizeof(BITMAPFILEHEADER));

    //copy in the bitmap header
    memcpy(lpbitmap + (DWORD)sizeof(BITMAPFILEHEADER), &bi, (DWORD)sizeof(BITMAPINFOHEADER));


    *out = std::vector<unsigned char>((unsigned char*)lpbitmap, (unsigned char*)lpbitmap + dwSizeofDIB);

    result = true;

  done:
    //return old object
    if (hbmOldSrceen)
    {
      SelectObject(hdcMemDC, hbmOldSrceen);
    }

    if (hbmScreen)
    {
      DeleteObject(hbmScreen);
    }
    if (hdcMemDC)
    {
      DeleteObject(hdcMemDC);
    }
    if (hdcScreen)
    {
      ReleaseDC(NULL, hdcScreen);
    }

    return result;
  }

bool ScreenShareManagerWin::GetWindowPreview(
      int64_t id,
      std::vector<unsigned char>* out_bitmap) {
    HWND hwnd = reinterpret_cast<HWND>(id);

    mmhmm::WindowCaptureDispatcher dispatcher;
    return dispatcher.Capture(hwnd, *out_bitmap);
  }


std::wstring ScreenShareManagerWin::GetProcessName(HWND hwnd) {
    DWORD process_id;
    GetWindowThreadProcessId(hwnd, &process_id);
    if (process_id == 0) {
      return std::wstring();
    }

    HANDLE processHandle = OpenProcess(PROCESS_ALL_ACCESS, FALSE, process_id);
    if (processHandle == nullptr) {
      return std::wstring();
    }

    WCHAR buffer[MAX_PATH];
    GetProcessImageFileName(processHandle, buffer, MAX_PATH);
    auto fullProcessName = std::wstring(buffer);
    CloseHandle(processHandle);

    auto found = fullProcessName.find_last_of(L"/\\");
    return (found != std::wstring::npos) ? fullProcessName.substr(found + 1)
                                         : fullProcessName;
  }

  bool ScreenShareManagerWin::IsWindowValidAndVisible(HWND hwnd) {
    return IsWindow(hwnd) && IsWindowVisible(hwnd) && !IsIconic(hwnd) &&
           !IsWindowCloaked(hwnd);
  }
  bool ScreenShareManagerWin::IsWindowCloaked(HWND hwnd) {
    int res = 0;
    if (DwmGetWindowAttribute(hwnd, DWMWA_CLOAKED, &res, sizeof(res)) != S_OK) {
      return false;
    }

    return res != 0;
  }

  std::wstring ScreenShareManagerWin::GetWindowTitle(HWND hwnd) {
    std::array<WCHAR, 1024> window_text;
    GetWindowTextW(hwnd, window_text.data(), (int)window_text.size());
    return std::wstring(window_text.data());
  }

  std::wstring ScreenShareManagerWin::GetWindowClassName(HWND hwnd) {
    std::array<WCHAR, 256> class_name_data;
    GetClassNameW(hwnd, class_name_data.data(), (int)class_name_data.size());
    return std::wstring(class_name_data.data());
  }

  void ScreenShareManagerWin::FocusWindow(std::wstring id) {
    if (!IsWindowId(id)) {
      return;
    }

    if (HWND hwnd = GetHwndFromId(id)) {
      BringWindowToTop(hwnd);
      SetForegroundWindow(hwnd);
    }
  }

  HWND ScreenShareManagerWin::GetHwndFromId(const std::wstring& id) {
    auto logger = MainContext::Get()->GetLogger();
    size_t first_token = id.find(L':');
    size_t second_token = id.find(L':', first_token + 1);

    if (first_token == std::wstring::npos ||
        second_token == std::wstring::npos) {
      if (logger) {
        logger->warn("Screen share id was malformed {}",
                     client::ToNarrowString(id));
      }
      return nullptr;
    }

    std::wstring hwnd_str =
        id.substr(first_token + 1, second_token - first_token - 1);

    intptr_t hwnd_int = 0;
    try {
      hwnd_int = std::stoi(hwnd_str);
    } catch (...) {
      if (logger) {
        logger->warn("Screen share id was malformed {}",
                     client::ToNarrowString(id));
      }
    }

    return reinterpret_cast<HWND>(hwnd_int);
  }

  bool ScreenShareManagerWin::IsWindowId(const std::wstring& id) {
    return id.find(L"window:") == 0;
  }
  }
