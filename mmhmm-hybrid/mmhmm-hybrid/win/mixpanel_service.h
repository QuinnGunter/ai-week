#pragma once
#include <windows.h>
#include <wininet.h>
#include <atomic>
#include <mutex>
#include <queue>
#include <string>

#include <spdlog/spdlog.h>
#include "../common/titlebar_button.h"
#include <browser/client_types.h>

namespace mmhmm {

enum MixPanelEventType {
  cameraConnected,
  cameraDisconnected,
  cameraInstallationAttempted,
  cameraInstallationSucceed,
  cameraInstallationCanceled,
  cameraInstallationFailed,
  cameraUninstallationSucceed,
  cameraUninstallationFailed,
};

struct MixPanelMessageParams {
  std::string user_id = "";
  std::string bundle_id = "";
  std::string session_id = "";
  std::string web_app_build = "";
  std::string web_app_track = "";
  std::string error_signature = "";
  std::string app_type = "";
  int session_duration_s = 0;
};

class MixpanelService {
  struct MixpanelMessage {
    uint64_t next_send = 0;
    int retry_count = 0;
    std::string message_body;

    bool operator<(const MixpanelMessage& other) const {
      return next_send < other.next_send;
    }

    bool operator>(const MixpanelMessage& other) const {
      return next_send > other.next_send;
    }
  };

  struct MixpanelSendResult {
    bool successful = false;
    bool should_retry = false;
  };

 public:
  MixpanelService(std::wstring track, std::wstring app_version, std::shared_ptr<spdlog::logger> logger);
  ~MixpanelService();
  bool Identify(std::wstring user_id);
  void Reset();
  void SendMixPanelEvent(MixPanelEventType event,
                         std::wstring user_id,
                         std::wstring bundle_id,
                         std::wstring session_id,
                         int session_duration_s,
                         std::wstring web_app_build,
                         std::wstring web_app_track,
                         std::wstring error,
                         WebAppType app_type);
  
 private:
  std::wstring GetDistinctIdFromRegistry();
  std::string BuildIdentifyMessage();
  std::string BuildMixPanelMessage(MixPanelEventType event,
                                   const MixPanelMessageParams& params);

  std::string GetMixPanelEventName(MixPanelEventType eventType);
  MixpanelSendResult GetSendResult(HINTERNET request);
  MixpanelSendResult SendMixpanelMessage(std::string message);
  std::string GetInsertId();
  int GetTimestamp();
  void Run();

 private:
  std::wstring distinct_id_;
  std::wstring user_id_;
  std::wstring app_version_;
  std::wstring track_;

  std::condition_variable conditional_;
  std::mutex mutex_;
  std::thread thread_;
  std::priority_queue<MixpanelMessage, std::vector<MixpanelMessage>,
      std::greater<MixpanelMessage>> messages_;
  std::atomic_bool running_;
  std::shared_ptr<spdlog::logger> logger_;
};
}  // namespace mmhmm
