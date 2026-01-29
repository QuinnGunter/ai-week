#include "app_updater_service.h"

#include <wininet.h>
#pragma comment (lib, "Wininet.lib")
#include <stdio.h>
#include <string>
#include <ShlObj_core.h>

#include <codecvt>

#include "json_reader.h"
#include "include/internal/cef_types.h"

#include "app_track.h"
#include "app_settings_service.h"


namespace mmhmm
{
  const std::wstring AppName = L"windows-hybrid";
  const std::wstring ServerURL = L"updates.mmhmm.app";
  const std::wstring VersionFileName = L"build-info.json";

  AppUpdaterService::AppUpdaterService(std::wstring user_agent)
      : user_agent_(user_agent)
  {
  }

  AppUpdaterService::~AppUpdaterService()
  {

  }

  bool AppUpdaterService::CheckForUpdates()
  {
    auto currentVersion = AppSettingsService::GetFileVersion();

    installerInfo_ = GetVersionInformation();

    return installerInfo_.MarketingVersion > currentVersion;
  }

  void AppUpdaterService::DownloadLatestInstallerByTrack(
      std::wstring track,
      std::function<void(bool)> completeCallback,
      std::function<void(int)> progressCallback) {
    DownloadLatestInstaller(completeCallback, progressCallback, track);
  }

  void AppUpdaterService::DownloadLatestInstallerForCurrentTrack(
      std::function<void(bool)> completeCallback,
      std::function<void(int)> progressCallback) {
    DownloadLatestInstaller(completeCallback, progressCallback,
                            mmhmm::AppTrackService::get_app_updater_track());
  }

  void AppUpdaterService::DownloadLatestInstaller(std::function<void(bool)> completeCallback, std::function<void(int)> progressCallback, std::wstring track)
  {
    SetRunningState({ true, false });

    if (installerInfo_.InstallerName.empty())
    {
      if (!CheckForUpdates())
      {
        return;
      }
    }

    //TODO : Swap for CEF user agent
    HINTERNET hSession = InternetOpen(
      user_agent_.c_str(), 
      INTERNET_OPEN_TYPE_PRECONFIG,
      NULL,
      NULL,
      0);

    const std::wstring server = ServerURL;

    HINTERNET hConnect = InternetConnect(
      hSession,
      ServerURL.c_str(),
      0,
      L"",
      L"",
      INTERNET_SERVICE_HTTP,
      INTERNET_FLAG_SECURE,
      0);


    auto error = GetLastError();

    HINTERNET request = HttpOpenRequest(
      hConnect,
      L"GET", // METHOD
        (L"/" + AppName + L"/" + track + L"/" + installerInfo_.InstallerName)
            .c_str(),  // URI
      NULL,
      NULL,
      NULL,
      INTERNET_FLAG_SECURE | INTERNET_FLAG_NO_AUTH |
      INTERNET_FLAG_DONT_CACHE | INTERNET_FLAG_PRAGMA_NOCACHE | INTERNET_FLAG_NO_CACHE_WRITE,
      0);

    while (!HttpSendRequest(request, NULL, 0, 0, 0)) {
      error = GetLastError();
      printf("HttpSendRequest error : (%lu)\n", GetLastError());

      InternetErrorDlg(
        GetDesktopWindow(),
        request,
        ERROR_INTERNET_CLIENT_AUTH_CERT_NEEDED,
        FLAGS_ERROR_UI_FILTER_FOR_ERRORS |
        FLAGS_ERROR_UI_FLAGS_GENERATE_DATA |
        FLAGS_ERROR_UI_FLAGS_CHANGE_OPTIONS,
        NULL);
    }


    DWORD fileLength = GetContentSize(request);

    DWORD chunkSize = 1024;

    char* buffer;
    buffer = new char[chunkSize + 1]{ 0 };


    wchar_t tempPathBuffer[MAX_PATH + 1] = { 0 };

    HRESULT res = GetTempPath(MAX_PATH, tempPathBuffer);


    if (SUCCEEDED(res))
    {
      std::wstring tempPath = std::wstring(tempPathBuffer);

      installerInfo_.DownloadPath = tempPath.append(installerInfo_.InstallerName);
    }


    int readLength = 0;

    DWORD dwTemp;
    HANDLE hFile = CreateFile(installerInfo_.DownloadPath.c_str(), GENERIC_WRITE, 0, NULL,
      CREATE_ALWAYS, FILE_ATTRIBUTE_NORMAL, NULL);

    if (INVALID_HANDLE_VALUE == hFile) {
      return;
    }

    double percentageDownloaded = 0;

    while (true) {
      DWORD dwBytesRead;
      BOOL bRead;

      bRead = InternetReadFile(
        request,
        buffer,
        chunkSize + 1,
        &dwBytesRead);

      bool cancelled = false;
      {
        std::scoped_lock lock(mutex_);
        cancelled = running_state_.cancelled;
      }

      if (cancelled)
      {
        InternetCloseHandle(request);
        InternetCloseHandle(hConnect);
        InternetCloseHandle(hSession);
        CloseHandle(hFile);
        completeCallback(false);
        SetRunningState({ false, false });
        return;
      }

      if (dwBytesRead == 0) break;

      readLength += dwBytesRead;

      percentageDownloaded = ((double)readLength / (double)fileLength) * 100.0;

      progressCallback(percentageDownloaded);

      if (!bRead) {
        printf("InternetReadFile error : <%lu>\n", GetLastError());
      }
      else {
        WriteFile(hFile, buffer, dwBytesRead, &dwTemp, NULL);
        buffer[dwBytesRead] = 0;
        printf("Retrieved %lu data bytes: %s\n", dwBytesRead, buffer);
      }
    }

    InternetCloseHandle(request);
    InternetCloseHandle(hConnect);
    InternetCloseHandle(hSession);
    CloseHandle(hFile);

    completeCallback(true);
    SetRunningState({false, false});
    return;
  }



