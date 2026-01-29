//
//  cef_value_utility.cc
//  mmhmm
//
//  Created by Beni Federer on 08.11.24.
//

#include "cef_value_utility.h"

// Allow  template functions to be defined in source file instead of header file by defining known specializations.
template CefRefPtr<CefListValue> mmhmm::ToCefListValue<bool>(std::vector<bool> vector);
template CefRefPtr<CefListValue> mmhmm::ToCefListValue<int>(std::vector<int> vector);
template CefRefPtr<CefListValue> mmhmm::ToCefListValue<double>(std::vector<double> vector);
template CefRefPtr<CefListValue> mmhmm::ToCefListValue<std::string>(std::vector<std::string> vector);

template <typename T>
CefRefPtr<CefListValue> mmhmm::ToCefListValue(std::vector<T> vector) {
  CefRefPtr<CefListValue> list = CefListValue::Create();

  for (std::size_t index = 0; index < vector.size(); ++index) {
    T element = vector[index];
    if constexpr (std::is_same<T, bool>::value) {
      list->SetBool(index, element);
    } else if constexpr (std::is_same<T, int>::value) {
      list->SetInt(index, element);
    } else if constexpr (std::is_same<T, double>::value) {
      list->SetDouble(index, element);
    } else if constexpr (std::is_same<T, std::string>::value) {
      list->SetString(index, element);
    } else {
      // Indicate no support
      list->SetNull(index);
    }
  }

  return list;
}

// Allow  template functions to be defined in source file instead of header file by defining known specializations.
template std::vector<bool> mmhmm::ToVector<bool>(CefRefPtr<CefListValue> list);
template std::vector<int> mmhmm::ToVector<int>(CefRefPtr<CefListValue> list);
template std::vector<double> mmhmm::ToVector<double>(CefRefPtr<CefListValue> list);
template std::vector<std::string> mmhmm::ToVector<std::string>(CefRefPtr<CefListValue> list);

template <typename T>
std::vector<T> mmhmm::ToVector(CefRefPtr<CefListValue> list) {
  size_t listSize = list->GetSize();
  std::vector<T> vector;
  vector.reserve(listSize);

  for (std::size_t index = 0; index < listSize; ++index) {
    if constexpr (std::is_same<T, bool>::value) {
      if (list->GetType(index) == VTYPE_BOOL) {
        vector.emplace_back(list->GetBool(index));
      }
    } else if constexpr (std::is_same<T, int>::value) {
      if (list->GetType(index) == VTYPE_INT) {
        vector.emplace_back(list->GetInt(index));
      }
    } else if constexpr (std::is_same<T, double>::value) {
      if (list->GetType(index) == VTYPE_DOUBLE) {
        vector.emplace_back(list->GetDouble(index));
      }
    } else if constexpr (std::is_same<T, std::string>::value) {
      if (list->GetType(index) == VTYPE_STRING) {
        vector.emplace_back(list->GetString(index).ToString());
      }
    } else {
      // Indicate no support
      list->SetNull(index);
    }
  }

  return vector;
}

CefRefPtr<CefV8Value> mmhmm::ToCEFV8Object(CefRefPtr<CefDictionaryValue> dictionary) {
  CefRefPtr<CefV8Value> object = CefV8Value::CreateObject(nullptr, nullptr);

  CefDictionaryValue::KeyList keys;
  dictionary->GetKeys(keys);

  for (CefString key : keys) {
    CefRefPtr<CefV8Value> value = ToCEFV8Value(dictionary->GetValue(key));
    object->SetValue(key, value, static_cast<cef_v8_propertyattribute_t>(V8_PROPERTY_ATTRIBUTE_NONE));
  }

  return object;
}

CefRefPtr<CefV8Value> mmhmm::ToCEFV8Array(CefRefPtr<CefListValue> list) {
  auto listSize = list->GetSize();
  CefRefPtr<CefV8Value> array = CefV8Value::CreateArray(static_cast<int>(listSize));

  for (std::size_t index = 0; index < listSize; ++index) {
    auto listElement = list->GetValue(index);
    array->SetValue(static_cast<int>(index), ToCEFV8Value(listElement));
  }

  return array;
}

