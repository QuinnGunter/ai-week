#pragma once

#include "include/internal/cef_ptr.h"
#include "include/cef_values.h"

#include <string>
#include <optional>

namespace mmhmm {
  enum class AppMode {
    Full,
    Mini,
  };

  CefRefPtr<CefDictionaryValue> AppModeToCefDictionary(AppMode mode);
  std::optional<AppMode> AppModeFromCefDictionary(CefRefPtr<CefDictionaryValue> dictionary);
  std::string StringForAppMode(AppMode mode);
  std::optional<AppMode> AppModeFromString(std::string appModeString);

  /// The button presenting the virtual camera status.
  struct TitlebarButton {
    static const std::string VirtualCameraSupportViewDidAppearIdentifier;
    static const std::string VirtualCameraSupportViewWillDisappearIdentifier;

    void ReportVirtualCameraSupportViewDidAppear();
    void ReportVirtualCameraSupportViewWillDisappear();
  };

  /// The button opening the toolbox.
  struct ToolboxButton {
    static const std::string dictionaryKey;
    static const std::string isEnabledKey;
    static const std::string tooltipKey;
    static const std::string infoKey;

    /// Whether the toolbox button is enabled.
    bool isEnabled = true;

    /// The tooltip message presented when the cursor hovers over the toolbox button.
    std::string tooltip = "";

    /// An info message displayed with the toolbox button.
    std::string info = "";

    CefRefPtr<CefDictionaryValue> ToCefDictionary();
    void FromCefDictionary(CefRefPtr<CefDictionaryValue> dictionary);
  };

  struct Titlebar {
    static const std::string appModeChangedIdentifier;
    static const std::string updateIdentifier;
    static const std::string dictionaryKey;
    static const std::string appModeKey;
    static const std::string fullModeString;
    static const std::string miniModeString;

    Titlebar() {}
    Titlebar(AppMode appMode)
    : appMode(appMode) {}
    Titlebar(CefRefPtr<CefDictionaryValue> dictionary) { FromCefDictionary(dictionary); }

    AppMode appMode = AppMode::Full;
    TitlebarButton titlebarButton {};
    ToolboxButton toolboxButton {};

    CefRefPtr<CefDictionaryValue> ToCefDictionary();
    void FromCefDictionary(CefRefPtr<CefDictionaryValue> dictionary);

    /// Sends a process message containing a CEF dictionary
    /// representing the updated titlebar to the browser.
    void SendTitlebarUpdate();

    /// Sends a process message to the browser notifying of a app mode change.
    void AppModeChanged(AppMode mode);
  };
}
