
#pragma once

#include <string>
enum class WebAppType;

namespace mmhmm {
  namespace urls {
    extern const std::string MiniRemoteUrl;
    extern const std::string BroadcastUrl;
    extern const std::string StreamDeckPromptUrl;
    extern const std::string OfflineUrl;
    extern const std::string ScreenshareUrl;
    extern const std::string SettingsUrl;
    extern const std::string WebMiniRemoteUrl;
    extern const std::string malkUrlComponent;
    extern const std::string CameraUrlComponent;
    extern const std::string AirtimeAuthUrlComponent;
    extern const std::string HybridApiTesterUrl;
    extern const std::string SegmentationPanelUrl;
    extern const std::string ToolboxUrl;
    extern const std::string ToolboxUrlComponent;
    extern const std::string ScreenRecorderUrlComponent;
    extern const std::string StacksDevUrlComponent;
    extern const std::string StacksUrlComponent;
    extern const std::string HybridProtocol;
    extern const std::string LocalHostUrl;
    extern const std::string LocalHostSecureUrl;
    extern const std::string FloatingCameraNavUrl;

    bool UrlContains(std::string target_url, std::string url_to_match);
    bool IsAirtimeAuthUrl(std::string url);
  }

  WebAppType GetWebAppType(const std::string& target_url);
}


