#include "svg_renderer.h"
#include  "exceptions.h"
namespace mmhmm::controls {

void SvgRenderer::RecolorSubtree(ID2D1SvgElement* element,
                                 D2D1_COLOR_F new_color) {
  RecolorByAttribute(element, new_color, L"fill");
  RecolorByAttribute(element, new_color, L"stroke");

  ComPtr<ID2D1SvgElement> child;
  element->GetFirstChild(&child);

  while (child != nullptr) {
    RecolorSubtree(child.Get(), new_color);
    ComPtr<ID2D1SvgElement> next_child;
    element->GetNextChild(child.Get(), &next_child);
    child = next_child;
  }
}

void SvgRenderer::RecolorByAttribute(ID2D1SvgElement* element,
                                     D2D1_COLOR_F new_color,
                                     std::wstring attribute) {
  if (element->IsAttributeSpecified(attribute.c_str())) {
    ComPtr<ID2D1SvgPaint> paint;
    element->GetAttributeValue(attribute.c_str(), &paint);

    auto paint_type = paint->GetPaintType();
    if (paint_type == D2D1_SVG_PAINT_TYPE_COLOR) {
      paint->SetColor(new_color);
    }
  }
}

ComPtr<ID2D1SvgDocument> SvgRenderer::CreateSVG(
    ComPtr<ID2D1DeviceContext5> device_context,
    ComPtr<IStream> svg_stream,
    float width,
    float height) {
  ComPtr<ID2D1SvgDocument> svg_document;
  D2D1_SIZE_F viewport = {width, height};
  HRESULT hr = device_context->CreateSvgDocument(svg_stream.Get(), viewport,
                                                 svg_document.GetAddressOf());
  ThrowIfFailed(hr);

  ComPtr<ID2D1SvgElement> root;
  svg_document->GetRoot(&root);
  ThrowIfNullptr(root.Get());
  root->SetAttributeValue(L"width", width);
  root->SetAttributeValue(L"height", height);

  return svg_document;
}
}  // namespace mmhmm
