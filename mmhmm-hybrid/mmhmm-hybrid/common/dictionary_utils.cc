#include "dictionary_utils.h"
#include <nlohmann/json.hpp>

// Helper function to convert any CEF value to std::any
static std::any CefValueToAny(CefRefPtr<CefValue> cefValue) {
  if (!cefValue || !cefValue->IsValid()) {
    return std::any();
  }

  CefValueType type = cefValue->GetType();

  switch (type) {
    case VTYPE_NULL:
      return std::any();

    case VTYPE_BOOL:
      return cefValue->GetBool();

    case VTYPE_INT:
      return cefValue->GetInt();

    case VTYPE_DOUBLE:
      return cefValue->GetDouble();

    case VTYPE_STRING:
      return cefValue->GetString().ToString();

    case VTYPE_BINARY: {
      CefRefPtr<CefBinaryValue> binaryValue = cefValue->GetBinary();
      if (binaryValue && binaryValue->IsValid()) {
        size_t size = binaryValue->GetSize();
        std::vector<uint8_t> data(size);
        binaryValue->GetData(data.data(), size, 0);
        return data;
      }
      return std::vector<uint8_t>();
    }

    case VTYPE_DICTIONARY:
      return mmhmm::ToStdDictionary(cefValue);

    case VTYPE_LIST: {
      CefRefPtr<CefListValue> listValue = cefValue->GetList();
      auto result = std::make_shared<mmhmm::StdList>();

      if (listValue && listValue->IsValid()) {
        size_t size = listValue->GetSize();
        result->reserve(size);

        for (size_t i = 0; i < size; ++i) {
          CefRefPtr<CefValue> childValue = listValue->GetValue(i);
          result->push_back(CefValueToAny(childValue));
        }
      }
      return result;
    }

    default:
      return std::any();
  }
}

mmhmm::StdDictionary mmhmm::ToStdDictionary(CefRefPtr<CefValue> cefValue) {
  auto result = mmhmm::StdDictionary {};
  CefValueType type = cefValue->GetType();

  if (!cefValue || !cefValue->IsValid() || type != VTYPE_DICTIONARY) {
    return result;
  }

  CefRefPtr<CefDictionaryValue> dictValue = cefValue->GetDictionary();

  if (dictValue && dictValue->IsValid()) {
    std::vector<CefString> keys;
    dictValue->GetKeys(keys);

    for (const auto& key : keys) {
      std::string keyStr = key.ToString();
      CefRefPtr<CefValue> childValue = dictValue->GetValue(key);
      result[keyStr] = CefValueToAny(childValue);
    }
  }

  return result;
}

// Helper function to convert any CEF value to JSON string
static std::string CefValueToJSON(CefRefPtr<CefValue> cefValue) {
  if (!cefValue || !cefValue->IsValid()) {
    return "null";
  }

  CefValueType type = cefValue->GetType();
  nlohmann::json json;

  switch (type) {
    case VTYPE_NULL:
      json = nullptr;
      break;

    case VTYPE_BOOL:
      json = cefValue->GetBool();
      break;

    case VTYPE_INT:
      json = cefValue->GetInt();
      break;

    case VTYPE_DOUBLE:
      json = cefValue->GetDouble();
      break;

    case VTYPE_STRING:
      json = cefValue->GetString().ToString();
      break;

    case VTYPE_BINARY: {
      CefRefPtr<CefBinaryValue> binaryValue = cefValue->GetBinary();
      if (binaryValue && binaryValue->IsValid()) {
        size_t size = binaryValue->GetSize();
        std::vector<uint8_t> data(size);
        binaryValue->GetData(data.data(), size, 0);
        json = data;
      } else {
        json = nlohmann::json::array();
      }
      break;
    }

    case VTYPE_DICTIONARY: {
      CefRefPtr<CefDictionaryValue> dictValue = cefValue->GetDictionary();
      nlohmann::json dictJson = nlohmann::json::object();

      if (dictValue && dictValue->IsValid()) {
        std::vector<CefString> keys;
        dictValue->GetKeys(keys);

        for (const auto& key : keys) {
          std::string keyStr = key.ToString();
          CefRefPtr<CefValue> childValue = dictValue->GetValue(key);
          dictJson[keyStr] = nlohmann::json::parse(CefValueToJSON(childValue));
        }
      }
      json = dictJson;
      break;
    }

    case VTYPE_LIST: {
      CefRefPtr<CefListValue> listValue = cefValue->GetList();
      nlohmann::json listJson = nlohmann::json::array();

      if (listValue && listValue->IsValid()) {
        size_t size = listValue->GetSize();

        for (size_t i = 0; i < size; ++i) {
          CefRefPtr<CefValue> childValue = listValue->GetValue(i);
          listJson.push_back(nlohmann::json::parse(CefValueToJSON(childValue)));
        }
      }
      json = listJson;
      break;
    }

    default:
      json = nullptr;
      break;
  }

  return json.dump();
}

