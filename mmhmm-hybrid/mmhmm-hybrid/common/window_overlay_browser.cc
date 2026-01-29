#include "window_overlay_browser.h"
#include "cef_value_utility.h"

#if defined (OS_MACOSX)
#include "LoggerTrampoline.h"
#include "Airtime-Swift-Wrapper.h"
#endif

#include <variant>

#if defined(OS_WIN)
#include "browser/main_context.h"
#endif

namespace mmhmm {
  void WindowOverlay::ReportStateUpdate() const {}

  bool WindowOverlay::HandleProcessMessage(CefRefPtr<CefBrowser> browser,
                                           CefRefPtr<CefFrame> frame,
                                           CefProcessId source_process,
                                           CefRefPtr<CefProcessMessage> message) {
    if (message->GetName() == WindowOverlayMessageNames::drawCursors) {
      DrawCursors(message);
      return true;
    } else if (message->GetName() == WindowOverlayMessageNames::setDebugIsEnabled) {
      SetDebugIsEnabled(message);
      return true;
    } else {
      return false;
    }
  }

  bool WindowOverlay::AddToDictionary(CefRefPtr<CefDictionaryValue> dictionary) const {
    return dictionary->SetDictionary(WindowOverlayKeys::dictionary, ToCefDictionary());
  }

  CefRefPtr<CefProcessMessage> WindowOverlay::CreateStatusUpdateMessage() const {
    return CefProcessMessage::Create(WindowOverlayMessageNames::stateUpdate);
  }

  CefRefPtr<CefDictionaryValue> WindowOverlay::ToCefDictionary() const {
    return CefDictionaryValue::Create();
  }

  void WindowOverlay::DrawCursors(CefRefPtr<CefProcessMessage> message) const {
    auto arguments = message->GetArgumentList();
    if (arguments->GetSize() != 3) {
      DCHECK(false);
#if defined (OS_MACOSX)
      std::stringstream message;
      message << "Unexpected argument count: " << arguments->GetSize();
      NativeLogger::LogMessage(message.str(), LOGSEVERITY_ERROR, __PRETTY_FUNCTION__);
#endif
      return;
    }

    // Retrieve target ID

    auto targetIDVariant = ToNativeType(arguments->GetValue(0));
    if (std::holds_alternative<int>(targetIDVariant) == false) {
      DCHECK(false);
#if defined (OS_MACOSX)
      NativeLogger::LogMessage("Target ID has unexpected argument type.", LOGSEVERITY_ERROR, __PRETTY_FUNCTION__);
#endif
      return;
    }
    auto targetID = std::get<int>(targetIDVariant);

    // Retrieve list of cursor dictionaries

    auto cursors = arguments->GetValue(1)->GetList();
    auto cursorsCount = cursors->GetSize();
    std::vector<WindowOverlayParticipant> cursorsVector;
    cursorsVector.reserve(cursorsCount);

    for (std::size_t index = 0; index < cursorsCount; ++index) {
      auto cursorDictionary = cursors->GetValue(index)->GetDictionary();
      WindowOverlayParticipant participant;
      participant.identifier = cursorDictionary->GetString(WindowOverlayKeys::identifier);
      participant.name = cursorDictionary->GetString(WindowOverlayKeys::name);
      participant.color = Color {
        cursorDictionary->GetString(WindowOverlayKeys::color),
        cursorDictionary->GetDouble(WindowOverlayKeys::opacity)
      };
      participant.coordinate = Point2D {
        cursorDictionary->GetDouble(WindowOverlayKeys::x),
        cursorDictionary->GetDouble(WindowOverlayKeys::y)
      };
      cursorsVector.push_back(participant);
    }

    // Retrieve target

    auto targetString = arguments->GetValue(2)->GetString();
    auto target = WindowOverlayTarget::Window;
    if (auto maybeTarget = WindowOverlayTargetFromString(targetString); maybeTarget.has_value()) {
      target = maybeTarget.value();
    } else {
      DCHECK(false);
#if defined (OS_MACOSX)
      std::stringstream message;
      message << "Unexpected window overlay target: " << targetString;
      NativeLogger::LogMessage(message.str(), LOGSEVERITY_ERROR, __PRETTY_FUNCTION__);
#endif
    }

    // Assemble target ID, cursor dictionaries and target into overlay info

    auto windowOverlayInfo = WindowOverlayInfo { cursorsVector, targetID, target };
#if defined (OS_MAC)
    Airtime::WindowOverlayBridge::drawCursors(windowOverlayInfo);
#else
    MainContext::Get()->GetApplicationContext()->DrawCursorsOnOverlayWindow(
        windowOverlayInfo);
#endif
  }

  void WindowOverlay::SetDebugIsEnabled(CefRefPtr<CefProcessMessage> message) const {
    auto arguments = message->GetArgumentList();
    if (arguments->GetSize() != 1) {
      DCHECK(false);
#if defined (OS_MACOSX)
      std::stringstream message;
      message << "Unexpected argument count: " << arguments->GetSize();
      NativeLogger::LogMessage(message.str(), LOGSEVERITY_ERROR, __PRETTY_FUNCTION__);
#endif
      return;
    }

    // Retrieve debug flag

    auto debugIsEnabledVariant = ToNativeType(arguments->GetValue(0));
    if (std::holds_alternative<bool>(debugIsEnabledVariant) == false) {
      DCHECK(false);
#if defined (OS_MACOSX)
      NativeLogger::LogMessage("Target ID has unexpected argument type.", LOGSEVERITY_ERROR, __PRETTY_FUNCTION__);
#endif
      return;
    }

#if defined (OS_MAC)
    bool debugIsEnabled = std::get<bool>(debugIsEnabledVariant);
    Airtime::WindowOverlayBridge::setDebugIsEnabled(debugIsEnabled);
#else
    DCHECK(false);
#endif
  }
}
