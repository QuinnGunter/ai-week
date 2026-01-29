// attempt at static constructor
// https://stackoverflow.com/questions/1197106/static-constructors-in-c-i-need-to-initialize-private-static-objects

#pragma once
#include <string>

namespace mmhmm {

class AppTrackService {
 public:
  static std::wstring get_app_track_label() { return app_track_label_; }
  static std::wstring get_web_client_urls_key() { return web_client_urls_key_; }
  static std::wstring get_app_updater_track() { return app_updater_track_; }

private:
  static std::wstring app_track_label_;
  static std::wstring web_client_urls_key_;
  static std::wstring app_updater_track_;

  static class _init {
   public:
    _init();
  } _initializer;
};

namespace TrackConstants {
    constexpr inline std::wstring_view Prod = L"prod";
    constexpr inline std::wstring_view Beta = L"beta";
    constexpr inline std::wstring_view QA = L"qa";
    constexpr inline std::wstring_view Alpha = L"uat";
    };
}  // namespace mmhmm
