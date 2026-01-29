#include "cef_process_message_handler.h"
#include "v8_utility.h"

namespace mmhmm {
  void CefProcessMessageHandler::SendProcessMessageToBrowserProcess(CefRefPtr<CefProcessMessage> message) const {
    SendProcessMessageToCurrentV8ContextBrowser(message);
  }
}
