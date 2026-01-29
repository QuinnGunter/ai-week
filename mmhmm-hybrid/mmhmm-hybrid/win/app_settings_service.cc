#include "app_settings_service.h"
#include <fstream>
#include <filesystem>

#include <wininet.h>
#pragma comment (lib, "Wininet.lib")
#include <stdio.h>
#include <string>
#include <ShlObj_core.h>
#include <Shlwapi.h>

#include "json_reader.h"
#include "include/internal/cef_types.h"
#include <codecvt>
#include "..\..\common\string_util.h"
#include "..\win\system_info.h"
#include "..\win\system_report.h"
#include <browser/web_app_browser.h>

namespace mmhmm
{
  const std::wstring Endpoint = L"/public/webapp/links/";
  const std::wstring AppDataFolderName = L"\\mmhmm-desktop";
  const std::wstring SentryFolderName = L"\\.sentry-native";
  const std::wstring LogsFolderName = L"\\logs";
  const std::wstring LogFileName = L"\\ActivityLog.log";
  const std::wstring ServiceConnectorLogFileName = L"\\mmhmmServiceConnector.log";
  const std::wstring DriverNotifierLogFileName = L"\\mmhmmDriverNotifier.log";
  const std::wstring DriverClientLogFileName = L"\\mmhmmDriverClient.log";
  const std::wstring SystemReportFileName = L"\\SystemReport.log";
  const std::wstring CacheFolderName = L"\\cache";
  const std::wstring SettingsFolderName = L"\\settings";
  const std::wstring SettingsFileName = L"\\settings.json";
  const std::wstring DevelopmentServiceName = L"development";
  const std::wstring DevelopmentServiceAddress = L"dev-api.mmhmm.app";
  const std::wstring StageServiceName = L"stage";
  const std::wstring StageServiceAddress = L"stage-api.mmhmm.app";
  const std::wstring ProductionServiceAddress = L"api.mmhmm.app";
  const std::wstring MmhmmRegistryKeyName = L"Software\\MmhmmDesktop";
  const std::wstring AppModeRegistryValueName = L"AppMode";
  const std::wstring ServiceConfigurationRegistryValueName = L"ServiceConfiguration";
  const std::wstring LaunchAppRegistryValueName = L"LaunchApp";
  const std::wstring CreatorUrlKey = L"creator";
  const std::wstring CameraUrlKey = L"camera";
  const std::wstring StacksUrlKey = L"stacks";
  const std::wstring ScreenRecorderUrlKey = L"screenRecorder";
  const std::wstring ToolboxUrlKey = L"toolbox";
  const std::wstring UrlsKey = L"urls";
  const std::wstring DefaultKey = L"default";
  const std::wstring UrlKeySuffix = L"Url";
  std::wstring SettingsPath;
  mmhmmSettings settings_{false};
  std::shared_ptr<spdlog::logger> logger_;

  AppUrl AppSettingsService::AppUrls = {};
  bool AppSettingsService::urls_fetched_ = false;

  std::wstring TryGetStringFromJsonValue(const JSONValue* value,
                                         std::wstring key) {
    if (!value || !value->HasChild(key.c_str())) {
      return L"";
    }

    bool parsed = false;
    auto stringValue = value->GetString(key.c_str(), &parsed);
    return parsed ? stringValue : L"";
  }

  const JSONValue* TryGetObjectFromJsonValue(const JSONValue* value,
                                             std::wstring key) {
    if (!value || !value->HasChild(key.c_str())) {
      return nullptr;
    }

    bool parsed = false;
    auto objectValue = value->GetObjectJS(key.c_str(), &parsed);
    return parsed ? objectValue : nullptr;
  }

  AppSettingsService::AppSettingsService()
  {

  }

  AppSettingsService::~AppSettingsService()
  {

  }

  std::wstring AppSettingsService::GetServiceAddress() {
    auto service_configuration =
        PickOrUseDefault(LoadServiceConfigurationFromRegistry(), L"");

    if (client::ToLower(service_configuration) == DevelopmentServiceName)
      return DevelopmentServiceAddress;
    else if (client::ToLower(service_configuration) == StageServiceName)
      return StageServiceAddress;
    else
      return ProductionServiceAddress;
  }

