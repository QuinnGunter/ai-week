//
//  app_windows.cc
//  mmhmm
//
//  Created by Beni Federer on 16.01.25.
//

#include "app_windows.h"
#include "cef_value_utility.h"
#include "v8_utility.h"

namespace mmhmm {
  const std::string MainAppWindow::dictionaryKey = "mainAppWindow";
  const std::string MainAppWindow::isFloatingKey = "isFloating";
  const std::string MainAppWindow::isHiddenKey = "isHidden";
  const std::string MainAppWindow::setIsFloatingToIdentifier = "MainAppWindow.SetIsFloatingTo";
  const std::string MainAppWindow::setIsHiddenToIdentifier = "MainAppWindow.SetIsHiddenTo";

  void MainAppWindow::ResizeTo(CefSize size) {
    CefRefPtr<CefProcessMessage> message = CefProcessMessage::Create("MainAppWindow.ResizeTo");
    auto args = message->GetArgumentList();
    args->SetInt(0, size.width);
    args->SetInt(1, size.height);
    SendProcessMessageToCurrentV8ContextBrowser(message);
  }

  void MainAppWindow::SetIsFloatingTo(bool newIsFloating) {
    CefRefPtr<CefProcessMessage> message = CefProcessMessage::Create(setIsFloatingToIdentifier);
    auto args = message->GetArgumentList();
    args->SetBool(0, newIsFloating);
    SendProcessMessageToCurrentV8ContextBrowser(message);
  }

  void MainAppWindow::SetIsHiddenTo(bool newIsHidden) {
    CefRefPtr<CefProcessMessage> message = CefProcessMessage::Create(setIsHiddenToIdentifier);
    auto args = message->GetArgumentList();
    args->SetBool(0, newIsHidden);
    SendProcessMessageToCurrentV8ContextBrowser(message);
  }

  CefRefPtr<CefDictionaryValue> MainAppWindow::ToCefDictionary() {
    CefRefPtr<CefDictionaryValue> dictionary = CefDictionaryValue::Create();
    dictionary->SetBool(isFloatingKey, isFloating);
    dictionary->SetBool(isHiddenKey, isHidden);
    return dictionary;
  }

  void MainAppWindow::FromCefDictionary(CefRefPtr<CefDictionaryValue> dictionary) {
    if (!dictionary) return;

    if (dictionary->HasKey(isFloatingKey)) {
      isFloating = dictionary->GetBool(isFloatingKey);
    }
    if (dictionary->HasKey(isHiddenKey)) {
      isHidden = dictionary->GetBool(isHiddenKey);
    }
  }
}

namespace mmhmm {
  const std::string AppWindows::dictionaryKey = "appWindows";

  CefRefPtr<CefDictionaryValue> AppWindows::ToCefDictionary() {
    CefRefPtr<CefDictionaryValue> dictionary = CefDictionaryValue::Create();
    dictionary->SetDictionary(MainAppWindow::dictionaryKey, mainAppWindow.ToCefDictionary());
    return dictionary;
  }

  void AppWindows::FromCefDictionary(CefRefPtr<CefDictionaryValue> dictionary) {
    if (!dictionary) return;

    if (dictionary->HasKey(MainAppWindow::dictionaryKey)) {
      auto mainAppWindowDictionary = dictionary->GetDictionary(MainAppWindow::dictionaryKey);
      mainAppWindow = MainAppWindow { mainAppWindowDictionary};
    }
  }
}
