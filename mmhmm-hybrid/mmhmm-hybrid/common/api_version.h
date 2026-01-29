#pragma once

#include "include/internal/cef_ptr.h"
#include "include/cef_values.h"

namespace mmhmm {
  struct ApiVersion {
    static const std::string dictionaryKey;

    // Increase on hybrid API changes according to https://semver.org/
    //
    // MAJOR version when you make incompatible API changes
    const int major = 1;
    // MINOR version when you add functionality in a backward compatible manner
    const int minor = 10;
    // PATCH version when you make backward compatible bug fixes
    const int patch = 0;

    // ctor explicitly defined because explicit definition of implicitly deleted cctor deletes implicitly defined ctor.
    ApiVersion() {};
    // cctor explicitly defined because purely const struct deletes implicitly defined cctor.
    ApiVersion(ApiVersion&) {};
    // copy assignment operator explicitly defined because purely const struct deletes implicitly defined copy assignment operator.
    ApiVersion& operator=(ApiVersion&) { return *this; };

    CefRefPtr<CefDictionaryValue> ToCefDictionary();
    void FromCefDictionary(CefRefPtr<CefDictionaryValue> dictionary);
  };
}
