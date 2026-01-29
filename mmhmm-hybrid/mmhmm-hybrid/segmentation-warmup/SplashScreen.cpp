#include "SplashScreen.h"

#include <stdexcept>
#include "../browser/resource.h"
#include "../browser/util_win.h"

using namespace Gdiplus;

namespace mmhmm::segmentation::warmup {
SplashScreen::SplashScreen(const TCHAR* backgroundPath,
                           const TCHAR* gifPath,
                           std::shared_ptr<spdlog::logger> logger)
    : hwnd_(nullptr),
      waitingGif_(nullptr),
      backgroundImage_(nullptr),
      frameIndex_(0),
      running_(false),
      canceled_(false),
      gdiplusToken_(0),
      hdcMem_(nullptr),
      hbmMem_(nullptr),
      hbmOld_(nullptr),
      logger_(logger) {
  GdiplusStartupInput gdiplusStartupInput;
  GdiplusStartup(&gdiplusToken_, &gdiplusStartupInput, nullptr);

  LoadResources(backgroundPath, gifPath);
}

SplashScreen::~SplashScreen() {
  Close();

  if (backgroundImage_) {
    delete backgroundImage_;
    backgroundImage_ = nullptr;
  }

  if (waitingGif_) {
    delete waitingGif_;
    waitingGif_ = nullptr;
  }

  GdiplusShutdown(gdiplusToken_);

  if (hdcMem_) {
    SelectObject(hdcMem_, hbmOld_);
    DeleteObject(hbmMem_);
    DeleteDC(hdcMem_);
    hdcMem_ = nullptr;
    hbmMem_ = nullptr;
    hbmOld_ = nullptr;
  }
}

void SplashScreen::LoadResources(const TCHAR* backgroundPath,
                                 const TCHAR* gifPath) {
  waitingGif_ = new Image(gifPath);
  backgroundImage_ = new Image(backgroundPath);

  if (waitingGif_->GetLastStatus() != 0 || backgroundImage_->GetLastStatus()) {
    throw std::runtime_error("Unable to load resources for splash screen!");
  }
}

void SplashScreen::Show() {
  running_ = true;
  thread_ = std::thread(&SplashScreen::Run, this);
}

void SplashScreen::Close() {
  if (running_) {
    running_ = false;
    canceled_ = true;
    cv_.notify_all();
  }
  if (thread_.joinable()) {
    thread_.join();
  }
}
// TODO : Replace with layout helper in controls dir.
static int ScaleForDPI(int value, UINT dpi) {
  return (int)((float)value * dpi / 96);
}

void SplashScreen::Run() {
  std::unique_lock<std::mutex> lock(cv_mutex_);
  int splashWidth = 480;
  int splashHeight = 270;
  int screenWidth = GetSystemMetrics(SM_CXSCREEN);
  int screenHeight = GetSystemMetrics(SM_CYSCREEN);

  int posX = (screenWidth - splashWidth) / 2;
  int posY = (screenHeight - splashHeight) / 2;

  const TCHAR CLASS_NAME[] = _T("SplashScreenClass");

  WNDCLASS wc = {};
  wc.lpfnWndProc = WindowProc;
  wc.hInstance = client::GetCodeModuleHandle();
  wc.lpszClassName = CLASS_NAME;
  wc.hCursor = LoadCursor(NULL, IDC_ARROW);
  wc.hbrBackground = (HBRUSH)GetStockObject(WHITE_BRUSH);

  RegisterClass(&wc);

  hwnd_ = CreateWindowEx(WS_EX_LAYERED | WS_EX_TOPMOST | WS_EX_COMPOSITED,
                         CLASS_NAME, _T("Splash Screen"), WS_POPUP, posX, posY,
                         splashWidth, splashHeight, NULL, NULL,
                         client::GetCodeModuleHandle(), this);

  if (!hwnd_) {
    throw std::runtime_error("Unable to create splash window!");
  }

  ScaleAndCenterWindow(hwnd_, screenWidth, screenHeight, splashWidth, splashHeight);

  SetLayeredWindowAttributes(hwnd_, 0, 255, LWA_ALPHA);
  ShowWindow(hwnd_, SW_SHOW);

  HDC hdc = GetDC(hwnd_);
  hdcMem_ = CreateCompatibleDC(hdc);
  hbmMem_ = CreateCompatibleBitmap(hdc, splashWidth, splashHeight);
  hbmOld_ = (HBITMAP)SelectObject(hdcMem_, hbmMem_);
  ReleaseDC(hwnd_, hdc);

  MSG msg = {};
  while (running_) {
    while (PeekMessage(&msg, NULL, 0, 0, PM_REMOVE)) {
      TranslateMessage(&msg);
      DispatchMessage(&msg);
    }
    InvalidateRect(hwnd_, NULL, FALSE);
    Sleep(33);
  }

  DestroyWindow(hwnd_);
}

void SplashScreen::ScaleAndCenterWindow(HWND hwnd,int screenWidth, int screenHeight, int& width, int& height) {
  UINT dpi = GetDpiForWindow(hwnd);
  width = ScaleForDPI(width, dpi);
  height = ScaleForDPI(height, dpi);

  auto posX = (screenWidth - width) / 2;
  auto posY = (screenHeight - height) / 2;
  SetWindowPos(hwnd, nullptr, posX, posY, width,
               height, SWP_NOZORDER);
}

LRESULT CALLBACK SplashScreen::WindowProc(HWND hwnd,
                                          UINT uMsg,
                                          WPARAM wParam,
                                          LPARAM lParam) {
  SplashScreen* pThis;
  if (uMsg == WM_NCCREATE) {
    pThis = static_cast<SplashScreen*>(
        reinterpret_cast<CREATESTRUCT*>(lParam)->lpCreateParams);
    SetWindowLongPtr(hwnd, GWLP_USERDATA, (LONG_PTR)pThis);
  } else {
    pThis =
        reinterpret_cast<SplashScreen*>(GetWindowLongPtr(hwnd, GWLP_USERDATA));
  }

  if (pThis) {
    switch (uMsg) {
      case WM_PAINT:
        pThis->OnPaint();
        return 0;
      case WM_DESTROY:
        PostQuitMessage(0);
        return 0;
    }
  }

  return DefWindowProc(hwnd, uMsg, wParam, lParam);
}

void SplashScreen::OnPaint() {
  PAINTSTRUCT ps;
  HDC hdc = BeginPaint(hwnd_, &ps);

  RECT rect;
  GetClientRect(hwnd_, &rect);

  FillRect(hdcMem_, &rect, (HBRUSH)GetStockObject(WHITE_BRUSH));

  Graphics graphics(hdcMem_);

  graphics.SetTextRenderingHint(TextRenderingHintAntiAlias);

  std::wstring text =
      client::GetResourceString(IDS_SEGMENTATION_WARUP_MESSAGE);

  FontFamily fontFamily(L"Arial");
  Font font(&fontFamily, 14, FontStyleRegular, UnitPixel);

  SolidBrush textBrush(Color(255, 255, 255, 255));

  RectF textRectanagle;

  graphics.MeasureString(text.c_str(), -1, &font, PointF(0, 0), &textRectanagle);

  UINT dimensionCount = waitingGif_->GetFrameDimensionsCount();
  GUID* pDimensionIDs = new GUID[dimensionCount];
  waitingGif_->GetFrameDimensionsList(pDimensionIDs, dimensionCount);
  UINT frameCount = waitingGif_->GetFrameCount(&pDimensionIDs[0]);
  waitingGif_->SelectActiveFrame(&pDimensionIDs[0], frameIndex_);
  graphics.DrawImage(backgroundImage_, rect.left, rect.top,
                     rect.right - rect.left, rect.bottom - rect.top);
  graphics.DrawImage(waitingGif_, (rect.right / 2) - waitingSize_.cx / 2,
                     rect.bottom - (waitingSize_.cy * 2),
                     waitingSize_.cx, waitingSize_.cy);
  graphics.DrawString(text.c_str(), -1, &font,
                      RectF((rect.right / 2) - (textRectanagle.Width / 2) + 2,
                            rect.bottom - textRectanagle.Height - 28,
                            textRectanagle.Width, textRectanagle.Height),
                      nullptr, &textBrush);

  frameIndex_ = (frameIndex_ + 1) % frameCount;
  delete[] pDimensionIDs;

  BitBlt(hdc, 0, 0, rect.right, rect.bottom, hdcMem_, 0, 0, SRCCOPY);
  EndPaint(hwnd_, &ps);
}
}  // namespace mmhmm::segmentation::warmup
