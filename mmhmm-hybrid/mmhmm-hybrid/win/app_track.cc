#include "app_track.h"
#include "app_config.h"
#include "..\common\string_util.h"

namespace mmhmm {

AppTrackService::_init::_init() {
  std::wstring track = client::ToWideString(MMHMM_WIN_TRACK);

  if (track.compare(mmhmm::TrackConstants::QA) == 0) {
    AppTrackService::app_track_label_ = L"QA";
    AppTrackService::web_client_urls_key_ = L"test";
    AppTrackService::app_updater_track_ = mmhmm::TrackConstants::QA;

  } else if (track.compare(mmhmm::TrackConstants::Alpha) == 0) {
    AppTrackService::app_track_label_ = L"Alpha";
    AppTrackService::web_client_urls_key_ = L"alpha";
    AppTrackService::app_updater_track_ = mmhmm::TrackConstants::Alpha;

  } else if (track.compare(mmhmm::TrackConstants::Beta) == 0) {
    AppTrackService::app_track_label_ = L"Beta";
    AppTrackService::web_client_urls_key_ = L"beta";
    AppTrackService::app_updater_track_ = mmhmm::TrackConstants::Beta;

  } else if (track.compare(mmhmm::TrackConstants::Prod) == 0) {
    AppTrackService::app_track_label_ = L"";
    AppTrackService::web_client_urls_key_ = L"production";
    AppTrackService::app_updater_track_ = mmhmm::TrackConstants::Prod;

  } else {
    AppTrackService::app_track_label_ = L"";
    AppTrackService::web_client_urls_key_ = L"default";
    AppTrackService::app_updater_track_ = mmhmm::TrackConstants::Prod;
  }
}

std::wstring AppTrackService::app_updater_track_;
std::wstring AppTrackService::app_track_label_;
std::wstring AppTrackService::web_client_urls_key_;

AppTrackService::_init AppTrackService::_initializer;
}  // namespace mmhmm