    bool AppSettingsService::FetchUrls(const std::wstring& track,
                        const std::wstring& user_agent) {

    HINTERNET hSession = InternetOpen(
      user_agent.c_str(),
      INTERNET_OPEN_TYPE_PRECONFIG,
      NULL,
      NULL,
      0);

    auto service_address = GetServiceAddress();

    HINTERNET hConnect = InternetConnect(hSession,
      service_address.c_str(),
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
      (Endpoint + L"?version=" + GetShortVersionStringWide()).c_str(),
      NULL,
      NULL,
      NULL,
      INTERNET_FLAG_SECURE | INTERNET_FLAG_NO_AUTH |
      INTERNET_FLAG_DONT_CACHE | INTERNET_FLAG_PRAGMA_NOCACHE | INTERNET_FLAG_NO_CACHE_WRITE,
      0);

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

    std::string narrowJson = std::string((char*)buffer);

    std::wstring_convert<std::codecvt_utf8_utf16<wchar_t>> converter;
    std::wstring wideJson = converter.from_bytes(narrowJson);

    auto json = JSONReader::Parse(wideJson.c_str());

    if (json)
    {
      bool parsed = false;

      if (json->HasChild(L"webClientUrls"))
      {
        auto urlsObj = json->GetObjectJS(L"webClientUrls", &parsed);

        std::wstring defaultTrackVal;
        if (parsed)
        {

          if (urlsObj->HasChild(DefaultKey.c_str()))
          {
            defaultTrackVal = std::wstring(urlsObj->GetString(DefaultKey.c_str(), &parsed));
          }

          if (urlsObj->HasChild(track.c_str()))
          {
            AppUrls.creator = PickOrUseDefault(LoadWebAppUrlFromRegistry(WebAppType::creator),
                                 urlsObj->GetString(track.c_str(), &parsed));
            ;
            AppUrls.camera =
                PickOrUseDefault(LoadWebAppUrlFromRegistry(WebAppType::camera), AppUrls.creator);
            urls_fetched_ = true;
          }
        }
      }

      std::wstring defaultTrack;
      auto urlsObj = TryGetObjectFromJsonValue(json, UrlsKey.c_str());
      if (urlsObj) {
        defaultTrack = TryGetStringFromJsonValue(urlsObj, DefaultKey.c_str());
        auto trackObj = TryGetObjectFromJsonValue(urlsObj, track.c_str());

        if (trackObj) {
          AppUrls.creator = PickOrUseDefault(
              LoadWebAppUrlFromRegistry(WebAppType::creator),
              TryGetStringFromJsonValue(trackObj, CreatorUrlKey.c_str()));
          AppUrls.camera = PickOrUseDefault(
              LoadWebAppUrlFromRegistry(WebAppType::camera),
              TryGetStringFromJsonValue(trackObj, CameraUrlKey.c_str()));
          AppUrls.stacks = PickOrUseDefault(
              LoadWebAppUrlFromRegistry(WebAppType::stacks),
              TryGetStringFromJsonValue(trackObj, StacksUrlKey.c_str()));
          AppUrls.screenRecorder = PickOrUseDefault(
              LoadWebAppUrlFromRegistry(WebAppType::screen_recorder),
              TryGetStringFromJsonValue(trackObj,
                                        ScreenRecorderUrlKey.c_str()));
          AppUrls.toolbox = PickOrUseDefault(
              LoadWebAppUrlFromRegistry(WebAppType::toolbox),
              TryGetStringFromJsonValue(trackObj, ToolboxUrlKey.c_str()));
          urls_fetched_ = true;
          
        }
      }
    }

    InternetCloseHandle(request);
    InternetCloseHandle(hConnect);
    InternetCloseHandle(hSession);

    return urls_fetched_;
  }



  int AppSettingsService::GetContentSize(HINTERNET hHttp)
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