  InstallerInfo AppUpdaterService::GetVersionInformation()
  {
    InstallerInfo installerInfo;

    HINTERNET hSession = InternetOpen(
      user_agent_.c_str(),
      INTERNET_OPEN_TYPE_PRECONFIG,
      NULL,
      NULL,
      0);

    HINTERNET hConnect = InternetConnect(
      hSession,
      ServerURL.c_str(),
      0,
      L"",
      L"",
      INTERNET_SERVICE_HTTP,
      INTERNET_FLAG_SECURE,
      0);


    auto error = GetLastError();
    auto track = mmhmm::AppTrackService::get_app_updater_track();

    HINTERNET request = HttpOpenRequest(
      hConnect,
      L"GET", // METHOD
        (L"/" + AppName + L"/" + track + L"/" + VersionFileName).c_str(),
      NULL,
      NULL,
      NULL,
      INTERNET_FLAG_SECURE | INTERNET_FLAG_NO_AUTH |
      INTERNET_FLAG_DONT_CACHE | INTERNET_FLAG_PRAGMA_NOCACHE | INTERNET_FLAG_NO_CACHE_WRITE,
      0);

    //HttpAddRequestHeaders(request, headers, lstrlen(headers), HTTP_ADDREQ_FLAG_ADD);

    //error = GetLastError();

    int retry_counter = 0;
    while (!HttpSendRequest(request, NULL, 0, 0, 0) && retry_counter < 10) {
      retry_counter++;
      error = GetLastError();
      printf("HttpSendRequest error : (%lu)\n", GetLastError());

      InternetErrorDlg(
        GetDesktopWindow(),
        request,
        ERROR_INTERNET_CLIENT_AUTH_CERT_NEEDED,
        FLAGS_ERROR_UI_FILTER_FOR_ERRORS |
        FLAGS_ERROR_UI_FLAGS_GENERATE_DATA |
        FLAGS_ERROR_UI_FLAGS_CHANGE_OPTIONS,
        NULL);
    }

    DWORD fileLength = GetContentSize(request);

    char* buffer;
    buffer = new char[fileLength + 1]{ 0 };

    int readLength = 0;

    while (true) {
      DWORD dwBytesRead;
      BOOL bRead;

      bRead = InternetReadFile(
        request,
        buffer,
        fileLength + 1,
        &dwBytesRead);

      error = GetLastError();

      if (dwBytesRead == 0) break;

      readLength += dwBytesRead;

      if (!bRead) {
        printf("InternetReadFile error : <%lu>\n", GetLastError());
      }
      else {
        buffer[dwBytesRead] = 0;
        printf("Retrieved %lu data bytes: %s\n", dwBytesRead, buffer);
      }
    }

    auto json = JSONReader::Parse((wchar_t*)buffer);

    if (json)
    {
      bool parsed = false;

      if (json->HasChild(L"build")) {
        auto buildObj = json->GetObjectJS(L"build", &parsed);
        if (parsed) {
          if (buildObj->HasChild(L"Major")) {
            installerInfo.FileVersion.SetMajor(
                buildObj->GetInt(L"Major", &parsed));
          }

          if (buildObj->HasChild(L"Minor")) {
            installerInfo.FileVersion.SetMinor(
                buildObj->GetInt(L"Minor", &parsed));
          }

          if (buildObj->HasChild(L"Build")) {
            installerInfo.FileVersion.SetBuild(
                buildObj->GetInt(L"Build", &parsed));
          }

          if (buildObj->HasChild(L"Revision")) {
            installerInfo.FileVersion.SetRevision(
                buildObj->GetInt(L"Revision", &parsed));
          }

          if (buildObj->HasChild(L"MarketingMajor")) {
            installerInfo.MarketingVersion.SetMajor(
                buildObj->GetInt(L"MarketingMajor", &parsed));
          }

          if (buildObj->HasChild(L"MarketingMinor")) {
            installerInfo.MarketingVersion.SetMinor(
                buildObj->GetInt(L"MarketingMinor", &parsed));
          }

          if (buildObj->HasChild(L"MarketingBuild")) {
            installerInfo.MarketingVersion.SetBuild(
                buildObj->GetInt(L"MarketingBuild", &parsed));
          }

          if (buildObj->HasChild(L"MarketingRevision")) {
            installerInfo.MarketingVersion.SetRevision(
                buildObj->GetInt(L"MarketingRevision", &parsed));
          }
        }
      }


      if (json->HasChild(L"fileName"))
      {
        installerInfo.InstallerName = json->GetString(L"fileName", &parsed);
      }
    }

    InternetCloseHandle(request);
    InternetCloseHandle(hConnect);
    InternetCloseHandle(hSession);

    return installerInfo;
  }




