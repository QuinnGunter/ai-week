//
//  segmentation_panel_manager.cc
//  mmhmm
//
//  Created by Jakub Gluszkiewicz on 27/02/2025.
//

#include "segmentation_panel_manager.h"

#include "../browser/root_window_manager.h"
#include "../browser/main_context.h"
#include "../streamDeck/ThirdParty/nlohmann/json.hpp"

#include "../browser/client_prefs.h"
#include "../common/urls.h"

void SegmentationPanelManager::OnOpen(int browser_id) {
  browser_id_ = browser_id;
  
  auto initialDataString = DeserializeAndStringifyConfig();
  
  ExecuteJavascriptOnSegmentationPanel("setInitialData(" + initialDataString + ");");
}

void SegmentationPanelManager::OnDataChanged(std::string json_data) {
  SaveJsonFile(json_data);
  
  ExecuteJavascriptOnWebApp("gApp.localPresenter.videoTrack.applyConstraints({segmentationMode: 'silhouette'})");
}

void SegmentationPanelManager::ExecuteJavascriptOnWebApp(std::string javascript) const {
  auto browser = client::MainContext::Get()
                     ->GetRootWindowManager()
                     ->GetParentWindowBrowserForBrowser(browser_id_);
  
  if (!browser) {
    return;
  }
  
  browser->GetMainFrame()->ExecuteJavaScript(CefString(javascript), browser->GetMainFrame()->GetURL(), 0);
}

void SegmentationPanelManager::ExecuteJavascriptOnSegmentationPanel(std::string javascript) const {
  auto context = client::MainContext::Get();
  if (!context){
    return;
  }
  
  auto window_manager = context->GetRootWindowManager();
  if (!window_manager) {
    return;
  }
  
  auto segmentation_panel_window = window_manager->GetWindowForBrowser(browser_id_);
  
  if (!segmentation_panel_window) {
    return;
  }
  
  auto browser = segmentation_panel_window->GetBrowser();
  
  if (!browser) {
    return;
  }
  
  browser->GetMainFrame()->ExecuteJavaScript(CefString(javascript), browser->GetMainFrame()->GetURL(), 0);
}

std::string SegmentationPanelManager::DeserializeAndStringifyConfig() {
  std::string config_path = ResolveSegmentationConfigPath();
  
  if (config_path.empty()) {
    return "";
  }
  
  try {
    std::ifstream jsonFile(config_path);
    if (!jsonFile.is_open()) {
      return "";
    }
    
    nlohmann::json jsonData = nlohmann::json::parse(jsonFile);
    
    std::string jsonString = jsonData.dump(4, ' ', false);
    return jsonString;
  }
  catch (...) {
    LOG(ERROR) << "Unable to read segmentation config file.";
    return "";
  }
}

void SegmentationPanelManager::SaveJsonFile(std::string json_data) {
  std::string storeLocation = ResolveConfigStorePath() + "/" + kSegmentationConfigFileName;
  
  try {
    std::ofstream file(storeLocation.c_str(), std::ios::out | std::ios::trunc);
    
    if (!file.is_open()) {
      LOG(ERROR) << "Failed to open config file for writing. File: " << storeLocation;
      return;
    }
    
    file << json_data;
    
    if (file.bad()) {
      LOG(ERROR) << "Unable to write config file. File: " << storeLocation;
      return;
    }
    
    file.flush();
    
    file.close();
    
    if (file.fail() && !file.eof()) {
      LOG(ERROR) << "Failed to close config file for writing. File: " << storeLocation;
      return;
    }
  } catch (const std::exception& e) {
    LOG(ERROR) << "Exception during saving config file. Ex: " <<  e.what();
  } catch (...) {
    LOG(ERROR) << "Unknown error during saving config file.";
  }
}