  std::wstring AppSettingsService::GetHardwareUrlParams() {
    const int string_len = 512;
    wchar_t buffer[string_len];
    std::wstring cpu_arch = L"x64";
    int num_cores = mmhmm::GetNumCores();
    std::wstring num_cores_str = std::to_wstring(num_cores);

    auto application_path = GetApplicationPath();
    auto adapter_descriptions =
        mmhmm::GetAdaptersByGpuPreference(application_path);

    int gpu_preference = 0;
    mmhmm::GetGpuPreference(application_path, gpu_preference);

    std::wstring gpu_name;
    if (gpu_preference >= 0 && gpu_preference <= 2) {
      gpu_name = adapter_descriptions[gpu_preference];
    } else {
      gpu_name = mmhmm::GetPrimaryGfxCardName();
    }

    std::wstring escaped_gpu_name = UrlEscapeString(gpu_name);
    ZeroMemory(buffer, string_len);
    auto memory_usage = mmhmm::GetFreeRAM();
    const DWORD gb_factor = 1073741824;
    std::wstring memory = std::to_wstring(
        (int)round((double)memory_usage.Total / (double)gb_factor));

    std::wstring os = mmhmm::GetOS();
    std::wstring escaped_os = UrlEscapeString(os);
    ZeroMemory(buffer, string_len);

    std::wstring os_version = mmhmm::GetOSVersion();
    std::wstring escaped_os_version = UrlEscapeString(os_version);

    std::wstring fps_param = settings_.balancedMode ? L"24" : L"30";

    std::wstring segmentation_type =
        client::ToWideString(AppSettings().segmentationType);

    return L"?cpuArch=" + cpu_arch + L"&cpuCores=" + num_cores_str +
           L"&gpuName=" + escaped_gpu_name + L"&memory=" + memory + L"&os=" +
           escaped_os + L"&osVersion=" + escaped_os_version + L"&fps=" +
           fps_param + L"&segmentation=" + segmentation_type;
  }

  std::wstring AppSettingsService::UrlEscapeString(std::wstring unescaped) {
    DWORD dw = INTERNET_MAX_URL_LENGTH;
    wchar_t escaped[INTERNET_MAX_URL_LENGTH];
    HRESULT hr = UrlEscapeW(unescaped.c_str(), escaped, &dw, URL_ESCAPE_SEGMENT_ONLY);
    if (SUCCEEDED(hr)) {
      return std::wstring(escaped);
    }
    else
    {
      return std::wstring();
    }
  }

  std::string AppSettingsService::UrlEscapeString(std::string unescaped) {
    DWORD dw = INTERNET_MAX_URL_LENGTH;
    char escaped[INTERNET_MAX_URL_LENGTH];
    HRESULT hr = UrlEscapeA(unescaped.c_str(), escaped, &dw, URL_ESCAPE_SEGMENT_ONLY);
    if (SUCCEEDED(hr)) {
      return std::string(escaped);
    }
    else
    {
      return std::string();
    }
  }

  FileVersion AppSettingsService::GetFileVersion()
  {
    FileVersion version;

    wchar_t currentDir[MAX_PATH + 1] = { 0 };

    GetModuleFileNameW(NULL, currentDir, MAX_PATH);

    DWORD  verHandle = 0;
    UINT   size = 0;
    LPBYTE lpBuffer = NULL;
    DWORD  verSize = GetFileVersionInfoSize(currentDir, &verHandle);

    if (verSize > 0)
    {
      std::vector<char> verDataBuffer(verSize);
      LPSTR verData = verDataBuffer.data();

      if (GetFileVersionInfo(currentDir, 0, verSize, verData))
      {
        if (VerQueryValue(verData, L"\\", (VOID FAR * FAR*) & lpBuffer, &size))
        {
          if (size)
          {
            auto verInfo = (VS_FIXEDFILEINFO*)lpBuffer;
            if (verInfo->dwSignature == 0xfeef04bd)
            {
              version = FileVersion((verInfo->dwFileVersionMS >> 16) & 0xffff, (verInfo->dwFileVersionMS >> 0) & 0xffff, (verInfo->dwFileVersionLS >> 16) & 0xffff, (verInfo->dwFileVersionLS >> 0) & 0xffff);
            }
          }
        }
      }
    }

    return version;
  }

  std::string AppSettingsService::GetShortVersionString() {

    auto file_version = GetFileVersion();
    return std::to_string(file_version.Major()) + "." + std::to_string(file_version.Minor()) + "." + std::to_string(file_version.Build());
  }

  std::wstring AppSettingsService::GetShortVersionStringWide() {

    auto file_version = GetFileVersion();
    return std::to_wstring(file_version.Major()) + L"." + std::to_wstring(file_version.Minor()) + L"." + std::to_wstring(file_version.Build());
  }

  void AppSettingsService::SetLog(std::shared_ptr<spdlog::logger> logger) 
  {
    logger_ = logger;
  }

