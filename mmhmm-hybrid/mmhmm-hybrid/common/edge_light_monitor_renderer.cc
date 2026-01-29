#include "edge_light_monitor_renderer.h"
#include "cef_value_utility.h"

namespace mmhmm {

EdgeLightConfiguration EdgeLightMonitorProjection::GetConfiguration() const {
    return configuration_;
}

}  // namespace mmhmm

namespace mmhmm {

const std::string EdgeLightMonitorProjection::v8_accessor_name = "edgeLight";
const std::string EdgeLightMonitorProjection::V8PropertyNames::configuration = "configuration";
const std::string EdgeLightMonitorProjection::V8FunctionNames::setEnabled = "setEnabled";
const std::string EdgeLightMonitorProjection::V8FunctionNames::setBrightness = "setBrightness";
const std::string EdgeLightMonitorProjection::V8FunctionNames::setWidth = "setWidth";
const std::string EdgeLightMonitorProjection::V8FunctionNames::setColorTemperature = "setColorTemperature";
const std::string EdgeLightMonitorProjection::V8FunctionNames::setAutoBrightness = "setAutoBrightness";
const std::string EdgeLightMonitorProjection::V8FunctionNames::setConfigurationChangedCallback = "setConfigurationChangedCallback";

/**
 * Create a V8 object representing EdgeLightConfiguration
 */
CefRefPtr<CefV8Value> CreateEdgeLightConfigurationCefV8Value(EdgeLightConfiguration config) {
    CefRefPtr<CefV8Value> obj = CefV8Value::CreateObject(nullptr, nullptr);

    obj->SetValue(EdgeLightMonitorKeys::isEnabled,
                  CefV8Value::CreateBool(config.isEnabled),
                  V8_PROPERTY_ATTRIBUTE_NONE);

    obj->SetValue(EdgeLightMonitorKeys::brightness,
                  CefV8Value::CreateDouble(config.brightness),
                  V8_PROPERTY_ATTRIBUTE_NONE);

    obj->SetValue(EdgeLightMonitorKeys::width,
                  CefV8Value::CreateDouble(config.width),
                  V8_PROPERTY_ATTRIBUTE_NONE);

    obj->SetValue(EdgeLightMonitorKeys::colorTemperature,
                  CefV8Value::CreateDouble(config.colorTemperature),
                  V8_PROPERTY_ATTRIBUTE_NONE);

    obj->SetValue(EdgeLightMonitorKeys::autoBrightness,
                  CefV8Value::CreateBool(config.autoBrightness),
                  V8_PROPERTY_ATTRIBUTE_NONE);

    return obj;
}

bool EdgeLightMonitorProjection::EdgeLightMonitorAccessor::Get(
    const CefString& name,
    const CefRefPtr<CefV8Value> object,
    CefRefPtr<CefV8Value>& retval,
    CefString& exception) {

    if (name == V8PropertyNames::configuration) {
        retval = CreateEdgeLightConfigurationCefV8Value(delegate_->GetConfiguration());
        return true;
    }

    return false;
}

bool EdgeLightMonitorProjection::EdgeLightMonitorAccessor::Set(
    const CefString& name,
    const CefRefPtr<CefV8Value> object,
    const CefRefPtr<CefV8Value> value,
    CefString& exception) {
    // Configuration property is read-only
    return false;
}

bool EdgeLightMonitorProjection::EdgeLightMonitorHandler::Execute(
    const CefString& name,
    CefRefPtr<CefV8Value> object,
    const CefV8ValueList& arguments,
    CefRefPtr<CefV8Value>& retval,
    CefString& exception) {

    if (name == V8FunctionNames::setConfigurationChangedCallback) {
        return delegate_->SetCallbackFunction(name, object, arguments, retval, exception);
    }

    // Helper to send a message to browser process
    auto sendMessage = [](const std::string& messageName, CefRefPtr<CefListValue> args) {
        auto message = CefProcessMessage::Create(messageName);
        if (args) {
            message->GetArgumentList()->SetList(0, args);
        }
        SendProcessMessageToBrowserProcess(message);
    };

    if (name == V8FunctionNames::setEnabled) {
        if (arguments.empty() || !arguments[0]->IsBool()) {
            exception = "setEnabled requires a boolean argument";
            return true;
        }
        auto message = CefProcessMessage::Create(EdgeLightMonitorMessageNames::setEnabled);
        message->GetArgumentList()->SetBool(0, arguments[0]->GetBoolValue());
        delegate_->SendProcessMessageToBrowserProcess(message);
        return true;
    }

    if (name == V8FunctionNames::setBrightness) {
        if (arguments.empty() || !arguments[0]->IsDouble()) {
            exception = "setBrightness requires a number argument";
            return true;
        }
        auto message = CefProcessMessage::Create(EdgeLightMonitorMessageNames::setBrightness);
        message->GetArgumentList()->SetDouble(0, arguments[0]->GetDoubleValue());
        delegate_->SendProcessMessageToBrowserProcess(message);
        return true;
    }

    if (name == V8FunctionNames::setWidth) {
        if (arguments.empty() || !arguments[0]->IsDouble()) {
            exception = "setWidth requires a number argument";
            return true;
        }
        auto message = CefProcessMessage::Create(EdgeLightMonitorMessageNames::setWidth);
        message->GetArgumentList()->SetDouble(0, arguments[0]->GetDoubleValue());
        delegate_->SendProcessMessageToBrowserProcess(message);
        return true;
    }

    if (name == V8FunctionNames::setColorTemperature) {
        if (arguments.empty() || !arguments[0]->IsDouble()) {
            exception = "setColorTemperature requires a number argument";
            return true;
        }
        auto message = CefProcessMessage::Create(EdgeLightMonitorMessageNames::setColorTemperature);
        message->GetArgumentList()->SetDouble(0, arguments[0]->GetDoubleValue());
        delegate_->SendProcessMessageToBrowserProcess(message);
        return true;
    }

    if (name == V8FunctionNames::setAutoBrightness) {
        if (arguments.empty() || !arguments[0]->IsBool()) {
            exception = "setAutoBrightness requires a boolean argument";
            return true;
        }
        auto message = CefProcessMessage::Create(EdgeLightMonitorMessageNames::setAutoBrightness);
        message->GetArgumentList()->SetBool(0, arguments[0]->GetBoolValue());
        delegate_->SendProcessMessageToBrowserProcess(message);
        return true;
    }

    return false;
}

}  // namespace mmhmm

