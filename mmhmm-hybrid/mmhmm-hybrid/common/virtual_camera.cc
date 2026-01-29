//
//  virtual_camera.cc
//  mmhmm
//
//  Created by Beni Federer on 08.11.24.
//

#include "virtual_camera.h"
#include "cef_value_utility.h"
#include "v8_utility.h"

namespace mmhmm {
  std::string VirtualCameraState::ToString() {
    switch (rawState) {
      case VirtualCameraRawState::notInstalled: return "notInstalled";
      case VirtualCameraRawState::notInstallable: return "notInstallable";
      case VirtualCameraRawState::awaitingUserApproval: return "awaitingUserApproval";
      case VirtualCameraRawState::installed: return "installed";
      case VirtualCameraRawState::installing: return "installing";
      case VirtualCameraRawState::needsUpdate: return "needsUpdate";
      case VirtualCameraRawState::needsReboot: return "needsReboot";
      case VirtualCameraRawState::uninstalling: return "uninstalling";
      case VirtualCameraRawState::error: return "error";
    }
    DCHECK(false);
    return "error";
  }

  const std::string VirtualCameraState::dictionaryKey = "state";
  const std::string VirtualCameraState::rawStateKey = "rawState";
  const std::string VirtualCameraState::descriptionKey = "description";
  const std::string VirtualCameraState::additionalInfoKey = "additionalInfo";

  CefRefPtr<CefDictionaryValue> VirtualCameraState::ToCefDictionary() {
    CefRefPtr<CefDictionaryValue> dictionary = CefDictionaryValue::Create();
    dictionary->SetInt(rawStateKey, static_cast<int>(rawState));
    dictionary->SetString(descriptionKey, description);
    dictionary->SetString(additionalInfoKey, additionalInfo);
    return dictionary;
  }

  void VirtualCameraState::FromCefDictionary(CefRefPtr<CefDictionaryValue> dictionary) {
    if (!dictionary) return;

    if (dictionary->HasKey(rawStateKey)) {
      rawState = VirtualCameraRawState { dictionary->GetInt(rawStateKey) };
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
  const std::string VirtualCamera::dictionaryKey = "virtualCamera";
  const std::string VirtualCamera::clientsKey = "clients";

  void VirtualCamera::Install() {
    CefRefPtr<CefProcessMessage> message = CefProcessMessage::Create("VirtualCamera.Install");
    SendProcessMessageToCurrentV8ContextBrowser(message);
  }

  void VirtualCamera::Uninstall() {
    CefRefPtr<CefProcessMessage> message = CefProcessMessage::Create("VirtualCamera.Uninstall");
    SendProcessMessageToCurrentV8ContextBrowser(message);
  }

  void VirtualCamera::Authorize() {
    CefRefPtr<CefProcessMessage> message = CefProcessMessage::Create("VirtualCamera.Authorize");
    SendProcessMessageToCurrentV8ContextBrowser(message);
  }

  CefRefPtr<CefDictionaryValue> VirtualCamera::ToCefDictionary() {
    CefRefPtr<CefDictionaryValue> dictionary = CefDictionaryValue::Create();
    dictionary->SetDictionary(VirtualCameraState::dictionaryKey, state.ToCefDictionary());
    dictionary->SetList(clientsKey, ToCefListValue(clients));
    return dictionary;
  }

  void VirtualCamera::FromCefDictionary(CefRefPtr<CefDictionaryValue> dictionary) {
    if (!dictionary) return;

    if (dictionary->HasKey(VirtualCameraState::dictionaryKey)) {
      CefRefPtr<CefDictionaryValue> virtualCameraStateDictionary = dictionary->GetDictionary(VirtualCameraState::dictionaryKey);
      state.FromCefDictionary(virtualCameraStateDictionary);
    }
    if (dictionary->HasKey(clientsKey)) {
      CefRefPtr<CefListValue> clientsList = dictionary->GetList(clientsKey);
      clients = ToVector<std::string>(clientsList);
    }
  }
}