  std::wstring AppSettingsService::GetUrlByAppType(WebAppType appType) {
    switch (appType) {
      case WebAppType::mmhmm:
      case WebAppType::creator:
        return AppUrls.creator +
               mmhmm::AppSettingsService::GetHardwareUrlParams();
      case WebAppType::toolbox:
        return AppUrls.toolbox;
      case WebAppType::stacks:
        return AppUrls.stacks;
      case WebAppType::camera:
        return AppUrls.camera +
               mmhmm::AppSettingsService::GetHardwareUrlParams();
      case WebAppType::screen_recorder:
        return AppUrls.screenRecorder;
      default:
        DCHECK(0);
        return L"";
    }
  }

  void AppSettingsService::SaveSettings() {

    const std::wstring filepath = GetSettingsPath();

    std::filesystem::path p(filepath);
    std::filesystem::path dir = p.parent_path();

    // Create directory if they don't exist
    if (!dir.empty() && !std::filesystem::exists(dir)) {
      std::filesystem::create_directories(dir);
    }

    if (filepath.empty()) {
      if (logger_.get()) {
        logger_->error("Settings file path is empty.");
      }
      return;
    }

    std::ofstream file(filepath);
    if (!file.is_open()) {
      if (logger_.get()) {
        logger_->error("Unable to open settings file.");
      }
      return;
    }

    json j = settings_;
    file << j.dump(4);  // 4 spaces for indentation
  }
  void AppSettingsService::LoadSettings() {

    const std::wstring filepath = GetSettingsPath();

    if (filepath.empty()) {
      if (logger_.get()) {
        logger_->error("Setting file path is empty.");
      }
      return;
    }

    std::ifstream file(filepath);
    if (!file.is_open()) {
      if (logger_.get()) {
        logger_->error("Unable to open settings file.");
      }
      return;
    }

    try {
      json j;
      file >> j;
      settings_ = j.get<mmhmmSettings>();
    } catch (...) {
      if (logger_.get()) {
        logger_->info("Error parsing settings file, use default values");
      }
      settings_ = mmhmmSettings();
    }

    if (logger_.get()) {
      logger_->info("Successfully loaded settings file.");
    }
  }
  mmhmmSettings& AppSettingsService::AppSettings() {
    return settings_;
  }

  const std::wstring AppSettingsService::GetSettingsPath() {

    if (SettingsPath.empty()) {
      auto app_data_path = GetAppDataPath();
      if (app_data_path.empty())
        return L"";

      SettingsPath = app_data_path + SettingsFolderName + SettingsFileName;
    }

    return SettingsPath;
  }

  std::wstring AppSettingsService::GetApplicationPath() {
    unsigned long length = MAX_PATH + 1;
    std::wstring path(length, '\0');
    GetModuleFileNameW(NULL, &path[0], length);
    return path;
  }

  std::wstring AppSettingsService::GetApplicationDirectory() {
    wchar_t path[MAX_PATH];
    GetModuleFileNameW(nullptr, path, MAX_PATH);
    if (PathRemoveFileSpecW(path)) {
      return std::wstring(path);
    } else {
      return std::wstring();
    }
  }

  std::wstring AppSettingsService::GetAppDataPath() {
    auto local_app_data_path = GetLocalAppDataPath();
    return !local_app_data_path.empty() ? local_app_data_path + AppDataFolderName : std::wstring();
  }

  std::wstring AppSettingsService::GetSentryDatabasePath() {
    auto app_data_path = GetAppDataPath();
    return !app_data_path.empty() ? app_data_path + SentryFolderName : std::wstring();
  }

  std::wstring AppSettingsService::GetLogFolderPath() {
    auto app_data_path = GetAppDataPath();
    return !app_data_path.empty() ? app_data_path + LogsFolderName : std::wstring();
  }

  std::wstring AppSettingsService::GetLogFilePath() {
    auto log_folder_path = GetLogFolderPath();
    return !log_folder_path.empty() ? log_folder_path + LogFileName : std::wstring();
  }

  std::wstring AppSettingsService::GetCachePath() {
    auto app_data_path = GetAppDataPath();
    return !app_data_path.empty() ? app_data_path + CacheFolderName : std::wstring();
  }

