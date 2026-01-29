#include "system_info.h"

#include <windows.h>

#include <VersionHelpers.h>
#include <bcrypt.h>
#include <d2d1_3.h>
#include <dxgi1_6.h>
#include <stdio.h>
#include <time.h>
#include <winnt.h>
#include <winrt/windows.graphics.directx.direct3d11.h>
#include <winuser.h>
#include <chrono>
#include <ctime>
#include <iostream>
#include <sstream>
#include <thread>

#pragma comment(lib, "dxgi")
#pragma comment(lib, "version.lib")

#define _WIN32_DCOM
#include <Wbemidl.h>
#include <comdef.h>
#include <iostream>

namespace mmhmm {

static wchar_t GpuPreferencesRegKey[] =
    L"SOFTWARE\\Microsoft\\DirectX\\UserGpuPreferences";

MemoryUsage GetFreeRAM() {
  MEMORYSTATUSEX memoryStatus;
  memoryStatus.dwLength = sizeof(memoryStatus);
  GlobalMemoryStatusEx(&memoryStatus);

  return {memoryStatus.ullAvailPhys, memoryStatus.ullTotalPhys};
}

int GetCPUs() {
  SYSTEM_INFO systemInfo;
  GetSystemInfo(&systemInfo);
  return systemInfo.dwNumberOfProcessors;
}

std::wstring GetOS() {
  unsigned long handle;
  unsigned int length = GetFileVersionInfoSize(L"Kernel32.dll", &handle);
  std::vector<char> data(length);
  if (GetFileVersionInfo(L"Kernel32.dll", 0, length, data.data())) {
    VS_FIXEDFILEINFO* pVersion = NULL;
    if (VerQueryValue(data.data(), TEXT("\\"), (VOID**)&pVersion, &length) &&
        pVersion != NULL) {
      std::vector<wchar_t> osNameBuffer(length);
      swprintf(osNameBuffer.data(), length, L"Windows %d.%d",
               (pVersion->dwFileVersionMS >> 16),
               (pVersion->dwFileVersionMS & 65536));
      return std::wstring(osNameBuffer.data());
    }
  } else {
    // safeguard for old systems
    if (IsWindows10OrGreater()) {
      return L"Windows 10";
    }
    if (IsWindows8Point1OrGreater()) {
      return L"Windows 8.1";
    }
  }

  return L"Windows";
}

std::wstring GetProcessor() {
  std::wstring cpu{L"Unknown"};

  HKEY hRoot;
  auto result =
      RegOpenKeyEx(HKEY_LOCAL_MACHINE, L"HARDWARE\\DESCRIPTION\\System", 0,
                   KEY_READ, &hRoot);
  if (result != ERROR_SUCCESS) {
    RegCloseKey(hRoot);
    return cpu;
  }

  HKEY key;
  if (RegOpenKey(hRoot, L"CentralProcessor\\0", &key) != ERROR_SUCCESS) {
    RegCloseKey(hRoot);
    return cpu;
  }

  std::vector<byte> data(1024);
  unsigned long dataSize = 1024;
  DWORD type;

  if (RegQueryValueEx(key, L"ProcessorNameString", 0, &type,
                      reinterpret_cast<LPBYTE>(&data[0]),
                      &dataSize) == ERROR_SUCCESS &&
      type == REG_SZ) {
    cpu = std::wstring(reinterpret_cast<wchar_t*>(&data[0]));
  }

  RegCloseKey(key);
  RegCloseKey(hRoot);

  return cpu;
}

std::wstring GetLocalTimeString() {
  std::time_t time;
  struct std::tm* localTime;

  std::time(&time);
  localTime = std::localtime(&time);

  return _wasctime(localTime);
}

std::wstring GetUtcTimeString() {
  std::time_t time;
  struct std::tm* utcTime;

  std::time(&time);
  utcTime = std::gmtime(&time);

  return _wasctime(utcTime);
}

std::wstring GetPrimaryGfxCardName() {
  DISPLAY_DEVICE displayDevice;
  displayDevice.cb = sizeof(DISPLAY_DEVICE);

  int index = 0;

  while (EnumDisplayDevices(NULL, index, &displayDevice, 0)) {
    if (displayDevice.StateFlags & DISPLAY_DEVICE_PRIMARY_DEVICE) {
      return std::wstring((const wchar_t*)displayDevice.DeviceString);
    }
    index++;
  }

  return L"Unknown";
}

std::vector<std::wstring> GetInstalledGfxCardNames() {
  std::vector<std::wstring> cardNames;

  DISPLAY_DEVICE displayDevice;
  displayDevice.cb = sizeof(DISPLAY_DEVICE);

  int index = 0;

  while (EnumDisplayDevices(NULL, index, &displayDevice, 0)) {
    cardNames.push_back(
        std::wstring((const wchar_t*)displayDevice.DeviceString));

    index++;
  }

  return cardNames;
}

ScreenResolution GetScreenResolution() {
  return {GetSystemMetrics(SM_CXVIRTUALSCREEN),
          GetSystemMetrics(SM_CYVIRTUALSCREEN)};
}

static BOOL CALLBACK monitorEnumerationCallback(HMONITOR hMonitor,
                                                HDC hdcMonitor,
                                                LPRECT lprcMonitor,
                                                LPARAM dwData) {
  int* count = (int*)dwData;
  (*count)++;
  return true;
}

int GetNumMonitors() {
  int count = 0;
  if (!EnumDisplayMonitors(NULL, NULL, monitorEnumerationCallback,
                           (LPARAM)&count))
    count = 1;
  return count;
}

int GetNumCores() {
  return std::thread::hardware_concurrency();
}

std::wstring GetMyComputerName() {
  std::wstring computerName;
  unsigned long length = 0;
  std::vector<wchar_t> nameBuffer(MAX_COMPUTERNAME_LENGTH + 1);
  if (GetComputerName(&nameBuffer[0], (unsigned long*)&length) != 0) {
    return std::wstring(nameBuffer.data());
  } else {
    return std::wstring();
  }
}

bool GetGpuPreference(std::wstring applicationPath, int& gpuPreference) {
  HKEY pHRoot;
  bool success = false;
  LONG res = RegOpenKeyEx(HKEY_CURRENT_USER, GpuPreferencesRegKey, 0, KEY_READ,
                          &pHRoot);
  if (res != ERROR_SUCCESS) {
    RegCloseKey(pHRoot);
    // DXGI_GPU_PREFERENCE_UNSPECIFIED
    return success;
  }

  std::vector<byte> data(1024 + 1);
  unsigned long datasize = 1024;
  DWORD type;
  char optionStr[3];

  auto hr = RegQueryValueEx(pHRoot, &applicationPath[0], 0, &type,
                            reinterpret_cast<LPBYTE>(&data[0]), &datasize);
  if (hr == ERROR_SUCCESS) {
    if (type == REG_SZ) {
      data[datasize] = 0;

      // Data is 'GpuPreference=2;' in wide char string
      // We only want the numeric value
      optionStr[0] = data[datasize - 6];
      optionStr[1] = '\0';
      gpuPreference = atoi((const char*)optionStr);
      success = true;
    }
  }
  RegCloseKey(pHRoot);
  return success;
}

bool SetGpuPreference(std::wstring applicationPath, int gpuPreference) {
  HKEY pHRoot;
  TCHAR str[40];
  DWORD dpos;
  bool success = false;

  if (gpuPreference < 0 || gpuPreference > 2) {
    return success;
  }
  wsprintf(str, L"GpuPreference=%d;", gpuPreference);

  HRESULT hr =
      RegCreateKeyEx(HKEY_CURRENT_USER, GpuPreferencesRegKey, 0, NULL,
                     REG_OPTION_NON_VOLATILE, KEY_WRITE, NULL, &pHRoot, &dpos);
  if (hr != ERROR_SUCCESS) {
    RegCloseKey(pHRoot);
    return success;
  }

  hr = RegSetValueEx(pHRoot, &applicationPath[0], 0, REG_SZ, (const BYTE*)str,
                     (DWORD)(wcslen(str) * sizeof(TCHAR)));
  if (hr == ERROR_SUCCESS) {
    success = true;
  }
  RegCloseKey(pHRoot);
  return success;
}

std::vector<std::wstring> GetAdaptersByGpuPreference(
    std::wstring applicationPath) {
  winrt::com_ptr<IDXGIFactory6> dgxi6;

  std::vector<std::wstring> adapters(3);

  // Get the correct minimum version of the factory that supports this feature
  HRESULT hr = CreateDXGIFactory2(0, __uuidof(IDXGIFactory6), (void**)&dgxi6);
  if (FAILED(hr)) {
    return adapters;
  }

  int gpuPreferences = 0;
  GetGpuPreference(applicationPath, gpuPreferences);
  std::vector<std::wstring> fullSet;

  if (SUCCEEDED(hr)) {
    DXGI_GPU_PREFERENCE preference =
        DXGI_GPU_PREFERENCE::DXGI_GPU_PREFERENCE_MINIMUM_POWER;
    IDXGIAdapter* adapter;
    // This call is overriden by the registery value being set
    for (UINT adapterId = 0; (hr = dgxi6->EnumAdapterByGpuPreference(
                                  adapterId, preference, __uuidof(IDXGIAdapter),
                                  (void**)&adapter)) != DXGI_ERROR_NOT_FOUND;
         adapterId++) {
      if (adapter != nullptr) {
        DXGI_ADAPTER_DESC desc;
        adapter->GetDesc(&desc);
        if (wcslen(desc.Description) < 1) {
          fullSet.push_back(L"Unlabeled GPU");
        } else {
          fullSet.push_back(desc.Description);
        }
        adapter->Release();
      } else {
        fullSet.push_back(L"Unknown");
      }
    }
    assert(fullSet[0].size() > 0);
    for (int v = 0; v < 3; ++v) {
      adapters[v] = fullSet[0];
    }
    // Last enumerated adapter will be the basic renderer which is a WARP
    // software driver, avoid that
    if (fullSet.size() >= 3) {
      if (gpuPreferences != 2) {
        // Not specified (0) and minimum power (1) will return the same
        adapters[2] = fullSet[fullSet.size() - 2];
      } else {
        // Flip the order here to give this method a consistant return
        adapters[0] = fullSet[fullSet.size() - 2];
        adapters[1] = fullSet[fullSet.size() - 2];
      }
    } else {
      // Only adapter so first would apply to all
    }
  }

  return adapters;
}

std::wstring GetOSVersion() {
  NTSTATUS(WINAPI * RtlGetVersion)(LPOSVERSIONINFOEXW);
  OSVERSIONINFOEXW osInfo;

  *(FARPROC*)&RtlGetVersion =
      GetProcAddress(GetModuleHandleA("ntdll"), "RtlGetVersion");

  if (NULL != RtlGetVersion) {
    osInfo.dwOSVersionInfoSize = sizeof(osInfo);
    RtlGetVersion(&osInfo);
    return std::to_wstring(osInfo.dwMajorVersion) + L"." +
           std::to_wstring(osInfo.dwMinorVersion) + L"." +
           std::to_wstring(osInfo.dwBuildNumber);
  }
  return std::wstring();
}

std::wstring GetModelName() {
  return QueryWMI(L"Model");
}

std::wstring GetManufacturerName() {
  return QueryWMI(L"Manufacturer");
}

MemoryUsage GetCurrentDiskSpace() {
  ULARGE_INTEGER available;
  ULARGE_INTEGER total;
  ULARGE_INTEGER free;

  if (GetDiskFreeSpaceEx(NULL, &available, &total, &free)) {
    return {available.QuadPart, total.QuadPart};
  } else {
    return {0, 0};
  }
}

std::wstring FormatDuration(uint64_t milliseconds) {
  std::chrono::milliseconds ms(milliseconds);
  auto secs = std::chrono::duration_cast<std::chrono::seconds>(ms);
  ms -= std::chrono::duration_cast<std::chrono::milliseconds>(secs);
  auto mins = std::chrono::duration_cast<std::chrono::minutes>(secs);
  secs -= std::chrono::duration_cast<std::chrono::seconds>(mins);
  auto hours = std::chrono::duration_cast<std::chrono::hours>(mins);
  mins -= std::chrono::duration_cast<std::chrono::minutes>(hours);
  // std::chrono::days wasn't introduced until c++20 which is not supported
  auto days = hours.count() / 24;
  hours -= std::chrono::hours(days * 24);

  std::wstringstream stringStream;
  stringStream << days << L" Days : " << hours.count() << L" Hours : "
               << mins.count() << L" Minutes : " << secs.count() << L" Seconds";
  return stringStream.str();
}

uint64_t GetUpTime() {
  return GetTickCount64();
}

std::wstring GetFormattedUpTime() {
  return FormatDuration(GetUpTime());
}

std::wstring QueryWMI(std::wstring property) {
  HRESULT hresult;
  std::wstring result;

  // Obtain the initial locator to Windows Management
  // on a particular host computer.
  IWbemLocator* pLoc = 0;

  hresult = CoCreateInstance(CLSID_WbemLocator, 0, CLSCTX_INPROC_SERVER,
                             IID_IWbemLocator, (LPVOID*)&pLoc);

  if (FAILED(hresult)) {
    return std::wstring();
  }

  IWbemServices* pSvc = 0;

  // Connect to the root\cimv2 namespace with the
  // current user and obtain pointer pSvc
  // to make IWbemServices calls.

  hresult = pLoc->ConnectServer(

      _bstr_t(L"ROOT\\CIMV2"),  // WMI namespace
      NULL,                     // User name
      NULL,                     // User password
      0,                        // Locale
      NULL,                     // Security flags
      0,                        // Authority
      0,                        // Context object
      &pSvc                     // IWbemServices proxy
  );

  if (FAILED(hresult)) {
    pLoc->Release();
    return std::wstring();  // Program has failed.
  }

  // Set the IWbemServices proxy so that impersonation
  // of the user (client) occurs.
  hresult = CoSetProxyBlanket(

      pSvc,                         // the proxy to set
      RPC_C_AUTHN_WINNT,            // authentication service
      RPC_C_AUTHZ_NONE,             // authorization service
      NULL,                         // Server principal name
      RPC_C_AUTHN_LEVEL_CALL,       // authentication level
      RPC_C_IMP_LEVEL_IMPERSONATE,  // impersonation level
      NULL,                         // client identity
      EOAC_NONE                     // proxy capabilities
  );

  if (FAILED(hresult)) {
    pSvc->Release();
    pLoc->Release();
    CoUninitialize();
    return std::wstring();
  }

  // Use the IWbemServices pointer to make requests of WMI.
  // Make requests here:

  // For example, query for all the running processes
  IEnumWbemClassObject* pEnumerator = NULL;
  hresult = pSvc->ExecQuery(
      bstr_t("WQL"), bstr_t("SELECT * FROM Win32_ComputerSystem"),
      WBEM_FLAG_FORWARD_ONLY | WBEM_FLAG_RETURN_IMMEDIATELY, NULL,
      &pEnumerator);

  if (FAILED(hresult)) {
    pSvc->Release();
    pLoc->Release();
    return std::wstring();
  } else {
    IWbemClassObject* pclsObj;
    ULONG uReturn = 0;

    while (pEnumerator) {
      hresult = pEnumerator->Next(WBEM_INFINITE, 1, &pclsObj, &uReturn);

      if (0 == uReturn) {
        break;
      }

      VARIANT vtProp;

      // Get the value of the Manufacturer property
      hresult = pclsObj->Get(property.c_str(), 0, &vtProp, 0, 0);
      result = std::wstring(vtProp.bstrVal);
      VariantClear(&vtProp);

      pclsObj->Release();
      pclsObj = NULL;
    }
  }

  pSvc->Release();
  pLoc->Release();
  pEnumerator->Release();

  return result;
}
}  // namespace mmhmm