CefRefPtr<CefV8Value> mmhmm::ToCEFV8Buffer(CefRefPtr<CefBinaryValue> binary) {
  void* rawData = const_cast<void *>(binary->GetRawData());
  size_t size = binary->GetSize();
  return CefV8Value::CreateArrayBufferWithCopy(rawData, size);
}

CefRefPtr<CefV8Value> mmhmm::ToCEFV8Value(CefRefPtr<CefValue> cefValue) {
  CefRefPtr<CefV8Value> value = nullptr;
  CefValueType valueType = cefValue->GetType();
  switch (valueType) {
    case VTYPE_NULL:
      value = CefV8Value::CreateNull();
      break;
    case VTYPE_BOOL:
      value = CefV8Value::CreateBool(cefValue->GetBool());
      break;
    case VTYPE_INT:
      value = CefV8Value::CreateInt(cefValue->GetInt());
      break;
    case VTYPE_DOUBLE:
      value = CefV8Value::CreateDouble(cefValue->GetDouble());
      break;
    case VTYPE_STRING:
      value = CefV8Value::CreateString(cefValue->GetString());
      break;
    case VTYPE_BINARY:
      value = ToCEFV8Buffer(cefValue->GetBinary());
      break;
    case VTYPE_DICTIONARY:
      value = ToCEFV8Object(cefValue->GetDictionary());
      break;
    case VTYPE_LIST:
      value = ToCEFV8Array(cefValue->GetList());
      break;
    case VTYPE_INVALID:
    default:
      value = CefV8Value::CreateUndefined();
      break;
  }
  return value;
}

CefRefPtr<CefValue> mmhmm::ToIntCefValue(CefRefPtr<CefV8Value> v8Value) {
  if (v8Value.get() == nullptr || v8Value->IsInt() == false || v8Value->IsValid() == false) {
    return nullptr;
  }

  CefRefPtr<CefValue> cefValue = CefValue::Create();
  cefValue->SetInt(v8Value->GetUIntValue());

  return cefValue;
}

CefRefPtr<CefValue> mmhmm::ToCefValue(CefRefPtr<CefV8Value> v8Value) {
  if (v8Value.get() == nullptr || v8Value->IsValid() == false) {
    return nullptr;
  }

  CefRefPtr<CefValue> cefValue = CefValue::Create();

  if (v8Value->IsUndefined()) {
    cefValue->SetNull();
  } else if (v8Value->IsNull()) {
    cefValue->SetNull();
  } else if (v8Value->IsBool()) {
    cefValue->SetBool(v8Value->GetBoolValue());
  } else if (v8Value->IsDouble()) {
    // All V8 number values are double internally, but `GetIntValue` and `GetUIntValue`
    // also return `true` for numbers. To preserve accuracy, treat each number as a `double`
    // and use `int` and `uint` only as fallbacks, in case a number does not qualify as
    // a `double` for whatever reason.
    cefValue->SetDouble(v8Value->GetDoubleValue());
  } else if (v8Value->IsInt()) {
    cefValue->SetInt(v8Value->GetIntValue());
  } else if (v8Value->IsUInt()) {
    cefValue->SetInt(v8Value->GetUIntValue());
  } else if (v8Value->IsString()) {
    cefValue->SetString(v8Value->GetStringValue());
  } else if (v8Value->IsDate()) {
    CefBaseTime date = v8Value->GetDateValue();
    cefValue->SetInt(static_cast<int>(date.val));
  } else if (v8Value->IsArray()) {
    CefRefPtr<CefListValue> list = CefListValue::Create();
    int length = v8Value->GetArrayLength();
    for (int i = 0; i < length; ++i) {
      CefRefPtr<CefV8Value> v8ArrayElement = v8Value->GetValue(i);
      CefRefPtr<CefValue> cefListElement = ToCefValue(v8ArrayElement);
      list->SetValue(i, cefListElement);
    }
    cefValue->SetList(list);
  } else if (v8Value->IsObject()) {
    CefRefPtr<CefDictionaryValue> dictionary = CefDictionaryValue::Create();
    std::vector<CefString> keys;
    if (v8Value->GetKeys(keys)) {
      for (size_t i = 0; i < keys.size(); ++i) {
        const CefString& key = keys[i];
        CefRefPtr<CefV8Value> value = v8Value->GetValue(key);
        CefRefPtr<CefValue> cefDictionaryValue = ToCefValue(value);
        dictionary->SetValue(key, cefDictionaryValue);
      }
    }
    cefValue->SetDictionary(dictionary);
  } else {
    cefValue->SetNull();
  }

  return cefValue;
}