  std::wstring AppSettingsService::GetLocalAppDataPath() {
    wchar_t* folder_path;
    HRESULT res =
      SHGetKnownFolderPath(FOLDERID_LocalAppData, 0, 0, &folder_path);
    auto path = SUCCEEDED(res) ? std::wstring(folder_path) : std::wstring();
    CoTaskMemFree(static_cast<void*>(folder_path));
    return path;
  }

  std::wstring AppSettingsService::GetSystemReportFilePath() {
    auto log_folder_path = GetLogFolderPath();
    return !log_folder_path.empty() ? log_folder_path + SystemReportFileName : std::wstring();
  }

  std::wstring AppSettingsService::GetServiceConnectorLogFilePath() {
    auto log_folder_path = GetLogFolderPath();
    return !log_folder_path.empty() ? log_folder_path + ServiceConnectorLogFileName : std::wstring();
  }

  std::wstring AppSettingsService::GetDriverNotifierLogFilePath() {
    auto log_folder_path = GetLogFolderPath();
    return !log_folder_path.empty() ? log_folder_path + DriverNotifierLogFileName : std::wstring();
  }

  std::wstring AppSettingsService::GetDriverClientLogFilePath() {
    auto log_folder_path = GetLogFolderPath();
    return !log_folder_path.empty() ? log_folder_path + DriverClientLogFileName : std::wstring();
  }

  std::vector<std::wstring> AppSettingsService::GetAvailableLogFiles() {
    std::vector<std::wstring> files;
    if (std::filesystem::exists(GetLogFilePath()))
      files.push_back(GetLogFilePath());

    if (std::filesystem::exists(GetServiceConnectorLogFilePath()))
      files.push_back(GetServiceConnectorLogFilePath());

    if (std::filesystem::exists(GetDriverNotifierLogFilePath()))
      files.push_back(GetDriverNotifierLogFilePath());

    if (std::filesystem::exists(GetDriverClientLogFilePath()))
      files.push_back(GetDriverClientLogFilePath());

    if (std::filesystem::exists(GetSystemReportFilePath()))
      files.push_back(GetSystemReportFilePath());

    return files;
  }

  std::wstring AppSettingsService::LoadAppModeFromRegistry() {
    return LoadStringFromRegistry(MmhmmRegistryKeyName,
                                  AppModeRegistryValueName);
  }

  std::wstring AppSettingsService::LoadLaunchAppFromRegistry() {
    return LoadStringFromRegistry(MmhmmRegistryKeyName,
                                  LaunchAppRegistryValueName);
  }

  std::wstring AppSettingsService::LoadServiceConfigurationFromRegistry() {
    return LoadStringFromRegistry(MmhmmRegistryKeyName,
                                  ServiceConfigurationRegistryValueName);
  }

  std::wstring AppSettingsService::LoadWebAppUrlFromRegistry(WebAppType type) {
    return LoadStringFromRegistry(MmhmmRegistryKeyName,
        client::ToWideString(WebAppToString(type)) + UrlKeySuffix);
  }

  WebAppType AppSettingsService::GetLaunchWebAppType(
      std::optional<WebAppType> overriden_type, AppLaunchTrigger app_launch_trigger) {
    std::optional<WebAppType> web_app_type = overriden_type;
    if (!overriden_type.has_value()) {
      web_app_type = mmhmm::WebAppFromString(
          app_launch_trigger == AppLaunchTrigger::user
              ? AppSettingsService::AppSettings().launchApp
              : AppSettingsService::AppSettings().cameraLaunchApp);
      if (!web_app_type.has_value()) {
        // fallback to registry
        web_app_type = mmhmm::WebAppFromString(client::ToNarrowString(
            AppSettingsService::LoadLaunchAppFromRegistry()));
      }
    }

    return web_app_type.has_value() ? web_app_type.value() : WebAppType::camera;
  }

  std::wstring AppSettingsService::LoadStringFromRegistry(std::wstring sub_key,
    std::wstring value) {
    WCHAR val[MAX_PATH];
    DWORD dataSize = sizeof(val);
    if (ERROR_SUCCESS == RegGetValue(HKEY_CURRENT_USER,
                                     sub_key.c_str(),
                                     value.c_str(),
                                     RRF_RT_REG_SZ, nullptr, &val, &dataSize)) {
      return std::wstring(val);
    } else {
      logger_->warn("Unable to resolve value from registry.");
      return std::wstring();
    }
  }
  }
