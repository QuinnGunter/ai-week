//
//  segmentation_panel_manager_mac.cc
//  mmhmm
//
//  Created by Jakub Gluszkiewicz on 27/02/2025.
//

#include "segmentation_panel_manager.h"

#include <sysdir.h>
#include <glob.h>

#include "include/cef_path_util.h"

const std::string kApplicationSupportStore = "mmhmm/segmentation";

std::string expandTilde(const char* str) {
  if (!str) return {};
  
  glob_t globbuf;
  if (glob(str, GLOB_TILDE, nullptr, &globbuf) == 0) {
    std::string result(globbuf.gl_pathv[0]);
    globfree(&globbuf);
    return result;
  }
  
  return {};
}

std::string discoverApplicationSupportPath() {
  char path[PATH_MAX];
  auto state = sysdir_start_search_path_enumeration(SYSDIR_DIRECTORY_APPLICATION_SUPPORT,
                                                    SYSDIR_DOMAIN_MASK_USER);
  if ((state = sysdir_get_next_search_path_enumeration(state, path))) {
    return expandTilde(path);
  }
  
  return std::string(path);
}

std::string SegmentationPanelManager::ResolveConfigStorePath() {
  std::string appSupportPath = discoverApplicationSupportPath() + "/" + kApplicationSupportStore;
  
  std::error_code ec;
  // if segmentation folder doesn't exist create it for later use
  if (!std::filesystem::exists(appSupportPath, ec)) {
    std::filesystem::create_directories(appSupportPath, ec);
    if (ec) {
      LOG(ERROR) << "Failed to create temporary segmentation folder. Error: " << ec.message();
      return "";
    }
  }
  
  return appSupportPath;
}

std::string SegmentationPanelManager::ResolveSegmentationConfigPath() {
  // Check if we should use alternative path from Application Support if it exist.
  std::string configFilePath = ResolveConfigStorePath() + "/" + kSegmentationConfigFileName;
  
  std::filesystem::path path(configFilePath);
  
  if (std::filesystem::exists(path) && std::filesystem::is_regular_file(path)) {
    return configFilePath;
  }
  
  // In any other case we will use default location of seglib config which is stored in application resources
  CefString resourcesPath;
  CefGetPath(PK_DIR_RESOURCES, resourcesPath);
  configFilePath = resourcesPath.ToString() + "/" + kSegmentationConfigFileName;
  
  return configFilePath;
}
