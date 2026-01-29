#pragma once

#include "login_item_installer.h"
#include "include/cef_process_message.h"
#include "include/cef_v8.h"
#include "common/hybrid_object.h"

namespace mmhmm {
  class LoginItemInstallerProjection: public HybridProjectionObject {
  public:
    LoginItemInstallerStatus GetStatus() const;
    void Install();
    void Uninstall();

    bool HandleProcessMessage(CefRefPtr<CefBrowser> browser,
                              CefRefPtr<CefFrame> frame,
                              CefProcessId source_process,
                              CefRefPtr<CefProcessMessage> message) override;

    CefRefPtr<CefV8Value> AttachToValueFromDictionary(CefRefPtr<CefV8Value> value,
                                                      CefRefPtr<CefDictionaryValue> dictionary,
                                                      CefRefPtr<CefV8Context> context) override;

    void UpdateStateInDictionary(CefRefPtr<CefDictionaryValue> dictionary) override;
  private:
    LoginItemInstallerStatus status_ = LoginItemInstallerStatus::NotInstalled;

    void FromCefDictionary(CefRefPtr<CefDictionaryValue> dictionary);

    class LoginItemInstallerAccessor : public CefV8Accessor {
     public:
      LoginItemInstallerAccessor(CefRefPtr<LoginItemInstallerProjection> delegate)
          : delegate_(delegate) {}
      bool Get(const CefString& name,
               const CefRefPtr<CefV8Value> object,
               CefRefPtr<CefV8Value>& retval,
               CefString& exception) override;
      bool Set(const CefString& name,
               const CefRefPtr<CefV8Value> object,
               const CefRefPtr<CefV8Value> value,
               CefString& exception) override;
      IMPLEMENT_REFCOUNTING(LoginItemInstallerAccessor);

     private:
      CefRefPtr<LoginItemInstallerProjection> delegate_;
    };

    /// V8 property accessor. Used by renderer process.
    CefRefPtr<LoginItemInstallerAccessor> login_item_installer_accessor_ = new LoginItemInstallerAccessor(this);

    class LoginItemInstallerHandler: public CefV8Handler {
    public:
      LoginItemInstallerHandler(CefRefPtr<LoginItemInstallerProjection> delegate)
      : delegate_(delegate) {}
      bool Execute(const CefString& name,
                   CefRefPtr<CefV8Value> object,
                   const CefV8ValueList& arguments,
                   CefRefPtr<CefV8Value>& retval,
                   CefString& exception) override;
      IMPLEMENT_REFCOUNTING(LoginItemInstallerHandler);
    private:
      CefRefPtr<LoginItemInstallerProjection> delegate_;
    };

    /// V8 function handler. Used by renderer process.
    CefRefPtr<LoginItemInstallerHandler> login_item_installer_handler_ = new LoginItemInstallerHandler(this);

    /// The name of the V8 object representation of this class when set as a child of another V8 object.
    static const std::string v8_accessor_name;

    struct V8PropertyNames {
      static const std::string status;
    };

    struct V8FunctionNames {
      static const std::string install;
      static const std::string uninstall;
      static const std::string setStatusChangedCallback;
    };

    // Provide the reference counting implementation for this class.
    IMPLEMENT_REFCOUNTING(LoginItemInstallerProjection);
  };
}
