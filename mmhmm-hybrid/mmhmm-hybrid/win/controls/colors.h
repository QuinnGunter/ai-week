#pragma once
#include <d2d1_3.h>

namespace mmhmm::controls {
const D2D1::ColorF DarkBackgroundColor = D2D1::ColorF(0.086f,
                                                      0.086f,
                                                      0.102f);  // RGB 22,22,26
const D2D1::ColorF DarkButtonHoverColor =
    D2D1::ColorF(0.129f, 0.129f, 0.153f);  // RGB 33,33,39
const D2D1::ColorF DarkPenColorNormal =
    D2D1::ColorF(1.0f, 1.0f, 1.0f);  // RGB 255,255,255
const D2D1::ColorF DarkPenColorInactive =
    D2D1::ColorF(0.694f, 0.694f, 0.694f);  // RGB 177,177,177
const D2D1::ColorF LightBackgroundColor =
    D2D1::ColorF(1.0f, 1.0f, 1.0f);  // RGB 255,255,255
const D2D1::ColorF LightButtonHoverColor =
    D2D1::ColorF(0.922f, 0.922f, 0.922f);  // RGB 235,235,235
const D2D1::ColorF LightPenColorNormal =
    D2D1::ColorF(0.0f, 0.0f, 0.0f);  // RGB 0,0,0
const D2D1::ColorF LightPenColorInactive =
    D2D1::ColorF(0.306f, 0.306f, 0.306f);  // RGB 78,78,78
const D2D1::ColorF CloseButtonBackgroundColor =
    D2D1::ColorF(0.894f, 0.078f, 0.173f);  // RGB 228,20,44
const D2D1::ColorF ShadowColorNormal =
    D2D1::ColorF(0.392f, 0.392f, 0.392f);  // RGB 100,100,100
const D2D1::ColorF ShadowColorInactive =
    D2D1::ColorF(0.0f, 0.0f, 0.0f);  // RGB 0,0,0
const D2D1::ColorF IndicatorColorDark =
    D2D1::ColorF(0.188f, 0.82f, 0.345f);  // RGB 48,209,88
const D2D1::ColorF IndicatorColorLight =
    D2D1::ColorF(0.204f, 0.78f, 0.349f);  // RGB 52,199,89
 const D2D1::ColorF ConfigColorLight =
    D2D1::ColorF(0.475f, 0.867f, 0.91f);  // RGB 121, 221, 232
const D2D1::ColorF ConfigColorDark =
     D2D1::ColorF(0.102f, 0.459f, 0.502f);  // RGB 26, 117, 128
 const D2D1::ColorF LightSecondaryButtonHoverColor =
     D2D1::ColorF(0.878f, 0.878f, 0.878f);  // RGB 224, 224, 224
 const D2D1::ColorF LightSecondaryButtonBackgroundColor =
     D2D1::ColorF(0.922f, 0.922f, 0.922f);  // RGB 235,235,235
 const D2D1::ColorF DarkSecondaryButtonHoverColor =
     D2D1::ColorF(0.184f, 0.184f, 0.196f);  // RGB 47, 47, 50
 const D2D1::ColorF DarkSecondaryButtonBackgroundColor =
     D2D1::ColorF(0.129f, 0.129f, 0.153f);  // RGB 33, 33, 39
 const D2D1::ColorF AirtimeCreatorIconColor =
     D2D1::ColorF(0.369f, 0.718f, 0.757f);  // RGB 94, 183, 913
 const D2D1::ColorF AirtimeCameraIconColor =
     D2D1::ColorF(1.0f, 0.427f, 0.298f);  // RGB 255, 109, 76
 const D2D1::ColorF StatusTextColorDark =
     D2D1::ColorF(0.188f, 0.82f, 0.345f);  // RGB 48,209,88
 const D2D1::ColorF StatusTextColorLight =
     D2D1::ColorF(0.204f, 0.78f, 0.349f);  // RGB 52,199,89

 static double GetPerceivedLuminance(D2D1::ColorF color) {
   return (0.299 * color.r + 0.587 * color.g + 0.114 * color.b);
 }

 }// namespace mmhmm::controls
