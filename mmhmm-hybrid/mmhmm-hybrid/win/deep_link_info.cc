#include "deep_link_info.h"

#include "include/cef_parser.h"
#include "../common/urls.h"

namespace mmhmm {
DeepLinkInfo::DeepLinkInfo(std::string command_line) {
  auto pos = command_line.find(urls::HybridProtocol);
  if (pos == std::string::npos) {
    return;
  }

  auto deep_link = command_line.substr(pos);
  CefURLParts url_parts;
  if (!CefParseURL(deep_link, url_parts)) {
    return;
  }

  path_ = CefString(&url_parts.path);
  fragment_ = CefString(&url_parts.fragment);
  query_ = CefString(&url_parts.query);
  target_app_ = GetTargetApp(path_.ToString());
  deep_link_ = deep_link;

  if (deep_link.empty()) {
    return;
  }

  token_ = GetArgValue(deep_link, "token=");
  meeting_id_ = GetArgValue(deep_link, "talk/");
  template_id_ = GetArgValue(deep_link, "import/");
  recording_id_ = GetArgValue(deep_link, "recordingId=");
}

bool DeepLinkInfo::IsValid() const {
  return !deep_link_.empty();
}

TargetApp DeepLinkInfo::GetTargetApp(std::string path) {
  if (path.find("camera") != std::string::npos)
    return TargetApp::camera;
  if (path.find("creator") != std::string::npos)
    return TargetApp::creator;
  if (path.find("stacks") != std::string::npos)
    return TargetApp::stacks;
  if (path.find("recorder") != std::string::npos)
    return TargetApp::recorder;

  return TargetApp::unknown;
}

std::string DeepLinkInfo::GetArgValue(std::string args, std::string key) {
  std::size_t pos = std::string::npos;
  pos = args.find(key);

  if (pos != std::string::npos) {
    std::string startingValue = args.substr(pos + key.size());
    pos = startingValue.find('&');

    std::string completeValue = "";
    if (pos != std::string::npos) {
      completeValue = startingValue.substr(0, pos);
    } else {
      completeValue = startingValue;
    }

    return completeValue;
  }

  return "";
}
}  // namespace mmhmm
