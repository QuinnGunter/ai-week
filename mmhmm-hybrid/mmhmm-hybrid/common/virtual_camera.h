//
//  virtual_camera.h
//  mmhmm
//
//  Created by Beni Federer on 08.11.24.
//

#pragma once

#include "include/internal/cef_ptr.h"
#include "include/cef_values.h"

namespace mmhmm {
  enum class VirtualCameraRawState {
    notInstalled = 0,
    notInstallable,
    awaitingUserApproval,
    installed,
    installing,
    needsUpdate,
    needsReboot,
    uninstalling,
    error,
  };

  struct VirtualCameraState {
    explicit VirtualCameraState(VirtualCameraRawState rawState, std::string additionalInfo)
    : rawState(rawState), description(ToString()), additionalInfo(additionalInfo) {}
    VirtualCameraState() {}

    VirtualCameraRawState rawState = VirtualCameraRawState::notInstalled;
    std::string description;
    std::string additionalInfo;

    static const std::string dictionaryKey;
    static const std::string rawStateKey;
    static const std::string descriptionKey;
    static const std::string additionalInfoKey;

    CefRefPtr<CefDictionaryValue> ToCefDictionary();
    void FromCefDictionary(CefRefPtr<CefDictionaryValue> dictionary);

  private:
    std::string ToString();
  };

  inline bool operator==(const VirtualCameraState& lhs, const VirtualCameraState& rhs) {
    return lhs.rawState == rhs.rawState &&
    lhs.additionalInfo == rhs.additionalInfo &&
    lhs.description == rhs.description;
  }
  inline bool operator!=(const VirtualCameraState& lhs, const VirtualCameraState& rhs) { return !(lhs == rhs); }

  struct VirtualCamera {
    VirtualCameraState state;
    std::vector<std::string> clients;

    static const std::string dictionaryKey;
    static const std::string clientsKey;
    
    /// Sends a process message to the browser notifying of the Install action.
    void Install();

    /// Sends a process message to the browser notifying of the Uninstall action.
    void Uninstall();

    /// Sends a process message to the browser notifying of the Authorize action.
    void Authorize();

    CefRefPtr<CefDictionaryValue> ToCefDictionary();
    void FromCefDictionary(CefRefPtr<CefDictionaryValue> dictionary);
  };
}
