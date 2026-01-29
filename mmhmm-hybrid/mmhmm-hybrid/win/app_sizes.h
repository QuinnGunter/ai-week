#pragma once
#include "../common/titlebar_button.h"
#include "../browser/client_types.h"

namespace mmhmm {
class AppSizes {
 public:
  static SIZE GetDefaultSize(WebAppType app_type) {
    switch (app_type) {
      case WebAppType::mmhmm:
      case WebAppType::creator:
      case WebAppType::stacks:
      case WebAppType::screen_recorder:
        return {1036, 680};
      case WebAppType::camera:
        return {360, 660};
      case WebAppType::mini_remote:
        return {550, 298};
      case WebAppType::external:
      case WebAppType::broadcast:
      case WebAppType::prompt:
      case WebAppType::hybrid_api_tester:
      case WebAppType::segmentation_panel:
      case WebAppType::toolbox:
      case WebAppType::offline_wall:
      case WebAppType::settings:
      default:
        return {800, 800};
    }
  }

  static SIZE GetMinimumSize(WebAppType app_type) {
    switch (app_type) {
      case WebAppType::creator:
      case WebAppType::mmhmm:
      case WebAppType::stacks:
      case WebAppType::screen_recorder:
        return {600, 460};
      case WebAppType::camera:
        return {360, 480};
      case WebAppType::broadcast:
        return {640, 360};
      case WebAppType::external:
      case WebAppType::mini_remote:
      case WebAppType::prompt:
      case WebAppType::hybrid_api_tester:
      case WebAppType::segmentation_panel:
      case WebAppType::toolbox:
      case WebAppType::offline_wall:
      case WebAppType::settings:
      default:
        return {100, 100};
    }
  }

  static SIZE GetMaximumSize(WebAppType app_type) {
    switch (app_type) {
      case WebAppType::mmhmm:
      case WebAppType::creator:
      case WebAppType::stacks:
      case WebAppType::screen_recorder:
        return {0, 0};
      case WebAppType::camera:
        return {480, 0};
      case WebAppType::external:
      case WebAppType::mini_remote:
      case WebAppType::broadcast:
      case WebAppType::prompt:
      case WebAppType::hybrid_api_tester:
      case WebAppType::segmentation_panel:
      case WebAppType::toolbox:
      case WebAppType::offline_wall:
      case WebAppType::settings:
      default:
        return {0, 0};
    }
  }
};
}
