//
// mmhmm Windows
// Copyright © 2020-2023 mmhmm, inc. All rights reserved.
//
#pragma once

#include <string>
#include <functional>
#include <Windows.h>
#include <wininet.h>
#include <atomic>
#include "file_version.h"
#include "spdlog/spdlog.h"
#include <nlohmann/json.hpp>
#include "../common/titlebar_button.h"
#include "../browser/client_types.h"

#pragma comment (lib, "Wininet.lib")

using json = nlohmann::json;

namespace mmhmm
{
struct AppUrl{
  std::wstring camera = L"https://app.airtimetools.com/camera";
  std::wstring creator = L"https://app.airtimetools.com/talk";
  std::wstring stacks = L"https://app.airtimetools.com/stacks";
  std::wstring screenRecorder = L"https://app.airtimetools.com/recorder";
  std::wstring toolbox = L"https://app.airtimetools.com/toolbox?stacks=true";
};

  enum class AppLaunchTrigger {
    user,
    virtual_camera,
  };

  struct mmhmmSettings {
    bool balancedMode = false;
    bool consolidatedUser = false;
    bool showStreamDeckPrompt = true;
    bool postponeStreamDeckPrompt = true;
    std::string theme = "light";
    std::string segmentationType = "unknown";
    std::string mode = "";
    std::string launchApp = "";
    std::string launchRecorderHotKey = "Ctrl+Shift+r";
    std::string createOrStopRecordingHotKey = "Ctrl+Shift+2";
    std::string recordEntireScreenHotKey = "Ctrl+Shift+6";
    std::string recordWindowHotKey = "Ctrl+Shift+7";
    std::string cameraLaunchApp = "camera";

    friend void to_json(json& j, const mmhmmSettings& s) {
      j = json{{"balancedMode", s.balancedMode},
               {"consolidatedUser", s.consolidatedUser},
               {"showStreamDeckPrompt", s.showStreamDeckPrompt},
               {"postponeStreamDeckPrompt", s.postponeStreamDeckPrompt},
               {"theme", s.theme},
               {"segmentationType", s.segmentationType},
               {"launchApp", s.launchApp},
               {"cameraLaunchApp", s.cameraLaunchApp},
               {"mode", s.mode},
               {"launchRecorderHotKey", s.launchRecorderHotKey},
               {"createOrStopRecordingHotKey", s.createOrStopRecordingHotKey},
               {"recordEntireScreenHotKey", s.recordEntireScreenHotKey},
               {"recordWindowHotKey", s.recordWindowHotKey}};
    }

    friend void from_json(const json& j, mmhmmSettings& s) {
      s.balancedMode = j.value("balancedMode", false);
      s.consolidatedUser = j.value("consolidatedUser", false);
      s.showStreamDeckPrompt = j.value("showStreamDeckPrompt", true);
      s.postponeStreamDeckPrompt = j.value("postponeStreamDeckPrompt", true);
      s.theme = j.value("theme", "light");
      s.segmentationType = j.value("segmentationType", "unknown");
      s.launchApp = j.value("launchApp", "");
      s.cameraLaunchApp = j.value("cameraLaunchApp", "camera");
      s.mode = j.value("mode", "");
      s.launchRecorderHotKey = j.value("launchRecorderHotKey", "Ctrl+Shift+r");
      s.createOrStopRecordingHotKey =
          j.value("createOrStopRecordingHotKey", "Ctrl+Shift+2");
      s.recordEntireScreenHotKey =
          j.value("recordEntireScreenHotKey", "Ctrl+Shift+6");
      s.recordWindowHotKey = j.value("recordWindowHotKey", "Ctrl+Shift+7");
    }
  };

  class AppSettingsService
  {
  public:
    AppSettingsService();
    ~AppSettingsService();

    static std::wstring GetUrlByAppType(WebAppType appType);
    static std::wstring GetHardwareUrlParams();
    static FileVersion GetFileVersion();
    static std::string GetShortVersionString();
    static std::wstring GetShortVersionStringWide();
    static void SaveSettings();
    static void LoadSettings();
    static mmhmmSettings& AppSettings();
    static void SetLog(std::shared_ptr<spdlog::logger> logger);
    static bool FetchUrls(const std::wstring& track,
                          const std::wstring& user_agent);

    static std::wstring GetApplicationPath();
    static std::wstring GetApplicationDirectory();
    static std::wstring UrlEscapeString(std::wstring unescaped);
    static std::string UrlEscapeString(std::string unescaped);
    static std::wstring GetAppDataPath();
    static std::wstring GetSentryDatabasePath();
    static std::wstring GetLogFolderPath();
    static std::wstring GetLogFilePath();
    static std::wstring GetCachePath();
    static std::wstring GetSystemReportFilePath();
    static std::wstring GetServiceConnectorLogFilePath();
    static std::wstring GetDriverNotifierLogFilePath();
    static std::wstring GetDriverClientLogFilePath();
    static std::vector<std::wstring> GetAvailableLogFiles();
    static std::wstring LoadAppModeFromRegistry();
    static std::wstring LoadLaunchAppFromRegistry();
    static std::wstring LoadStringFromRegistry(std::wstring sub_key,
                                               std::wstring value);
    static std::wstring LoadServiceConfigurationFromRegistry();
    static std::wstring LoadWebAppUrlFromRegistry(WebAppType type);
    static WebAppType GetLaunchWebAppType(
        std::optional<WebAppType> overriden_type, AppLaunchTrigger app_launch_trigger);

  private:
    static std::wstring GetServiceAddress();

  private:
    static int GetContentSize(HINTERNET hHttp);
    static const std::wstring GetSettingsPath();
    static std::wstring GetLocalAppDataPath();
    static bool urls_fetched_;
    static AppUrl AppUrls;
  };
}
