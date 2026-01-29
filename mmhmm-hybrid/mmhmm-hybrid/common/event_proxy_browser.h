#pragma once

#include "event_proxy.h"
#include "include/cef_process_message.h"
#include "common/hybrid_object.h"

namespace mmhmm {
  /// EventProxy provides a bidirectional event channel between the browser process
  /// and renderer process. Unlike other hybrid objects, it is stateless and serves
  /// purely as an event routing mechanism.
  class EventProxy: public HybridNativeObject {
  public:
    /// Emits an event to the renderer process.
    ///
    /// - Parameters:
    ///   - eventName: The name of the event to emit.
    ///   - payload: The event payload data as a CEF dictionary.
    void EmitEvent(const std::string& eventName, CefRefPtr<CefDictionaryValue> payload);

    /// Emits an event to a specific browser instance in the renderer process.
    ///
    /// - Parameters:
    ///  - eventName: The name of the event to emit.
    ///  - payload: The event payload data as a CEF dictionary.
    ///  - browserId: The ID of the target browser instance.
    void EmitEventInBrowser(const std::string& eventName, CefRefPtr<CefDictionaryValue> payload, int browserId);

    /// Reports state update to renderer (no-op for stateless EventProxy).
    void ReportStateUpdate() const override;

    /// Handles incoming process messages from renderer.
    ///
    /// - Parameters:
    ///   - browser: The browser instance.
    ///   - frame: The frame instance.
    ///   - source_process: The source process ID.
    ///   - message: The process message.
    /// - Returns: `true` if the message was handled, `false` otherwise.
    bool HandleProcessMessage(CefRefPtr<CefBrowser> browser,
                              CefRefPtr<CefFrame> frame,
                              CefProcessId source_process,
                              CefRefPtr<CefProcessMessage> message) override;

    /// Adds EventProxy state to the dictionary.
    ///
    /// - Parameters:
    ///   - dictionary: The dictionary to add to.
    /// - Returns: `true` if the operation was successful.
    bool AddToDictionary(CefRefPtr<CefDictionaryValue> dictionary) const override;

  private:
    /// Creates a process message for emitting an event.
    ///
    /// - Parameters:
    ///   - eventName: The name of the event.
    ///   - payload: The event payload data.
    /// - Returns: The created process message.
    CefRefPtr<CefProcessMessage> CreateEmitEventMessage(const std::string& eventName,
                                                        CefRefPtr<CefDictionaryValue> payload) const;

    /// Returns an empty CEF dictionary (stateless).
    ///
    /// - Returns: An empty CEF dictionary.
    CefRefPtr<CefDictionaryValue> ToCefDictionary() const;

    /// Handles events received from the renderer process.
    ///
    /// - Parameters:
    ///   - message: The process message containing the event data.
    ///   - browserId: The ID of the browser instance that sent the event.
    void HandleEventFromRenderer(CefRefPtr<CefProcessMessage> message, int browserId);

    // Provide the reference counting implementation for this class.
    IMPLEMENT_REFCOUNTING(EventProxy);
  };
}
