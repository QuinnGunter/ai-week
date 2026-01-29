//
//  segmentationPanelManager.h
//  mmhmm
//
//  Created by Jakub Gluszkiewicz on 27/02/2025.
//
//  This class manages the segmentation panel functionality in the hybrid application.
//  It handles communication between the web app and the segmentation panel, as well as
//  configuration storage and retrieval.

#pragma once

#include <map>
#include <string>
#include <fstream>

#include "include/cef_base.h"
#include "include/cef_values.h"

namespace client {
    class RootWindow;
}

/**
 * Default filename for the segmentation configuration file.
 */
const std::string kSegmentationConfigFileName = "seglib_metal.json";

/**
 * @class SegmentationPanelManager
 * @brief Manages the segmentation panel UI and configuration.
 *
 * This class is responsible for managing communication between the main web application
 * and the segmentation panel. It handles configuration loading, saving, and executing
 * JavaScript in the appropriate contexts to change parameters of segmentation..
 */
class SegmentationPanelManager {
 public:
  /** Default constructor */
  SegmentationPanelManager() = default;
  
  /** Default destructor */
  ~SegmentationPanelManager() = default;

  /**
   * @brief Executes JavaScript code in the main web application.
   * @param javascript The JavaScript code to execute.
   */
  void ExecuteJavascriptOnWebApp(const std::string javascript) const;
  
  /**
   * @brief Executes JavaScript code in the segmentation panel.
   * @param javascript The JavaScript code to execute.
   */
  void ExecuteJavascriptOnSegmentationPanel(const std::string javascript) const;
  
  /**
   * @brief Called when the segmentation panel is opened.
   * @param browser_id The ID of the browser instance.
   */
  void OnOpen(int browser_id);
  
  /**
   * @brief Called when the segmentation configuration data has changed.
   * @param json_data The updated configuration data in JSON format.
   */
  void OnDataChanged(std::string json_data);
  
 private:
  /**
   * @brief Resolves the path to the segmentation configuration file depends of location priority.
   * @return The full path to the configuration file.
   */
  std::string ResolveSegmentationConfigPath();
  
  /**
   * @brief Resolves the path to the configuration storage directory (Mac Application Support, Win, AppData).
   * @return The full path to the configuration storage directory.
   */
  std::string ResolveConfigStorePath();
  
  /**
   * @brief Loads the configuration file, deserializes it, and converts it to a string.
   * @return The configuration as a JSON string.
   */
  std::string DeserializeAndStringifyConfig();
  
  /**
   * @brief Saves the provided JSON data to the configuration file.
   * @param json_data The JSON data to save.
   */
  void SaveJsonFile(std::string json_data);
  
  /**
   * The ID of the browser instance associated with the segmentation panel.
   * A value of -1 indicates that no browser is currently associated.
   */
  int browser_id_ = -1;
};
