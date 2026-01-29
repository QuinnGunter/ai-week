#pragma once

#include "event_proxy.h"
#include "include/cef_process_message.h"
#include "include/cef_v8.h"
#include "common/hybrid_object.h"

namespace mmhmm {
  /// V8 projection of EventProxy.
  ///
  /// EventProxyProjection serves as the renderer-side component of the EventProxy system,
  /// providing JavaScript access to bidirectional event communication with the browser process.
  class EventProxyProjection: public HybridProjectionObject {
  public:
    /// Handles incoming process messages from browser.
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

    /// Creates and attaches V8 object representation to parent value.
    ///
    /// - Parameters:
    ///   - value: The parent V8 value to attach to.
    ///   - dictionary: The dictionary containing initial state.
    ///   - context: The V8 context.
    /// - Returns: The created V8 object.
    CefRefPtr<CefV8Value> AttachToValueFromDictionary(CefRefPtr<CefV8Value> value,
                                                      CefRefPtr<CefDictionaryValue> dictionary,
                                                      CefRefPtr<CefV8Context> context) override;

    /// Updates state in dictionary (no-op for stateless EventProxy).
    ///
    /// - Parameters:
    ///   - dictionary: The dictionary to update.
    void UpdateStateInDictionary(CefRefPtr<CefDictionaryValue> dictionary) override;

  private:
    /// Sends an event from JavaScript to the browser process.
    ///
    /// JavaScript signature: `handleEvent(eventName, payload)`
    ///
    /// - Parameters:
    ///   - name: The function name (should be V8FunctionNames::handleEvent).
    ///   - object: The V8 object the function was called on.
    ///   - arguments: The function arguments [eventName: string, payload: object].
    ///   - retval: The return value (unused).
    ///   - exception: Exception message if an error occurs.
    /// - Returns: `true` if successful, `false` otherwise.
    bool HandleEvent(const CefString& name,
                     CefRefPtr<CefV8Value> object,
                     const CefV8ValueList& arguments,
                     CefRefPtr<CefV8Value>& retval,
                     CefString& exception);

    /// Registers a callback for events emitted from the browser process.
    ///
    /// JavaScript signature: `setEventEmitterCallback(callback)`
    ///
    /// - Parameters:
    ///   - object: The V8 object the function was called on.
    ///   - value: The callback function to register.
    ///   - exception: Exception message if an error occurs.
    /// - Returns: `true` if successful, `false` otherwise.
    bool SetEventEmitterCallback(const CefRefPtr<CefV8Value> object,
                                 const CefRefPtr<CefV8Value> value,
                                 CefString& exception);

    /// Updates internal state from CEF dictionary (no-op for stateless EventProxy).
    ///
    /// - Parameters:
    ///   - dictionary: The dictionary to read state from.
    void FromCefDictionary(CefRefPtr<CefDictionaryValue> dictionary);

    /// Handles emitEvent messages from the browser process.
    ///
    /// - Parameters:
    ///   - message: The process message containing event data.
    void HandleEmitEventMessage(CefRefPtr<CefProcessMessage> message);

    /// V8 property accessor for EventProxy object.
    class EventProxyAccessor : public CefV8Accessor {
     public:
      EventProxyAccessor(CefRefPtr<EventProxyProjection> delegate)
          : delegate_(delegate) {}
      
      bool Get(const CefString& name,
               const CefRefPtr<CefV8Value> object,
               CefRefPtr<CefV8Value>& retval,
               CefString& exception) override;
      
      bool Set(const CefString& name,
               const CefRefPtr<CefV8Value> object,
               const CefRefPtr<CefV8Value> value,
               CefString& exception) override;
      
      IMPLEMENT_REFCOUNTING(EventProxyAccessor);

     private:
      CefRefPtr<EventProxyProjection> delegate_;
    };

    /// V8 property accessor instance.
    CefRefPtr<EventProxyAccessor> accessor_ = new EventProxyAccessor(this);

    /// V8 function handler for EventProxy functions.
    class EventProxyHandler: public CefV8Handler {
    public:
      EventProxyHandler(CefRefPtr<EventProxyProjection> delegate)
      : delegate_(delegate) {}
      
      bool Execute(const CefString& name,
                   CefRefPtr<CefV8Value> object,
                   const CefV8ValueList& arguments,
                   CefRefPtr<CefV8Value>& retval,
                   CefString& exception) override;
      
      IMPLEMENT_REFCOUNTING(EventProxyHandler);
      
    private:
      CefRefPtr<EventProxyProjection> delegate_;
    };

    /// V8 function handler instance.
    CefRefPtr<EventProxyHandler> handler_ = new EventProxyHandler(this);

    /// The name of the V8 object representation when attached to parent.
    static const std::string v8_accessor_name;

    /// V8 function names exposed to JavaScript.
    struct V8FunctionNames {
      /// Available in V8 as `function handleEvent(eventName, payload)`.
      ///
      /// Sends an event from JavaScript to the browser process.
      /// - `eventName` is a string identifier for the event.
      /// - `payload` is an object containing event data (can be null).
      static const std::string handleEvent;
      
      /// Available in V8 as `function setEventEmitterCallback(callback)`.
      ///
      /// Registers a callback to receive events from the browser process.
      /// - `callback` is a function(eventName: string, payload: object)
      static const std::string setEventEmitterCallback;
    };

    // Provide the reference counting implementation for this class.
    IMPLEMENT_REFCOUNTING(EventProxyProjection);
  };
}
