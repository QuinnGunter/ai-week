#include <Windows.h>
#include <exception>
#include <stdio.h>

namespace mmhmm::controls {
class com_exception : public std::exception {
 public:
  com_exception(HRESULT hr) : result(hr) {}

  const char* what() const noexcept override {
    static char s_str[64] = {};
    sprintf_s(s_str, "Failure with HRESULT of %08X",
              static_cast<unsigned int>(result));
    return s_str;
  }

  HRESULT hresult() const { return result; }

 private:
  HRESULT result;
};

class null_exception : public std::exception {
 public:
  null_exception() {}

  const char* what() const noexcept override {
    static char s_str[64] = {};
    return "Nullptr exception";
  }
};

inline void ThrowIfFailed(HRESULT hr) {
  if (FAILED(hr)) {
    throw com_exception(hr);
  }
}

inline void ThrowIfNullptr(void* ptr) {
  if (!ptr) {
    throw null_exception();
  }
}

inline void ThrowIfNullptr(const void* ptr) {
  if (!ptr) {
    throw null_exception();
  }
}
}  // namespace mmhmm
