#pragma once

#include "window_overlay.h"
#include "include/cef_process_message.h"
#include "include/cef_v8.h"
#include "common/hybrid_object.h"

namespace mmhmm {
  /// V8 projection of ``WindowOverlay``.
  class WindowOverlayProjection: public HybridProjectionObject {
  public:
    bool HandleProcessMessage(CefRefPtr<CefBrowser> browser,
                              CefRefPtr<CefFrame> frame,
                              CefProcessId source_process,
                              CefRefPtr<CefProcessMessage> message) override;

    CefRefPtr<CefV8Value> AttachToValueFromDictionary(CefRefPtr<CefV8Value> value,
                                                      CefRefPtr<CefDictionaryValue> dictionary,
                                                      CefRefPtr<CefV8Context> context) override;

    void UpdateStateInDictionary(CefRefPtr<CefDictionaryValue> dictionary) override;
  private:
    bool debugIsEnabled_ = false;

    bool DrawCursors(const CefString& name,
                     CefRefPtr<CefV8Value> object,
                     const CefV8ValueList& arguments,
                     CefRefPtr<CefV8Value>& retval,
                     CefString& exception);

    bool SetDebugIsEnabled(const CefRefPtr<CefV8Value> object,
                           const CefRefPtr<CefV8Value> value,
                           CefString& exception);

    void FromCefDictionary(CefRefPtr<CefDictionaryValue> dictionary);

    class WindowOverlayAccessor : public CefV8Accessor {
     public:
      WindowOverlayAccessor(CefRefPtr<WindowOverlayProjection> delegate)
          : delegate_(delegate) {}
      bool Get(const CefString& name,
               const CefRefPtr<CefV8Value> object,
               CefRefPtr<CefV8Value>& retval,
               CefString& exception) override;
      bool Set(const CefString& name,
               const CefRefPtr<CefV8Value> object,
               const CefRefPtr<CefV8Value> value,
               CefString& exception) override;
      IMPLEMENT_REFCOUNTING(WindowOverlayAccessor);

     private:
      CefRefPtr<WindowOverlayProjection> delegate_;
    };

    /// V8 property accessor. Used by renderer process.
    CefRefPtr<WindowOverlayAccessor> accessor_ = new WindowOverlayAccessor(this);

    class WindowOverlayHandler: public CefV8Handler {
    public:
      WindowOverlayHandler(CefRefPtr<WindowOverlayProjection> delegate)
      : delegate_(delegate) {}
      bool Execute(const CefString& name,
                   CefRefPtr<CefV8Value> object,
                   const CefV8ValueList& arguments,
                   CefRefPtr<CefV8Value>& retval,
                   CefString& exception) override;
      IMPLEMENT_REFCOUNTING(WindowOverlayHandler);
    private:
      CefRefPtr<WindowOverlayProjection> delegate_;
    };

    /// V8 function handler. Used by renderer process.
    CefRefPtr<WindowOverlayHandler> handler_ = new WindowOverlayHandler(this);

    /// The name of the V8 object representation of this class when set as a child of another V8 object.
    static const std::string v8_accessor_name;

    struct V8FunctionNames {
      /// Available in V8 as `function drawCursors(targetID, cursors, target)`.
      ///
      /// * `targetID` is a display or window ID.
      /// * `cursors` is a object with the layout
      ///   `[{ id: <string>, name: <string>, color: <hex string>, opacity: <number>, x: <number>, y: <number> }, ...]`
      /// * `target` is either `screen` or `window`.
      static const std::string drawCursors;
    };

    struct V8PropertyNames {
      /// Available in V8 as property `debugIsEnabled`.
      static const std::string debugIsEnabled;
    };

    // Provide the reference counting implementation for this class.
    IMPLEMENT_REFCOUNTING(WindowOverlayProjection);
  };
}
