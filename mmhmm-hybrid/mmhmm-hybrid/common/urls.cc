#include "urls.h"
#include "../browser/client_types.h"
#include <algorithm>

namespace mmhmm {
  namespace urls {
    const std::string MiniRemoteUrl = { "http://mmhmm-client/mini-remote/index.html?theme=" };
    const std::string BroadcastUrl = { "about:blank#broadcast" };
    const std::string StreamDeckPromptUrl = { "http://mmhmm-client/streamdeck/index.html?theme=" };
    const std::string OfflineUrl = { "http://mmhmm-client/offline/index.html?home=" };
    const std::string ScreenshareUrl = {
        "http://mmhmm-client/screenshare/index.html?id="};
    const std::string SettingsUrl = {
        "http://mmhmm-client/settings/index.html?id="};
    const std::string WebMiniRemoteUrl = { "remote.html" };
    const std::string malkUrlComponent = { "mmhmm.app/talk" };
    const std::string malkAirtimeUrlComponent = { "airtimetools.com/talk" };
    const std::string malkAirtimeAlternativeUrlComponent = { "airtimetools.com/tools" };
    const std::string CameraUrlComponent = { "airtimetools.com/camera" };
    const std::string AirtimeAuthUrlComponent = { "airtimetools.com/auth" };
    const std::string HybridApiTesterUrl = { "http://mmhmm-client/hybrid-api-tester/index.html" };
    const std::string SegmentationPanelUrl = { "http://mmhmm-client/segmentation-panel/index.html" };
    const std::string ToolboxUrl = { "http://mmhmm-client/toolbox/index.html" };
    const std::string ToolboxUrlComponent = { "airtimetools.com/toolbox" };
    const std::string LocalHostUrl = { "http://localhost" };
    const std::string LocalHostSecureUrl = { "https://localhost" };
    const std::string ScreenRecorderUrlComponent = { "airtimetools.com/recorder" };
    const std::string StacksDevUrlComponent = { "airtimetools.com/talk/development/stacks.html" };
    const std::string StacksUrlComponent = { "airtimetools.com/stacks" };
    const std::string StacksLocalHostUrl = { "http://localhost:8000/stacks.html" };
    const std::string HybridProtocol = {"mmhmm-hybrid:"};
    const std::string FloatingCameraNavUrl = { "http://mmhmm-client/floating-camera-nav/index.html" };

    bool UrlContains(std::string target_url, std::string url_to_match) {
        return target_url.find(url_to_match) != std::string::npos;
    }

    bool IsAirtimeAuthUrl(std::string url) {
      return UrlContains(url, AirtimeAuthUrlComponent);
    }
  }

  WebAppType GetWebAppType(const std::string& target_url) {
    if (urls::UrlContains(target_url, urls::MiniRemoteUrl) ||
      urls::UrlContains(target_url, urls::WebMiniRemoteUrl))
      return WebAppType::mini_remote;
    if (urls::UrlContains(target_url, urls::BroadcastUrl))
      return WebAppType::broadcast;
    if (urls::UrlContains(target_url, urls::ScreenshareUrl) ||
      urls::UrlContains(target_url, urls::StreamDeckPromptUrl))
      return WebAppType::prompt;
    if ((urls::UrlContains(target_url, urls::malkUrlComponent) ||
        urls::UrlContains(target_url, urls::malkAirtimeUrlComponent) ||
        urls::UrlContains(target_url, urls::malkAirtimeAlternativeUrlComponent)) &&
        !(urls::UrlContains(target_url, urls::StacksDevUrlComponent) ||
          urls::UrlContains(target_url, urls::StacksUrlComponent) ||
          urls::UrlContains(target_url, urls::StacksLocalHostUrl)))
      return WebAppType::mmhmm;
    if (urls::UrlContains(target_url, urls::HybridApiTesterUrl))
      return WebAppType::hybrid_api_tester;
    if (urls::UrlContains(target_url, urls::SegmentationPanelUrl))
      return WebAppType::segmentation_panel;
    if ((urls::UrlContains(target_url, urls::ToolboxUrlComponent) ||
         urls::UrlContains(target_url, urls::ToolboxUrl)))
      return WebAppType::toolbox;
    if (urls::UrlContains(target_url, urls::OfflineUrl))
      return WebAppType::offline_wall;
    if (urls::UrlContains(target_url, urls::ScreenRecorderUrlComponent))
      return WebAppType::screen_recorder;
    if (urls::UrlContains(target_url, urls::StacksDevUrlComponent) ||
        urls::UrlContains(target_url, urls::StacksUrlComponent) ||
        urls::UrlContains(target_url, urls::StacksLocalHostUrl))
      return WebAppType::stacks;
    if (urls::UrlContains(target_url, urls::CameraUrlComponent))
      return WebAppType::camera;
    if (urls::UrlContains(target_url, urls::LocalHostUrl) ||
        urls::UrlContains(target_url, urls::LocalHostSecureUrl))
      return WebAppType::local_host;
    if (urls::UrlContains(target_url, urls::SettingsUrl))
      return WebAppType::settings;
    if (urls::UrlContains(target_url, urls::FloatingCameraNavUrl))
      return WebAppType::floating_camera_nav;

    return WebAppType::external;
  }
}
