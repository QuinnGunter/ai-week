#include "api_version.h"

namespace mmhmm {
  const std::string ApiVersion::dictionaryKey = "apiVersion";

  namespace ApiVersionDictionaryKeys {
    const std::string major = "major";
    const std::string minor = "minor";
    const std::string patch = "patch";
  }

  CefRefPtr<CefDictionaryValue> ApiVersion::ToCefDictionary() {
    CefRefPtr<CefDictionaryValue> dictionary = CefDictionaryValue::Create();
    dictionary->SetInt(ApiVersionDictionaryKeys::major, major);
    dictionary->SetInt(ApiVersionDictionaryKeys::minor, minor);
    dictionary->SetInt(ApiVersionDictionaryKeys::patch, patch);
    return dictionary;
  }

  void ApiVersion::FromCefDictionary(CefRefPtr<CefDictionaryValue> dictionary) {
    // Nothing to do here for purely const member values,
    // but required for hybrid capabilities machinery.
  }
}
