#pragma once

#include "include/cef_browser.h"
#include "include/cef_frame.h"

namespace mmhmm {
  enum class ProcessType {
    Browser,
    Renderer,
  };

  /// Provides the ability to handle CEF process messages.
  class CefProcessMessageHandler {
  public:
    /// Attempts to handle a process message.
    ///
    /// Calls to ``CefClient::OnProcessMessageReceived`` are forwarded to this function.
    /// The implementing class returns a boolean indicating if the process message
    /// was fully handled or if it needs to be passed along to other handlers.
    ///
    /// - Parameters:
    ///   - browser: Forwarded from `CefClient::OnProcessMessageReceived`.
    ///   - frame: Forwarded from `CefClient::OnProcessMessageReceived`.
    ///   - source_process: Forwarded from `CefClient::OnProcessMessageReceived`.
    ///   - message: Forwarded from `CefClient::OnProcessMessageReceived`.
    /// - Returns: `true` if `message` was fully handled, `false` otherwise.
    virtual bool HandleProcessMessage(CefRefPtr<CefBrowser> browser,
                                      CefRefPtr<CefFrame> frame,
                                      CefProcessId source_process,
                                      CefRefPtr<CefProcessMessage> message) = 0;
    
    /// Sends a CEF process message to the browser process.
    ///
    /// - Parameter message: The message to send.
    void SendProcessMessageToBrowserProcess(CefRefPtr<CefProcessMessage> message) const;

    /// Sends a CEF process message to all renderer processes.
    ///
    /// - Parameter message: The message to send.
    void SendProcessMessageToRendererProcess(CefRefPtr<CefProcessMessage> message) const;

    /// Sends a CEF process message to a specific browser by ID.
    ///
    /// - Parameters:
    ///  - message: The message to send.
    ///  - browserId: The target browser ID.
    void SendProcessMessageToBrowser(CefRefPtr<CefProcessMessage> message, int browserId) const;
  };
}
