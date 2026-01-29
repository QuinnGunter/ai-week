//
// mmhmm Windows
// Copyright © 2020-2024 mmhmm, inc. All rights reserved.
//
#pragma once

#include <string>
#include <vector>

namespace mmhmm {

struct MemoryUsage {
  uint64_t Available = 0;
  uint64_t Total = 0;
};

struct CPU {
  std::wstring Model;
  int ClockSpeed = 0;
};

struct ScreenResolution {
  int width = 0;
  int height = 0;
};

MemoryUsage GetFreeRAM();
std::wstring GetOS();
std::wstring GetProcessor();
std::wstring GetLocalTimeString();
std::wstring GetUtcTimeString();
std::wstring GetPrimaryGfxCardName();
std::vector<std::wstring> GetInstalledGfxCardNames();
ScreenResolution GetScreenResolution();
int GetNumMonitors();
int GetNumCores();
std::wstring GetMyComputerName();
bool GetGpuPreference(std::wstring applicationPath, int& gpuPreference);
bool SetGpuPreference(std::wstring applicationPath, int gpuPreference);
std::vector<std::wstring> GetAdaptersByGpuPreference(
    std::wstring applicationPath);
std::wstring GetOSVersion();
std::wstring GetModelName();
std::wstring GetManufacturerName();
MemoryUsage GetCurrentDiskSpace();
std::wstring FormatDuration(uint64_t milliseconds);
uint64_t GetUpTime();
std::wstring GetFormattedUpTime();
std::wstring QueryWMI(std::wstring property);
}  // namespace mmhmm
