#include <wrl/client.h>

using namespace Microsoft::WRL;

namespace mmhmm::controls {
class ImageLoader {
 public:
  static ComPtr<IStream> LoadImageAsStream(LPCTSTR name, LPCTSTR type);
};
}  // namespace mmhmm
