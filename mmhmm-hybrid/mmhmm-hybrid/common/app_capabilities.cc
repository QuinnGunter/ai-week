//
//  app_capabilities.cc
//  mmhmm
//
//  Created by Beni Federer on 07.11.24.
//

#include "app_capabilities.h"
#include "cef_value_utility.h"
#include "v8_utility.h"

// pragma mark not supported with VC++
#if defined(OS_MAC)
#pragma mark - AppCapabilities
#endif

namespace mmhmm {
  std::string CaptureDeviceState::ToString() {
    switch (rawState) {
      case CaptureDeviceRawState::notDetermined:
        return "notDetermined";
      case CaptureDeviceRawState::restricted:
        return "restricted";
      case CaptureDeviceRawState::denied:
        return "denied";
      case CaptureDeviceRawState::authorized:
        return "authorized";
    }
    DCHECK(false);
    return "notDetermined";
  }

  const std::string CaptureDeviceState::dictionaryKey = "authorization";
  const std::string CaptureDeviceState::rawStateKey = "rawState";
  const std::string CaptureDeviceState::descriptionKey = "description";
  const std::string CaptureDeviceState::additionalInfoKey = "additionalInfo";

  CefRefPtr<CefDictionaryValue> CaptureDeviceState::ToCefDictionary() {
    CefRefPtr<CefDictionaryValue> dictionary = CefDictionaryValue::Create();
    dictionary->SetInt(rawStateKey, static_cast<int>(rawState));
    dictionary->SetString(descriptionKey, description);
    dictionary->SetString(additionalInfoKey, additionalInfo);
    return dictionary;
  }

  void CaptureDeviceState::FromCefDictionary(CefRefPtr<CefDictionaryValue> dictionary) {
    if (!dictionary) return;

    if (dictionary->HasKey(rawStateKey)) {
      rawState = CaptureDeviceRawState { dictionary->GetInt(rawStateKey) };
    }
    if (dictionary->HasKey(descriptionKey)) {
      description = dictionary->GetString(descriptionKey);
    }
    if (dictionary->HasKey(additionalInfoKey)) {
      additionalInfo = dictionary->GetString(additionalInfoKey);
    }
  }
}

namespace mmhmm {
  const std::string AppCapabilities::dictionaryKey = "appCapabilities";

  namespace AppCapabilitiesKeys {
    const std::string nativeSeg = "nativeSeg";
    const std::string supportsWebMiniRemote = "supportsWebMiniRemote";
    const std::string supportsScreenSharePickerV2 = "supportsScreenSharePickerV2";
  }

  void AppCapabilities::RequestRelaunch() {
    CefRefPtr<CefProcessMessage> message = CefProcessMessage::Create("AppCapabilities.RequestRelaunch");
    SendProcessMessageToCurrentV8ContextBrowser(message);
  }

  void AppCapabilities::RequestReboot() {
    CefRefPtr<CefProcessMessage> message = CefProcessMessage::Create("AppCapabilities.RequestReboot");
    SendProcessMessageToCurrentV8ContextBrowser(message);
  }

  CefRefPtr<CefDictionaryValue> AppCapabilities::ToCefDictionary() {
    CefRefPtr<CefDictionaryValue> dictionary = CefDictionaryValue::Create();
    dictionary->SetBool(AppCapabilitiesKeys::nativeSeg, nativeSeg);
    dictionary->SetBool(AppCapabilitiesKeys::supportsWebMiniRemote,
                               supportsWebMiniRemote);
    dictionary->SetBool(AppCapabilitiesKeys::supportsScreenSharePickerV2, supportsScreenSharePickerV2);
    dictionary->SetDictionary(Camera::dictionaryKey, camera.ToCefDictionary());
    dictionary->SetDictionary(Microphone::dictionaryKey, microphone.ToCefDictionary());
    dictionary->SetDictionary(HardwareInfo::dictionaryKey, hardwareInfo.ToCefDictionary());
    return dictionary;
  }

  void AppCapabilities::FromCefDictionary(CefRefPtr<CefDictionaryValue> dictionary) {
    if (!dictionary) return;

    if (dictionary->HasKey(AppCapabilitiesKeys::nativeSeg)) {
      nativeSeg = dictionary->GetBool(AppCapabilitiesKeys::nativeSeg);
    }
    if (dictionary->HasKey(AppCapabilitiesKeys::supportsWebMiniRemote)) {
      supportsWebMiniRemote = dictionary->GetBool(AppCapabilitiesKeys::supportsWebMiniRemote);
    }
    if (dictionary->HasKey(AppCapabilitiesKeys::supportsScreenSharePickerV2)) {
      supportsScreenSharePickerV2 = dictionary->GetBool(AppCapabilitiesKeys::supportsScreenSharePickerV2);
    }
    if (dictionary->HasKey(Camera::dictionaryKey)) {
      camera.FromCefDictionary(dictionary->GetDictionary(Camera::dictionaryKey));
    }
    if (dictionary->HasKey(Microphone::dictionaryKey)) {
      microphone.FromCefDictionary(dictionary->GetDictionary(Microphone::dictionaryKey));
    }
    if (dictionary->HasKey(HardwareInfo::dictionaryKey)) {
      hardwareInfo.FromCefDictionary(dictionary->GetDictionary(HardwareInfo::dictionaryKey));
    }
  }
}

