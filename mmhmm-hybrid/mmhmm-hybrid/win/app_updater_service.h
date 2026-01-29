//
// mmhmm Windows
// Copyright © 2020-2023 mmhmm, inc. All rights reserved.
//
#pragma once

#include <string>
#include "file_version.h"
#include "installer_info.h"
#include <functional>
#include <Windows.h>
#include <wininet.h>
#include <atomic>
#include <mutex>
#pragma comment (lib, "Wininet.lib")

namespace mmhmm
{
  class AppUpdaterService
  {

    struct RunningState {
      bool is_running = false;
      bool cancelled = false;
    };

    typedef void (*DownloadProgressCallback)(int);
    typedef void (*DownloadCompleteCallback)(bool);

  public:
    AppUpdaterService(std::wstring user_agent);
    ~AppUpdaterService();

    bool CheckForUpdates();

    
    void DownloadLatestInstallerForCurrentTrack(
        std::function<void(bool)> completeCallback,
        std::function<void(int)> progressCallback);

    void DownloadLatestInstallerByTrack(std::wstring track,
                                      std::function<void(bool)> completeCallback,
                                     std::function<void(int)> progressCallback);

    void CancelDownload();

  private:
    InstallerInfo GetVersionInformation();
    int GetContentSize(HINTERNET hHttp);
    void DownloadLatestInstaller(std::function<void(bool)> completeCallback,
                                 std::function<void(int)> progressCallback,
                                 std::wstring track);
    void SetRunningState(RunningState running_state);

  public:
    InstallerInfo installerInfo_ {};

    std::mutex mutex_;
    RunningState running_state_ {};

    std::wstring user_agent_;
  };
}
