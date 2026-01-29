#include "login_item_installer_renderer.h"

namespace mmhmm {
  LoginItemInstallerStatus LoginItemInstallerProjection::GetStatus() const {
    return status_;
  }

  void LoginItemInstallerProjection::Install() {
    auto message = CefProcessMessage::Create(LoginItemInstallerMessageNames::install);
    SendProcessMessageToBrowserProcess(message);
  }

  void LoginItemInstallerProjection::Uninstall() {
    auto message = CefProcessMessage::Create(LoginItemInstallerMessageNames::uninstall);
    SendProcessMessageToBrowserProcess(message);
  }
}

namespace mmhmm {
  const std::string LoginItemInstallerProjection::v8_accessor_name = "loginItemInstaller";
  const std::string LoginItemInstallerProjection::V8PropertyNames::status = "status";
  const std::string LoginItemInstallerProjection::V8FunctionNames::install = "install";
  const std::string LoginItemInstallerProjection::V8FunctionNames::uninstall = "uninstall";
  const std::string LoginItemInstallerProjection::V8FunctionNames::setStatusChangedCallback = "setStatusChangedCallback";

  bool LoginItemInstallerProjection::LoginItemInstallerAccessor::Get(
      const CefString& name,
      const CefRefPtr<CefV8Value> object,
      CefRefPtr<CefV8Value>& retval,
      CefString& exception) {
    if (name == V8PropertyNames::status) {
      retval = CefV8Value::CreateString(ToString(delegate_->status_));
      return true;
    }

    return false;
  }

  bool LoginItemInstallerProjection::LoginItemInstallerAccessor::Set(
      const CefString& name,
      const CefRefPtr<CefV8Value> object,
      const CefRefPtr<CefV8Value> value,
      CefString& exception) {
    return false;
  }

  bool LoginItemInstallerProjection::LoginItemInstallerHandler::Execute(const CefString& name,
                                                         CefRefPtr<CefV8Value> object,
                                                         const CefV8ValueList& arguments,
                                                         CefRefPtr<CefV8Value>& retval,
                                                         CefString& exception) {
    if (name == V8FunctionNames::setStatusChangedCallback) {
      return delegate_->SetCallbackFunction(name, object, arguments, retval, exception);
    } else if (name == V8FunctionNames::install) {
      delegate_->Install();
      return true;
    } else if (name == V8FunctionNames::uninstall) {
      delegate_->Uninstall();
      return true;
    }

    return false;
  }
}

namespace mmhmm {
  CefRefPtr<CefV8Value> LoginItemInstallerProjection::AttachToValueFromDictionary(CefRefPtr<CefV8Value> value,
                                                                                  CefRefPtr<CefDictionaryValue> dictionary,
                                                                                  CefRefPtr<CefV8Context> context) {
    if (dictionary->HasKey(LoginItemInstallerKeys::dictionary) == false) {
      return nullptr;
    }

    if (auto this_dictionary = dictionary->GetDictionary(LoginItemInstallerKeys::dictionary); this_dictionary != nullptr) {
      FromCefDictionary(this_dictionary);
    } else {
      DCHECK(false);
      LOG(ERROR) << "Dictionary representation is unexpectedly null.";
      return nullptr;
    }

    context->Enter();

    // Create a V8 object representing this class.
    auto this_object = CefV8Value::CreateObject(login_item_installer_accessor_, nullptr);
    this_object->SetValue(V8PropertyNames::status, V8_PROPERTY_ATTRIBUTE_NONE);

    // Attach available functions to this object.
    AddFunctionToObject(this_object, V8FunctionNames::setStatusChangedCallback, login_item_installer_handler_);
    AddFunctionToObject(this_object, V8FunctionNames::install, login_item_installer_handler_);
    AddFunctionToObject(this_object, V8FunctionNames::uninstall, login_item_installer_handler_);

    // Attach this object to the passed in object.
    value->SetValue(v8_accessor_name, this_object, V8_PROPERTY_ATTRIBUTE_NONE);

    context->Exit();

    return this_object;
  }

  void LoginItemInstallerProjection::UpdateStateInDictionary(CefRefPtr<CefDictionaryValue> dictionary) {
    if (dictionary->HasKey(LoginItemInstallerKeys::dictionary) == false) {
      DCHECK(false);
      LOG(ERROR) << "Dictionary representation is unexpectedly null.";
      return;
    }

    auto this_dictionary = CefDictionaryValue::Create();
    this_dictionary->SetInt(LoginItemInstallerKeys::status, static_cast<int>(status_));
    dictionary->Remove(LoginItemInstallerKeys::dictionary);
    dictionary->SetDictionary(LoginItemInstallerKeys::dictionary, this_dictionary);
  }

  void LoginItemInstallerProjection::FromCefDictionary(CefRefPtr<CefDictionaryValue> dictionary) {
    if (!dictionary) {
      DCHECK(false);
      LOG(ERROR) << "Failed to update from empty dictionary representation.";
      return;
    }

    if (dictionary->HasKey(LoginItemInstallerKeys::status)) {
      status_ = LoginItemInstallerStatus { dictionary->GetInt(LoginItemInstallerKeys::status) };
    }
  }

  bool LoginItemInstallerProjection::HandleProcessMessage(CefRefPtr<CefBrowser> browser,
                            CefRefPtr<CefFrame> frame,
                            CefProcessId source_process,
                            CefRefPtr<CefProcessMessage> message) {
    if (message->GetName() == LoginItemInstallerMessageNames::stateUpdate) {
      auto args = message->GetArgumentList();
      auto dictionary = args->GetDictionary(0);
      FromCefDictionary(dictionary);

      CefRefPtr<CefListValue> arguments = CefListValue::Create();
      arguments->SetString(0, ToString(GetStatus()));
      ExecuteCallbacksWithArgumentsForFunctionName(V8FunctionNames::setStatusChangedCallback, arguments);
      return true;
    } else {
      return false;
    }
  }
}

