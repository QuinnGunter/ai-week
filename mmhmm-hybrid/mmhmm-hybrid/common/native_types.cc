#include "native_types.h"

inline mmhmm::PlatformString CefStringToPlatformString(const CefString& cefStr) {
#ifdef OS_WIN
  return cefStr.ToWString();
#else
  return cefStr.ToString();
#endif
}

mmhmm::NativeType mmhmm::ToNativeType(CefRefPtr<CefValue> cefValue) {
  if (!cefValue || !cefValue->IsValid()) {
    return nullptr;
  }

  CefValueType type = cefValue->GetType();

  switch (type) {
    case VTYPE_NULL:
      return nullptr;

    case VTYPE_BOOL:
      return cefValue->GetBool();

    case VTYPE_INT:
      return cefValue->GetInt();

    case VTYPE_DOUBLE:
      return cefValue->GetDouble();

    case VTYPE_STRING: {
      CefString cefStr = cefValue->GetString();
      return CefStringToPlatformString(cefStr);
    }

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

    case VTYPE_DICTIONARY: {
      CefRefPtr<CefDictionaryValue> dictValue = cefValue->GetDictionary();
      auto result = std::make_unique<mmhmm::NativeDictionary>();

      if (dictValue && dictValue->IsValid()) {
        std::vector<CefString> keys;
        dictValue->GetKeys(keys);

        for (const auto& key : keys) {
#ifdef OS_WIN
          mmhmm::PlatformString keyStr = key.ToWString();
#else
          mmhmm::PlatformString keyStr = key.ToString();
#endif
          CefRefPtr<CefValue> childValue = dictValue->GetValue(key);
          result->data[keyStr] = ToNativeType(childValue);
        }
      }
      return result;
    }

    case VTYPE_LIST: {
      CefRefPtr<CefListValue> listValue = cefValue->GetList();
      auto result = std::make_unique<mmhmm::NativeList>();

      if (listValue && listValue->IsValid()) {
        size_t size = listValue->GetSize();
        result->data.reserve(size);

        for (size_t i = 0; i < size; ++i) {
          CefRefPtr<CefValue> childValue = listValue->GetValue(i);
          result->data.push_back(ToNativeType(childValue));
        }
      }
      return result;
    }

    default:
      return nullptr;
  }
}
