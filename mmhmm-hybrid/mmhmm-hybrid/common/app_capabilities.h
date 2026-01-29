#pragma once

#include "include/internal/cef_ptr.h"
#include "include/cef_values.h"

namespace mmhmm {
  enum class CaptureDeviceRawState {
    notDetermined = 0,
    restricted,
    denied,
    authorized,
  };

  struct CaptureDeviceState {
    explicit CaptureDeviceState(CaptureDeviceRawState rawState, std::string additionalInfo)
    : rawState(rawState), description(ToString()), additionalInfo(additionalInfo) {}

    CaptureDeviceState() {}

    CaptureDeviceState(CefRefPtr<CefDictionaryValue> dictionary) { FromCefDictionary(dictionary); }

    CaptureDeviceRawState rawState = CaptureDeviceRawState::notDetermined;
    std::string description;
    std::string additionalInfo;

    static const std::string dictionaryKey;
    static const std::string rawStateKey;
    static const std::string descriptionKey;
    static const std::string additionalInfoKey;

    CefRefPtr<CefDictionaryValue> ToCefDictionary();
  private:
    std::string ToString();
    void FromCefDictionary(CefRefPtr<CefDictionaryValue> dictionary);
  };

  inline bool operator==(const CaptureDeviceState& lhs, const CaptureDeviceState& rhs) {
    return lhs.rawState == rhs.rawState &&
    lhs.additionalInfo == rhs.additionalInfo &&
    lhs.description == rhs.description;
  }

  inline bool operator!=(const CaptureDeviceState& lhs, const CaptureDeviceState& rhs) { return !(lhs == rhs); }

  struct Camera {
    CaptureDeviceState state;
    static const std::string dictionaryKey;

    /// Sends a process message to the browser notifying of the Authorize action.
    void Authorize();

    CefRefPtr<CefDictionaryValue> ToCefDictionary();
    void FromCefDictionary(CefRefPtr<CefDictionaryValue> dictionary);
  };

  struct Microphone {
    CaptureDeviceState state;
    static const std::string dictionaryKey;

    /// Sends a process message to the browser notifying of the Authorize action.
    void Authorize();

    CefRefPtr<CefDictionaryValue> ToCefDictionary();
    void FromCefDictionary(CefRefPtr<CefDictionaryValue> dictionary);
  };

  struct HardwareInfo {
    static const std::string dictionaryKey;
    std::string cpuArch;
    std::string cpuCores;
    std::string gpuName;
    std::string memory;
    std::string model;
    std::string os;
    std::string osVersion;

    CefRefPtr<CefDictionaryValue> ToCefDictionary();
    void FromCefDictionary(CefRefPtr<CefDictionaryValue> dictionary);
  };

  struct AppCapabilities {
    static const std::string dictionaryKey;

    bool nativeSeg = true;
    bool supportsWebMiniRemote = true;

    /// Supports the new screen share picker (v2),
    /// which allows users to select targets by interacting
    /// with UI presented on top of windows and screens.
    bool supportsScreenSharePickerV2 = false;

    Camera camera {};
    Microphone microphone {};
    HardwareInfo hardwareInfo {};

    /// Sends a process message to the browser notifying of a request to relaunch.
    void RequestRelaunch();

    /// Sends a process message to the browser notifying of a request to reboot.
    void RequestReboot();

    CefRefPtr<CefDictionaryValue> ToCefDictionary();
    void FromCefDictionary(CefRefPtr<CefDictionaryValue> dictionary);
  };
}
