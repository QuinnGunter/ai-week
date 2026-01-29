#pragma once

#include <memory>
#include <vector>
#include <algorithm>
#include <windows.h>
#include <objidl.h>
#include <GdiPlus.h>
#include <gdiplusimaging.h>
#include <tchar.h>
#include <thread>
#include <atomic>
#include <condition_variable>
#include <mutex>

#include <spdlog/spdlog.h>

#pragma comment(lib, "gdiplus.lib")

using namespace Gdiplus;

namespace mmhmm::segmentation::warmup {
class SplashScreen {
 public:
  SplashScreen(const TCHAR* backgroundPath,
               const TCHAR* gifPath,
               std::shared_ptr<spdlog::logger> logger);
  ~SplashScreen();
  void Show();
  void Close();

 private:
  static LRESULT CALLBACK WindowProc(HWND hwnd,
                                     UINT uMsg,
                                     WPARAM wParam,
                                     LPARAM lParam);
  void Run();
  void OnPaint();
  void LoadResources(const TCHAR* backgroundPath, const TCHAR* gifPath);
  void ScaleAndCenterWindow(HWND hwnd,int screenWidth, int screenHeight, int& width, int& height);

  HDC hdcMem_;
  HBITMAP hbmMem_;
  HBITMAP hbmOld_;

  HWND hwnd_;
  Image* waitingGif_;
  Image* backgroundImage_;
  int frameIndex_;
  std::atomic<bool> running_;
  std::atomic<bool> canceled_;
  std::thread thread_;
  ULONG_PTR gdiplusToken_;
  std::condition_variable cv_;
  std::mutex cv_mutex_;
  SIZE waitingSize_ = {48, 48};

  std::shared_ptr<spdlog::logger> logger_;
};
}  // namespace mmhmm::segmentation::warmup
