#include <Windows.h>

namespace mmhmm::controls {
class Layout {
 public:
  static void CentreRectInRect(RECT* to_center, const RECT* outer_rect) {
    int to_width = to_center->right - to_center->left;
    int to_height = to_center->bottom - to_center->top;
    int outer_width = outer_rect->right - outer_rect->left;
    int outer_height = outer_rect->bottom - outer_rect->top;

    int padding_x = (outer_width - to_width) / 2;
    int padding_y = (outer_height - to_height) / 2;

    to_center->left = outer_rect->left + padding_x;
    to_center->top = outer_rect->top + padding_y;
    to_center->right = to_center->left + to_width;
    to_center->bottom = to_center->top + to_height;
  }

  static int ScaleForDPI(int value, UINT dpi) {
    return (int)((float)value * dpi / 96);
  }

  static D2D1_RECT_F RectToD2DRect(const RECT& rect) {
    D2D1_RECT_F d2d_rect = {0};
    d2d_rect.bottom = rect.bottom;
    d2d_rect.left = rect.left;
    d2d_rect.right = rect.right;
    d2d_rect.top = rect.top;
    return d2d_rect;
  }

  static bool AppHasFocus() {
    auto hwnd = GetForegroundWindow();
    DWORD app_process_id = GetCurrentProcessId();
    DWORD active_process_id = 0;
    GetWindowThreadProcessId(hwnd, &active_process_id);
    return app_process_id == active_process_id;
  }
};
}  // namespace mmhmm
