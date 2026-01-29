#include "mixpanel_service.h"
#include <Rpc.h>
#include <rpcdce.h>
#include <chrono>
#include <sstream>
#include "../common/string_util.h"
#include "app_settings_service.h"
#include "app_track.h"
#include "nlohmann/json.hpp"
#include "utils.h"

using namespace std::chrono;

namespace mmhmm {

const std::wstring UserAgent = L"Mozilla/5.0";
const std::wstring RegistryKeyName = L"Software\\MmhmmDesktop";
const std::wstring RegistryValueName = L"UserUUID";
const std::wstring MixpanelServerURL = L"api.mixpanel.com";
const std::wstring ApiEndpoint = L"/track?ip=1";
const std::wstring Accept = L"text/plain";
const std::wstring PostVerb = L"POST";
const std::wstring Header =
    L"Content-Type:application/x-www-form-urlencoded\r\n";
const std::wstring ProductionToken = L"0c26da7066a11eaf69262e5020ebbccf";
const std::wstring Os = L"Windows";
const std::wstring AppType = L"mmhmm.windows.hybrid";
const std::wstring Component = L"hybrid";
const std::string DisconnectedMessageName = "camera.app.disconnected";
const std::string ConnectedMessageName = "camera.app.connected";
const std::string InstallationAttemptMessageName = "virtual_camera_installation_attempted";
const std::string InstallationSucceedMessageName = "virtual_camera_installation_successful";
const std::string InstallationCanceledMessageName = "virtual_camera_installation_cancelled";
const std::string InstallationFailedMessageName = "virtual_camera_installation_failed";
const std::string UninstallationSucceedMessageName = "virtual_camera_uninstallation_successful";
const std::string UninstallationFailedMessageName = "virtual_camera_uninstallation_failed";
const std::string CreatorMixpanelName = "creator";
const std::string CameraMixpanelName = "camera";

const int MaxRetryCount = 10;
const int RetryIntervalMs = 500;
    
MixpanelService::MixpanelService(std::wstring track,
                                 std::wstring app_version,
                                 std::shared_ptr<spdlog::logger> logger)
    : app_version_(app_version), track_(track), logger_(logger) {
  distinct_id_ = GetDistinctIdFromRegistry();
  running_.store(true);
  thread_ = std::thread(&MixpanelService::Run, this);
}

MixpanelService::~MixpanelService() {
  {
    std::scoped_lock lock(mutex_);
    running_.store(false);
  }
  conditional_.notify_all();
  if (thread_.joinable()) {
    thread_.join();
  }
}

bool MixpanelService::Identify(std::wstring user_id) {
  if (user_id.empty() || distinct_id_.empty()) {
    return false;
  }

  user_id_ = user_id;
  MixpanelMessage message;
  message.message_body = BuildIdentifyMessage();
  {
    std::scoped_lock lock(mutex_);
    messages_.push(message);
  }
  conditional_.notify_one();
  return true;
}

void MixpanelService::SendMixPanelEvent(MixPanelEventType event,
                                        std::wstring user_id,
                                        std::wstring bundle_id,
                                        std::wstring session_id,
                                        int session_duration_s,
                                        std::wstring web_app_build,
                                        std::wstring web_app_track,
                                        std::wstring error,
                                        WebAppType app_type) {
  MixPanelMessageParams params{};
  
  params.user_id = client::ToNarrowString(user_id);
  params.bundle_id = client::ToNarrowString(bundle_id);
  params.session_id = client::ToNarrowString(session_id);
  params.session_duration_s = session_duration_s;
  params.web_app_build = client::ToNarrowString(web_app_build);
  params.web_app_track = client::ToNarrowString(web_app_track);
  params.error_signature = client::ToNarrowString(error);
  params.app_type = app_type == WebAppType::creator ? CreatorMixpanelName
                                                    : CameraMixpanelName;
  
  MixpanelMessage message;

  // Build MixPanelMessage can throw.
  try {
    message.message_body = BuildMixPanelMessage(event, params);
  } catch (std::exception ex) {
    logger_->error("Unable to build MixPanel message: {}", ex.what());
    return;
  }
  
  {
    std::scoped_lock lock(mutex_);
    messages_.push(message);
  }
  conditional_.notify_one();
}

void MixpanelService::Reset() {
  user_id_ = std::wstring();
}

std::wstring MixpanelService::GetDistinctIdFromRegistry() {
  WCHAR val[MAX_PATH];
  DWORD dataSize = sizeof(val);

  if (ERROR_SUCCESS == RegGetValue(HKEY_CURRENT_USER, RegistryKeyName.c_str(),
                                   RegistryValueName.c_str(), RRF_RT_REG_SZ,
                                   nullptr, &val, &dataSize)) {
    return std::wstring(val);
  } else {
    logger_->warn("Unable to resolve distinct id from registry.");
    return std::wstring();
  }
}

std::string MixpanelService::BuildIdentifyMessage() {
  std::stringstream ss;
  ss << "data=";

  nlohmann::json json;
  json["event"] = "$identify";
  json["properties"] = {{"$identified_id", client::ToNarrowString(user_id_)},
                        {"$anon_id", client::ToNarrowString(distinct_id_)},
                        {"token", client::ToNarrowString(ProductionToken)}};
  ss << mmhmm::AppSettingsService::UrlEscapeString(json.dump());
  return ss.str();
}

std::string MixpanelService::BuildMixPanelMessage(
    MixPanelEventType event,
    const MixPanelMessageParams& params) {
  std::stringstream ss;
  ss << "data=";

  nlohmann::json json;
  json["event"] = GetMixPanelEventName(event);
  json["properties"] = {
      {"$user_id", params.user_id},
      {"distinct_id", params.user_id},
      {"app", client::ToNarrowString(AppType)},
      {"component", client::ToNarrowString(Component)},
      {"hybrid_version", client::ToNarrowString(app_version_)},
      {"$os", client::ToNarrowString(Os)},
      {"hybrid_release_track", client::ToNarrowString(track_)},
      {"release_track", params.web_app_track},
      {"token", client::ToNarrowString(ProductionToken)},
      {"$insert_id", GetInsertId()},
      {"build", params.web_app_build},
      {"time", std::to_string(GetTimestamp())},
      {"mode", params.app_type}};

  // Event specific fields

  if (event == MixPanelEventType::cameraConnected ||
      event == MixPanelEventType::cameraDisconnected) {
    json["properties"].push_back({"bundle_id", params.bundle_id});
    json["properties"].push_back({"session_id", params.session_id});
  }

  if (event == MixPanelEventType::cameraDisconnected) {
    json["properties"].push_back({ "duration", std::to_string(params.session_duration_s) });
  }

  if (event == MixPanelEventType::cameraInstallationFailed ||
      event == MixPanelEventType::cameraUninstallationFailed) {
    json["properties"].push_back({"ErrorSignature", params.error_signature});
  }

  ss << mmhmm::AppSettingsService::UrlEscapeString(json.dump());
  return ss.str();
}

std::string MixpanelService::GetInsertId() {
  std::wstring guid = mmhmm::utils::GenerateGuidString();
  if (guid.length() >= 36) {
    return client::ToNarrowString(guid.substr(1, 36));
  }

  logger_->warn("Unexpected id structure!");
  return std::string();
}

int MixpanelService::GetTimestamp() {
  return duration_cast<seconds>(system_clock::now().time_since_epoch()).count();
}

std::string MixpanelService::GetMixPanelEventName(MixPanelEventType event) {
  switch (event) {
    case MixPanelEventType::cameraConnected:
      return ConnectedMessageName;
    case MixPanelEventType::cameraDisconnected:
      return DisconnectedMessageName;
    case MixPanelEventType::cameraInstallationAttempted:
      return InstallationAttemptMessageName;
    case MixPanelEventType::cameraInstallationSucceed:
      return InstallationSucceedMessageName;
    case MixPanelEventType::cameraInstallationCanceled:
      return InstallationCanceledMessageName;
    case MixPanelEventType::cameraInstallationFailed:
      return InstallationFailedMessageName;
    case MixPanelEventType::cameraUninstallationSucceed:
      return UninstallationSucceedMessageName;
    case MixPanelEventType::cameraUninstallationFailed:
      return UninstallationFailedMessageName;
    default:
      throw std::invalid_argument("Unknown MixPanelEventType");
  }
}

MixpanelService::MixpanelSendResult MixpanelService::GetSendResult(
    HINTERNET hHttp) {
  DWORD statusCode = 0;
  DWORD length = sizeof(DWORD);
  HttpQueryInfo(hHttp, HTTP_QUERY_STATUS_CODE | HTTP_QUERY_FLAG_NUMBER,
                &statusCode, &length, NULL);

  MixpanelService::MixpanelSendResult result;
  result.successful = statusCode == 200;
  result.should_retry =
      statusCode == 429 || statusCode == 502 || statusCode == 503;
  return result;
}

MixpanelService::MixpanelSendResult MixpanelService::SendMixpanelMessage(
    std::string message) {
  HINTERNET session = InternetOpen(UserAgent.c_str(),
                                   INTERNET_OPEN_TYPE_PRECONFIG, NULL, NULL, 0);
  MixpanelSendResult result;
  if (!session) {
    logger_->error("Unable to open MixPanel session.");
    return result;
  }

  HINTERNET connection =
      InternetConnect(session, MixpanelServerURL.c_str(), 0, L"", L"",
                      INTERNET_SERVICE_HTTP, INTERNET_FLAG_SECURE, 0);

  if (!connection) {
    InternetCloseHandle(session);
    logger_->error("Unable to estabilish MixPanel connection.");
    return result;
  }

  const wchar_t* accept[] = {Accept.c_str(), NULL};
  HINTERNET request = HttpOpenRequest(
      connection, PostVerb.c_str(), ApiEndpoint.c_str(), NULL, NULL, accept,
      INTERNET_FLAG_SECURE | INTERNET_FLAG_NO_AUTH | INTERNET_FLAG_DONT_CACHE |
          INTERNET_FLAG_PRAGMA_NOCACHE | INTERNET_FLAG_NO_CACHE_WRITE,
      0);

  if (!request) {
    InternetCloseHandle(connection);
    InternetCloseHandle(session);
    logger_->error("Unable to send MixPanel message.");
    return result;
  }

  bool send_result = HttpSendRequest(
      request, Header.c_str(), (DWORD)Header.size(), (LPVOID)message.c_str(),
      (DWORD)message.length() * sizeof(char));

  if (send_result) {
    result = GetSendResult(request);
  } else {
    result.should_retry = true;
  }

  InternetCloseHandle(request);
  InternetCloseHandle(connection);
  InternetCloseHandle(session);

  return result;
}

void MixpanelService::Run() {
  while (running_) {
    std::unique_lock<std::mutex> message_lock(mutex_);
    // Next send time is based on an exponential retry-backoff pattern with a maximum of 10 retries
    // https://docs.aws.amazon.com/prescriptive-guidance/latest/cloud-design-patterns/retry-backoff.html
    system_clock::time_point next_wake_up =
        !messages_.empty()
            ? time_point<system_clock>{milliseconds(messages_.top().next_send)}
            : time_point<system_clock>::max();

    conditional_.wait_until(message_lock, next_wake_up, [this] {
      return !running_ ||
             (!messages_.empty() && (messages_.top().next_send <
                                     (uint64_t)duration_cast<milliseconds>(
                                         system_clock::now().time_since_epoch())
                                         .count()));
    });

    if (running_ && !messages_.empty()) {
      auto message_to_send = messages_.top();
      messages_.pop();
      // Release lock to allow new messages to be added while we are sending.
      message_lock.unlock();

      auto send_result = SendMixpanelMessage(message_to_send.message_body);
      if (!send_result.successful &&
          message_to_send.retry_count < MaxRetryCount &&
          send_result.should_retry) {
        auto next_message_wake_up =
            duration_cast<milliseconds>(system_clock::now().time_since_epoch())
                .count() +
            static_cast<long long>(message_to_send.retry_count) *
                RetryIntervalMs;
        message_to_send.retry_count++;
        message_to_send.next_send = next_message_wake_up;
        message_lock.lock();
        messages_.push(message_to_send);
        message_lock.unlock();
      }
    }
  }
}
}  // namespace mmhmm
