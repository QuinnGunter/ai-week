//
//  app_windows.h
//  mmhmm
//
//  Created by Beni Federer on 16.01.25.
//

#pragma once

#include "include/internal/cef_ptr.h"
#include "include/cef_values.h"

namespace mmhmm {
  struct MainAppWindow {
    static const std::string dictionaryKey;
    static const std::string isFloatingKey;
    static const std::string isHiddenKey;
    static const std::string setIsFloatingToIdentifier;
    static const std::string setIsHiddenToIdentifier;

    MainAppWindow() {}
    MainAppWindow(bool isFloating, bool isHidden)
    : isFloating(isFloating), isHidden(isHidden) {}
    MainAppWindow(CefRefPtr<CefDictionaryValue> dictionary) { FromCefDictionary(dictionary); }

    /// Determines whether the app window is a floating window.
    bool isFloating = false;

    /// Determines whether the app window is hidden.
    bool isHidden = false;

    /// Sends a process message to the browser notifying of a
    /// request to resize to the specified dimensions.
    void ResizeTo(CefSize size);

    /// Sends a process message to the browser notifying of a
    /// change to the `isFloating` property.
    void SetIsFloatingTo(bool isFloating);

    /// Sends a process message to the browser notifying of a
    /// change to the `isHidden` property.
    void SetIsHiddenTo(bool newIsHidden);

    CefRefPtr<CefDictionaryValue> ToCefDictionary();
    void FromCefDictionary(CefRefPtr<CefDictionaryValue> dictionary);
  };

  struct AppWindows {
    static const std::string dictionaryKey;

    AppWindows() {}
    AppWindows(MainAppWindow mainAppWindow)
    : mainAppWindow(mainAppWindow) {}
    AppWindows(CefRefPtr<CefDictionaryValue> dictionary) { FromCefDictionary(dictionary); }

    MainAppWindow mainAppWindow {};

    CefRefPtr<CefDictionaryValue> ToCefDictionary();
    void FromCefDictionary(CefRefPtr<CefDictionaryValue> dictionary);
  };
}