namespace mmhmm {
  const std::string Camera::dictionaryKey = "camera";

  void Camera::Authorize() {
    CefRefPtr<CefProcessMessage> message = CefProcessMessage::Create("Camera.Authorize");
    SendProcessMessageToCurrentV8ContextBrowser(message);
  }

  CefRefPtr<CefDictionaryValue> Camera::ToCefDictionary() {
    CefRefPtr<CefDictionaryValue> dictionary = CefDictionaryValue::Create();
    dictionary->SetDictionary(mmhmm::CaptureDeviceState::dictionaryKey, state.ToCefDictionary());
    return dictionary;
  }

  void Camera::FromCefDictionary(CefRefPtr<CefDictionaryValue> dictionary) {
    if (!dictionary) return;

    if (dictionary->HasKey(mmhmm::CaptureDeviceState::dictionaryKey)) {
      auto stateDictionary = dictionary->GetDictionary(mmhmm::CaptureDeviceState::dictionaryKey);
      state = CaptureDeviceState { stateDictionary };
    }
  }
}

namespace mmhmm {
  const std::string Microphone::dictionaryKey = "microphone";

  void Microphone::Authorize() {
    CefRefPtr<CefProcessMessage> message = CefProcessMessage::Create("Microphone.Authorize");
    SendProcessMessageToCurrentV8ContextBrowser(message);
  }

  CefRefPtr<CefDictionaryValue> Microphone::ToCefDictionary() {
    CefRefPtr<CefDictionaryValue> dictionary = CefDictionaryValue::Create();
    dictionary->SetDictionary(mmhmm::CaptureDeviceState::dictionaryKey, state.ToCefDictionary());
    return dictionary;
  }

  void Microphone::FromCefDictionary(CefRefPtr<CefDictionaryValue> dictionary) {
    if (!dictionary) return;

    if (dictionary->HasKey(mmhmm::CaptureDeviceState::dictionaryKey)) {
      auto stateDictionary = dictionary->GetDictionary(mmhmm::CaptureDeviceState::dictionaryKey);
      state = CaptureDeviceState { stateDictionary };
    }
  }
}

// pragma mark not supported with VC++
#if defined(OS_MAC)
#pragma mark - HardwareInfo
#endif

namespace mmhmm {
  const std::string HardwareInfo::dictionaryKey = "hardwareInfo";

  namespace HardwareInfoDictionaryKeys {
    const std::string cpuArch = "cpuArch";
    const std::string cpuCores = "cpuCores";
    const std::string gpuName = "gpuName";
    const std::string memory = "memory";
    const std::string model = "model";
    const std::string os = "os";
    const std::string osVersion = "osVersion";
  }

  CefRefPtr<CefDictionaryValue> HardwareInfo::ToCefDictionary() {
    CefRefPtr<CefDictionaryValue> dictionary = CefDictionaryValue::Create();
    dictionary->SetString(HardwareInfoDictionaryKeys::cpuArch, cpuArch);
    dictionary->SetString(HardwareInfoDictionaryKeys::cpuCores, cpuCores);
    dictionary->SetString(HardwareInfoDictionaryKeys::gpuName, gpuName);
    dictionary->SetString(HardwareInfoDictionaryKeys::memory, memory);
    dictionary->SetString(HardwareInfoDictionaryKeys::model, model);
    dictionary->SetString(HardwareInfoDictionaryKeys::os, os);
    dictionary->SetString(HardwareInfoDictionaryKeys::osVersion, osVersion);
    return dictionary;
  }

  void HardwareInfo::FromCefDictionary(CefRefPtr<CefDictionaryValue> dictionary) {
    if (!dictionary) return;

    if (dictionary->HasKey(HardwareInfoDictionaryKeys::cpuArch)) {
      cpuArch = dictionary->GetString(HardwareInfoDictionaryKeys::cpuArch).ToString();
    }
    if (dictionary->HasKey(HardwareInfoDictionaryKeys::cpuCores)) {
      cpuCores = dictionary->GetString(HardwareInfoDictionaryKeys::cpuCores).ToString();
    }
    if (dictionary->HasKey(HardwareInfoDictionaryKeys::gpuName)) {
      gpuName = dictionary->GetString(HardwareInfoDictionaryKeys::gpuName).ToString();
    }
    if (dictionary->HasKey(HardwareInfoDictionaryKeys::memory)) {
      memory = dictionary->GetString(HardwareInfoDictionaryKeys::memory).ToString();
    }
    if (dictionary->HasKey(HardwareInfoDictionaryKeys::model)) {
      model = dictionary->GetString(HardwareInfoDictionaryKeys::model).ToString();
    }
    if (dictionary->HasKey(HardwareInfoDictionaryKeys::os)) {
      os = dictionary->GetString(HardwareInfoDictionaryKeys::os).ToString();
    }
    if (dictionary->HasKey(HardwareInfoDictionaryKeys::osVersion)) {
      osVersion = dictionary->GetString(HardwareInfoDictionaryKeys::osVersion).ToString();
    }
  }
}