namespace mmhmm {

CefRefPtr<CefV8Value> EdgeLightMonitorProjection::AttachToValueFromDictionary(
    CefRefPtr<CefV8Value> value,
    CefRefPtr<CefDictionaryValue> dictionary,
    CefRefPtr<CefV8Context> context) {

    if (dictionary->HasKey(EdgeLightMonitorKeys::dictionary) == false) {
        return nullptr;
    }

    if (auto this_dictionary = dictionary->GetDictionary(EdgeLightMonitorKeys::dictionary);
        this_dictionary != nullptr) {
        FromCefDictionary(this_dictionary);
    } else {
        DCHECK(false);
        LOG(ERROR) << "Dictionary representation is unexpectedly null.";
        return nullptr;
    }

    context->Enter();

    // Create a V8 object representing this class
    auto this_object = CefV8Value::CreateObject(accessor_, nullptr);
    this_object->SetValue(V8PropertyNames::configuration, V8_PROPERTY_ATTRIBUTE_NONE);

    // Attach available functions to this object
    AddFunctionToObject(this_object, V8FunctionNames::setEnabled, handler_);
    AddFunctionToObject(this_object, V8FunctionNames::setBrightness, handler_);
    AddFunctionToObject(this_object, V8FunctionNames::setWidth, handler_);
    AddFunctionToObject(this_object, V8FunctionNames::setColorTemperature, handler_);
    AddFunctionToObject(this_object, V8FunctionNames::setAutoBrightness, handler_);
    AddFunctionToObject(this_object, V8FunctionNames::setConfigurationChangedCallback, handler_);

    // Attach this object to the passed in object
    value->SetValue(v8_accessor_name, this_object, V8_PROPERTY_ATTRIBUTE_NONE);

    context->Exit();

    return this_object;
}

void EdgeLightMonitorProjection::UpdateStateInDictionary(CefRefPtr<CefDictionaryValue> dictionary) {
    if (dictionary->HasKey(EdgeLightMonitorKeys::dictionary) == false) {
        DCHECK(false);
        LOG(ERROR) << "Dictionary representation is unexpectedly null.";
        return;
    }

    auto this_dictionary = CefDictionaryValue::Create();
    this_dictionary->SetDictionary(EdgeLightMonitorKeys::configuration,
                                   ToCefDictionary(configuration_));
    dictionary->Remove(EdgeLightMonitorKeys::dictionary);
    dictionary->SetDictionary(EdgeLightMonitorKeys::dictionary, this_dictionary);
}

void EdgeLightMonitorProjection::FromCefDictionary(CefRefPtr<CefDictionaryValue> dictionary) {
    if (!dictionary) {
        DCHECK(false);
        LOG(ERROR) << "Failed to update from empty dictionary representation.";
        return;
    }

    if (dictionary->HasKey(EdgeLightMonitorKeys::configuration) == false) {
        // Configuration may not be present initially, use defaults
        configuration_ = EdgeLightConfiguration();
        return;
    }

    auto configDictionary = dictionary->GetDictionary(EdgeLightMonitorKeys::configuration);
    if (auto maybeConfig = EdgeLightConfigurationFromCefDictionary(configDictionary);
        maybeConfig.has_value()) {
        configuration_ = maybeConfig.value();
    } else {
        DCHECK(false);
    }
}

bool EdgeLightMonitorProjection::HandleProcessMessage(
    CefRefPtr<CefBrowser> browser,
    CefRefPtr<CefFrame> frame,
    CefProcessId source_process,
    CefRefPtr<CefProcessMessage> message) {

    if (message->GetName() == EdgeLightMonitorMessageNames::configurationUpdate) {
        auto args = message->GetArgumentList();
        auto dictionary = args->GetDictionary(0);
        FromCefDictionary(dictionary);

        CefRefPtr<CefListValue> arguments = CefListValue::Create();
        arguments->SetDictionary(0, ToCefDictionary(GetConfiguration()));
        ExecuteCallbacksWithArgumentsForFunctionName(
            V8FunctionNames::setConfigurationChangedCallback, arguments);
        return true;
    }

    return false;
}

}  // namespace mmhmm