std::string mmhmm::ToJsonDictionary(CefRefPtr<CefValue> cefValue) {
  CefValueType type = cefValue->GetType();

  if (!cefValue || !cefValue->IsValid() || type != VTYPE_DICTIONARY) {
    return "{}";
  }

  CefRefPtr<CefDictionaryValue> dictValue = cefValue->GetDictionary();
  nlohmann::json result = nlohmann::json::object();

  if (dictValue && dictValue->IsValid()) {
    std::vector<CefString> keys;
    dictValue->GetKeys(keys);

    for (const auto& key : keys) {
      std::string keyStr = key.ToString();
      CefRefPtr<CefValue> childValue = dictValue->GetValue(key);
      result[keyStr] = nlohmann::json::parse(CefValueToJSON(childValue));
    }
  }

  return result.dump();
}

// Helper function to convert JSON value to CEF value
static CefRefPtr<CefValue> JsonToCefValue(const nlohmann::json& json) {
  CefRefPtr<CefValue> cefValue = CefValue::Create();

  if (json.is_null()) {
    cefValue->SetNull();
  } else if (json.is_boolean()) {
    cefValue->SetBool(json.get<bool>());
  } else if (json.is_number_integer()) {
    cefValue->SetInt(json.get<int>());
  } else if (json.is_number_float()) {
    cefValue->SetDouble(json.get<double>());
  } else if (json.is_string()) {
    cefValue->SetString(json.get<std::string>());
  } else if (json.is_array()) {
    CefRefPtr<CefListValue> listValue = CefListValue::Create();
    size_t index = 0;
    
    for (const auto& item : json) {
      CefRefPtr<CefValue> childValue = JsonToCefValue(item);
      listValue->SetValue(index++, childValue);
    }
    
    cefValue->SetList(listValue);
  } else if (json.is_object()) {
    CefRefPtr<CefDictionaryValue> dictValue = CefDictionaryValue::Create();
    
    for (auto it = json.begin(); it != json.end(); ++it) {
      CefRefPtr<CefValue> childValue = JsonToCefValue(it.value());
      dictValue->SetValue(it.key(), childValue);
    }
    
    cefValue->SetDictionary(dictValue);
  } else {
    // Unsupported type, set to null
    DCHECK(false);
    cefValue->SetNull();
  }

  return cefValue;
}

CefRefPtr<CefDictionaryValue> mmhmm::ToCefDictionaryValue(std::string jsonString) {
  CefRefPtr<CefDictionaryValue> result = CefDictionaryValue::Create();

  if (jsonString.empty()) {
    return result;
  }

  try {
    nlohmann::json json = nlohmann::json::parse(jsonString);
    
    if (!json.is_object()) {
      // Not a JSON object
      DCHECK(false);
      return result;
    }

    for (auto it = json.begin(); it != json.end(); ++it) {
      CefRefPtr<CefValue> childValue = JsonToCefValue(it.value());
      result->SetValue(it.key(), childValue);
    }
  } catch (const nlohmann::json::exception& e) {
    LOG(ERROR) << "JSON parsing error: " << e.what();
    DCHECK(false);
  }

  return result;
}