  int AppUpdaterService::GetContentSize(HINTERNET hHttp)
  {
    LPVOID lpOutBuffer = NULL;
    DWORD dwSize = 0;

  retry:

    // This call will fail on the first pass, because
    // no buffer is allocated.
    if (!HttpQueryInfo(hHttp, HTTP_QUERY_CONTENT_LENGTH,
      (LPVOID)lpOutBuffer, &dwSize, NULL))
    {
      if (GetLastError() == ERROR_HTTP_HEADER_NOT_FOUND)
      {
        // Code to handle the case where the header isn't available.
        return 0;
      }
      else
      {
        // Check for an insufficient buffer.
        if (GetLastError() == ERROR_INSUFFICIENT_BUFFER)
        {
          // Allocate the necessary buffer.
          lpOutBuffer = new char[dwSize];

          // Retry the call.
          goto retry;
        }
        else
        {
          // Error handling code.
          if (lpOutBuffer)
          {
            delete[] lpOutBuffer;
          }
          return 0;
        }
      }
    }


    if (lpOutBuffer)
    {
      std::wstring sizeString = std::wstring((wchar_t*)lpOutBuffer);
      int size = std::stoi(sizeString);

      delete[] lpOutBuffer;

      return size;
    }

    return 0;
  }

  void AppUpdaterService::CancelDownload()
  {
    std::scoped_lock lock(mutex_);
    if (running_state_.is_running) {
      running_state_.cancelled = true;
    }
  }

  void AppUpdaterService::SetRunningState(RunningState running_state) {
    std::scoped_lock lock(mutex_);

    running_state_ = running_state;
  }
}
