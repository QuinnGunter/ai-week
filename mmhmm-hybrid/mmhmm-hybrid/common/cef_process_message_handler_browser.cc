#include "cef_process_message_handler.h"
#include "browser/main_context_impl.h"

namespace mmhmm {
  void CefProcessMessageHandler::SendProcessMessageToRendererProcess(CefRefPtr<CefProcessMessage> message) const {
    auto context = client::MainContext::Get();
    if (!context) {
      DCHECK(false);
      LOG(ERROR) << "Context unavailable.";
      return;
    }

    context->SendProcessMessageToRendererProcess(message);
  }

  void CefProcessMessageHandler::SendProcessMessageToBrowser(CefRefPtr<CefProcessMessage> message, int browserId) const {
    auto context = client::MainContext::Get();
    if (!context) {
      DCHECK(false);
      LOG(ERROR) << "Context unavailable.";
      return;
    }

    context->SendProcessMessageToBrowser(message, browserId);
  }
}
