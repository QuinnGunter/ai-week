#include "titlebar_button.h"
#include "v8_utility.h"
#include "string_util.h"

namespace mmhmm {
  const std::string TitlebarButton::VirtualCameraSupportViewDidAppearIdentifier = "TitlebarButton.VirtualCameraSupportViewDidAppear";
  const std::string TitlebarButton::VirtualCameraSupportViewWillDisappearIdentifier = "TitlebarButton.VirtualCameraSupportViewWillDisappear";
}

namespace mmhmm {
  void TitlebarButton::ReportVirtualCameraSupportViewDidAppear() {
    CefRefPtr<CefProcessMessage> message = CefProcessMessage::Create(VirtualCameraSupportViewDidAppearIdentifier);
    SendProcessMessageToCurrentV8ContextBrowser(message);
  }

  void TitlebarButton::ReportVirtualCameraSupportViewWillDisappear() {
    CefRefPtr<CefProcessMessage> message = CefProcessMessage::Create(VirtualCameraSupportViewWillDisappearIdentifier);
    SendProcessMessageToCurrentV8ContextBrowser(message);
  }
}

namespace mmhmm {
  const std::string ToolboxButton::dictionaryKey = "toolboxButton";
  const std::string ToolboxButton::isEnabledKey = "isEnabled";
  const std::string ToolboxButton::tooltipKey = "tooltip";
  const std::string ToolboxButton::infoKey = "info";

  CefRefPtr<CefDictionaryValue> ToolboxButton::ToCefDictionary() {
    CefRefPtr<CefDictionaryValue> dictionary = CefDictionaryValue::Create();
    dictionary->SetBool(isEnabledKey, isEnabled);
    dictionary->SetString(tooltipKey, tooltip);
    dictionary->SetString(infoKey, info);
    return dictionary;
  }

  void ToolboxButton::FromCefDictionary(CefRefPtr<CefDictionaryValue> dictionary) {
    if (!dictionary) return;

    if (dictionary->HasKey(isEnabledKey)) {
      isEnabled = dictionary->GetBool(isEnabledKey);
    }
    if (dictionary->HasKey(tooltipKey)) {
      tooltip = dictionary->GetString(tooltipKey);
    }
    if (dictionary->HasKey(infoKey)) {
      info = dictionary->GetString(infoKey);
    }
  }
}

namespace mmhmm {
  const std::string Titlebar::appModeChangedIdentifier = "Titlebar.AppModeChanged";
  const std::string Titlebar::updateIdentifier = "Titlebar.Update";
  const std::string Titlebar::dictionaryKey = "titlebar";
  const std::string Titlebar::appModeKey = "appMode";
  const std::string Titlebar::fullModeString = "Full";
  const std::string Titlebar::miniModeString = "Mini";

  CefRefPtr<CefDictionaryValue> AppModeToCefDictionary(AppMode mode) {
    CefRefPtr<CefDictionaryValue> dictionary = CefDictionaryValue::Create();
    dictionary->SetInt(Titlebar::appModeKey, static_cast<int>(mode));
    return dictionary;
  }

  std::optional<AppMode> AppModeFromCefDictionary(CefRefPtr<CefDictionaryValue> dictionary) {
    if (!dictionary) return std::nullopt;

    if (dictionary->HasKey(Titlebar::appModeKey)) {
      return AppMode { dictionary->GetInt(Titlebar::appModeKey) };
    }

    return std::nullopt;
  }

  std::string StringForAppMode(AppMode mode) {
    switch (mode) {
      case AppMode::Full:
        return Titlebar::fullModeString;

      case AppMode::Mini:
        return Titlebar::miniModeString;

      default:
        return "";
    }
  }

  std::optional<AppMode> AppModeFromString(std::string appModeString) {
    if (client::ToLower(appModeString) == client::ToLower(Titlebar::fullModeString)) {
      return AppMode::Full;
    } else if (client::ToLower(appModeString) == client::ToLower(Titlebar::miniModeString)) {
      return AppMode::Mini;
    } else {
      return std::nullopt;
    }
  }

  CefRefPtr<CefDictionaryValue> Titlebar::ToCefDictionary() {
    CefRefPtr<CefDictionaryValue> dictionary = AppModeToCefDictionary(appMode);
    dictionary->SetDictionary(ToolboxButton::dictionaryKey, toolboxButton.ToCefDictionary());
    return dictionary;
  }

  void Titlebar::FromCefDictionary(CefRefPtr<CefDictionaryValue> dictionary) {
    if (!dictionary) return;

    auto maybeMode = mmhmm::AppModeFromCefDictionary(dictionary);
    if (maybeMode.has_value()) {
      appMode = maybeMode.value();
    }
    if (dictionary->HasKey(ToolboxButton::dictionaryKey)) {
      toolboxButton.FromCefDictionary(dictionary->GetDictionary(ToolboxButton::dictionaryKey));
    }
  }

  void Titlebar::SendTitlebarUpdate() {
    CefRefPtr<CefProcessMessage> message = CefProcessMessage::Create(updateIdentifier);
    auto args = message->GetArgumentList();
    args->SetDictionary(0, ToCefDictionary());
    SendProcessMessageToCurrentV8ContextBrowser(message);
  }

  void Titlebar::AppModeChanged(AppMode mode) {
    CefRefPtr<CefProcessMessage> message = CefProcessMessage::Create(appModeChangedIdentifier);
    CefRefPtr<CefListValue> args = message->GetArgumentList();
    args->SetInt(0, static_cast<int>(mode));
    SendProcessMessageToCurrentV8ContextBrowser(message);
  }
}