std::string IndentString(int indent) {
  return std::string(indent, ' ');
}

std::string mmhmm::CefValueToString(const CefRefPtr<CefValue>& value, int indent) {
    if (!value.get()) return "null";

    std::ostringstream oss;
    switch (value->GetType()) {
        case VTYPE_NULL:
            oss << "null";
            break;
        case VTYPE_BOOL:
            oss << (value->GetBool() ? "true" : "false");
            break;
        case VTYPE_INT:
            oss << value->GetInt();
            break;
        case VTYPE_DOUBLE:
            oss << value->GetDouble();
            break;
        case VTYPE_STRING:
            oss << "\"" << value->GetString().ToString() << "\"";
            break;
        case VTYPE_BINARY:
            oss << "<binary>";
            break;
        case VTYPE_DICTIONARY: {
            CefRefPtr<CefDictionaryValue> dict = value->GetDictionary();
            oss << "{\n";
            CefDictionaryValue::KeyList keys;
            dict->GetKeys(keys);
            for (size_t i = 0; i < keys.size(); ++i) {
                oss << IndentString(indent + 2) << "\"" << keys[i].ToString() << "\": "
                    << CefValueToString(dict->GetValue(keys[i]), indent + 2);
                if (i + 1 != keys.size()) oss << ",";
                oss << "\n";
            }
            oss << IndentString(indent) << "}";
            break;
        }
        case VTYPE_LIST: {
            CefRefPtr<CefListValue> list = value->GetList();
            oss << "[\n";
            for (size_t i = 0; i < list->GetSize(); ++i) {
                oss << IndentString(indent + 2)
                    << CefValueToString(list->GetValue(i), indent + 2);
                if (i + 1 != list->GetSize()) oss << ",";
                oss << "\n";
            }
            oss << IndentString(indent) << "]";
            break;
        }
        default:
            oss << "<unknown>";
            break;
    }
    return oss.str();
}

std::string mmhmm::CEFV8ValueToString(const CefRefPtr<CefV8Value>& value, int indent) {
  if (!value) {
    return IndentString(indent) + "null";
  }

  std::string indentedString = IndentString(indent);

  if (value->IsString()) {
    return indentedString + "\"" + value->GetStringValue().ToString() + "\"";
  }
  else if (value->IsInt()) {
    return indentedString + std::to_string(value->GetIntValue());
  }
  else if (value->IsUInt()) {
    return indentedString + std::to_string(value->GetUIntValue());
  }
  else if (value->IsDouble()) {
    return indentedString + std::to_string(value->GetDoubleValue());
  }
  else if (value->IsBool()) {
    return indentedString + (value->GetBoolValue() ? "true" : "false");
  }
  else if (value->IsNull()) {
    return indentedString + "null";
  }
  else if (value->IsUndefined()) {
    return indentedString + "undefined";
  }
  else if (value->IsArray()) {
    int length = value->GetArrayLength();
    std::string result = indentedString + "[\n";
    for (int i = 0; i < length; ++i) {
      CefRefPtr<CefV8Value> element = value->GetValue(i);
      result += CEFV8ValueToString(element, indent + 2);
      if (i < length - 1) {
        result += ",";
      }
      result += "\n";
    }
    result += indentedString + "]";
    return result;
  }
  else if (value->IsObject()) {
    std::vector<CefString> keys;
    if (value->GetKeys(keys)) {
      std::string result = indentedString + "{\n";
      for (size_t i = 0; i < keys.size(); ++i) {
        const CefString& key = keys[i];
        CefRefPtr<CefV8Value> propValue = value->GetValue(key);
        result += IndentString(indent + 2) + key.ToString() + ": ";

        // For nested objects or arrays, add newline and indent
        if (propValue->IsObject() || propValue->IsArray()) {
          result += "\n" + CEFV8ValueToString(propValue, indent + 4);
        } else {
          result += CEFV8ValueToString(propValue, 0);
        }

        if (i < keys.size() - 1) {
          result += ",";
        }
        result += "\n";
      }
      result += indentedString + "}";
      return result;
    } else {
      return indentedString + "{}";
    }
  }
  else {
    return indentedString + "<Unknown Type>";
  }
}
