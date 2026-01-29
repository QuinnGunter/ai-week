#include <d2d1_3.h>
#include <wrl/client.h>
#include <string>

using namespace Microsoft::WRL;

namespace mmhmm::controls {
class SvgRenderer {
 public:
  static void RecolorSubtree(ID2D1SvgElement* element, D2D1_COLOR_F new_color);
  static void RecolorByAttribute(ID2D1SvgElement* element,
                                 D2D1_COLOR_F new_color,
                                 std::wstring attribute);

  static ComPtr<ID2D1SvgDocument> CreateSVG(
      ComPtr<ID2D1DeviceContext5> device_context,
      ComPtr<IStream> svg_stream,
      float width,
      float height);
};
}  // namespace mmhmm
