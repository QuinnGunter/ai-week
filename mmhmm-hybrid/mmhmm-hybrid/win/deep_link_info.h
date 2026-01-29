#pragma once
#include <string>
#include "include/cef_base.h"

namespace mmhmm {

enum class TargetApp { unknown, camera, creator, stacks, recorder };

class DeepLinkInfo {
 public:
  DeepLinkInfo(std::string command_line);
  ~DeepLinkInfo() = default;
  bool IsValid() const;
  CefString GetPath() const { return path_; }
  CefString GetFragment() const { return fragment_; }
  CefString GetQuery() const { return query_; }
  TargetApp GetTargetApp() const { return target_app_; }
  CefString GetToken() const { return token_; }
  CefString GetMeetingId() const { return meeting_id_; }
  CefString GetTemplateId() const { return template_id_; }
  CefString GetRecordingId() const { return recording_id_; }
  bool HasKnownMalkToken() const {
    return !(meeting_id_.empty() && template_id_.empty() &&
             recording_id_.empty());
  }

 private:
  TargetApp GetTargetApp(std::string path);
  std::string GetArgValue(std::string args, std::string key);

 private:
  std::string deep_link_;
  TargetApp target_app_ = TargetApp::unknown;
  CefString path_;
  CefString fragment_;
  CefString query_;
  CefString token_;
  CefString meeting_id_;
  CefString template_id_;
  CefString recording_id_;
};
}  // namespace mmhmm
