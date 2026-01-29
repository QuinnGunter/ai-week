#include "base_control.h"
#include "dxgi1_6.h"
#include "../app_settings_service.h"
#include "../system_info.h"
#include "../browser/util_win.h"

namespace mmhmm::controls {

D3D_FEATURE_LEVEL featureLevels[] = {
    D3D_FEATURE_LEVEL_11_1, D3D_FEATURE_LEVEL_11_0, D3D_FEATURE_LEVEL_10_1,
    D3D_FEATURE_LEVEL_10_0, D3D_FEATURE_LEVEL_9_3,  D3D_FEATURE_LEVEL_9_2,
    D3D_FEATURE_LEVEL_9_1};

BaseControl::BaseControl(HWND hwnd, std::wstring title, std::wstring classname)
    : parent_(hwnd), title_(title), classname_(classname) {

      D2D1_FACTORY_OPTIONS options;
  ZeroMemory(&options, sizeof(D2D1_FACTORY_OPTIONS));

  HRESULT hr = D2D1CreateFactory(
      D2D1_FACTORY_TYPE_SINGLE_THREADED, __uuidof(ID2D1Factory1), &options,
      reinterpret_cast<void**>(direct2d_.GetAddressOf()));

  ThrowIfFailed(hr);
}

void BaseControl::Register(std::wstring classname) {
    WNDCLASS wc = {0};
    wc.style = CS_GLOBALCLASS | CS_HREDRAW | CS_VREDRAW;
    wc.lpfnWndProc = BaseControl::BaseWindowProc;
    wc.hCursor = LoadCursor(NULL, IDC_ARROW);
    wc.lpszClassName = classname.c_str();
    RegisterClass(&wc);
}

void BaseControl::Unregister() {
  UnregisterClass(classname_.c_str(), nullptr);
}

HWND BaseControl::CreateBaseWindow(HWND parent,
                                   std::wstring title,
                                   std::wstring classname,
                                   RECT rect,
                                   BaseControl* ptr,
                                   DWORD style,
                                   DWORD ex_style) {
  
  HWND hwndCtrl =
      CreateWindowEx(ex_style, classname.c_str(), title.c_str(), style, 0, 0,
                     rect.right - rect.left, rect.bottom - rect.top, parent,
                     nullptr, GetCodeModuleHandle(), ptr);

  SetWindowPos(hwndCtrl, HWND_TOP, 0, 0, rect.right - rect.left,
               rect.bottom - rect.top,
               SWP_NOACTIVATE | SWP_NOMOVE | SWP_NOSIZE);

  return hwndCtrl;
}

LRESULT CALLBACK BaseControl::BaseWindowProc(HWND hwnd,
                                              UINT message,
                                              WPARAM wParam,
                                              LPARAM lParam) {
  BaseControl* self = nullptr;
  if (message == WM_NCCREATE) {
    LPCREATESTRUCT lpcs = reinterpret_cast<LPCREATESTRUCT>(lParam);
    self = static_cast<BaseControl*>(lpcs->lpCreateParams);
    self->hwnd_ = hwnd;
    SetWindowLongPtr(hwnd, GWLP_USERDATA, reinterpret_cast<LONG_PTR>(self));
  } else {
    self = reinterpret_cast<BaseControl*>(GetWindowLongPtr(hwnd, GWLP_USERDATA));
  }

  switch (message) {
    case WM_PAINT: {
      self->Paint(hwnd);
      return 0;
    }
    case WM_SIZE: {
      self->ResizeSwapChainBitmap();
      self->Paint(hwnd);
    }
    break;
    case WM_CREATE: {
      self->CreateDeviceResources();
      break;
    }
    case WM_ERASEBKGND: {
      return 1;
    }
  }

  LRESULT result = self->HandleMessage(hwnd, message, wParam, lParam);

  if (result) {
    return result;
  }

  return DefWindowProc(hwnd, message, wParam, lParam);
}

void BaseControl::Paint(HWND hwnd) {
  PAINTSTRUCT ps;
  BeginPaint(hwnd, &ps);
  Render();
  EndPaint(hwnd, &ps);
  return;
}

void BaseControl::Render() {
  try {
    HRESULT hr = CreateDeviceResources();
    ThrowIfFailed(hr);

    device_context_->BeginDraw();
    hr = OnRender(device_context_);
    ThrowIfFailed(hr);
    hr = device_context_->EndDraw();
    ThrowIfFailed(hr);

    DXGI_PRESENT_PARAMETERS parameters = {0};
    parameters.DirtyRectsCount = 0;
    parameters.pDirtyRects = nullptr;
    parameters.pScrollRect = nullptr;
    parameters.pScrollOffset = nullptr;

    hr = dxgi_swapchain_->Present1(1, 0, &parameters);

    if (hr == D2DERR_RECREATE_TARGET) {
      DiscardDeviceResources();
    }
  } catch (...) {
    return;
  }
}

void BaseControl::SetTheme(WindowTheme theme) {
  if (window_theme_ != theme && hwnd_) {
    window_theme_ = theme;
    if (hwnd_) {
      Invalidate();
    }
    OnThemeChanged(theme);
  }
}

HWND BaseControl::GetHwnd() const {
  return hwnd_;
}

void BaseControl::Invalidate() const {
  if (hwnd_) {
    InvalidateRect(hwnd_, NULL, TRUE);
    UpdateWindow(hwnd_);
    RedrawWindow(hwnd_, NULL, NULL, RDW_ALLCHILDREN | RDW_UPDATENOW);
  }
}

ComPtr<IDXGIAdapter> BaseControl::GetPreferredGpuAdapter(
    std::wstring application_path) {
  ComPtr<IDXGIFactory6> dgxi_factory;

  HRESULT result =
      CreateDXGIFactory2(0, __uuidof(IDXGIFactory6), (void**)dgxi_factory.GetAddressOf());

  int gpu_preference = 0;
  GetGpuPreference(application_path, gpu_preference);
  std::vector<std::wstring> fullSet;

  ThrowIfFailed(result);

  DXGI_GPU_PREFERENCE preference = (DXGI_GPU_PREFERENCE)gpu_preference;
  ComPtr<IDXGIAdapter> adapter = nullptr;

  result = dgxi_factory->EnumAdapterByGpuPreference(
      0, preference, __uuidof(IDXGIAdapter), (void**)adapter.GetAddressOf());
  ThrowIfFailed(result);

  return adapter;
}

HRESULT BaseControl::CreateDeviceResources() {
  HRESULT hr = S_OK;

  try {
    if (direct2d_backbufer_.Get())
      return hr;

    if (!dxgi_swapchain_) {

      ComPtr<IDXGIAdapter> dxgiAdapter = GetPreferredGpuAdapter(
          mmhmm::AppSettingsService::GetApplicationPath());

      UINT creationFlags = D3D11_CREATE_DEVICE_BGRA_SUPPORT;
#if defined(_DEBUG)
      creationFlags |= D3D11_CREATE_DEVICE_DEBUG;
#endif

      ComPtr<ID3D11Device> device;
      D3D_FEATURE_LEVEL returnedFeatureLevel;

      hr = D3D11CreateDevice(
          dxgiAdapter.Get(), D3D_DRIVER_TYPE_UNKNOWN, 0, creationFlags,
          featureLevels,
          ARRAYSIZE(featureLevels), D3D11_SDK_VERSION, device.GetAddressOf(),
          &returnedFeatureLevel, nullptr);
      ThrowIfFailed(hr);

      hr = device->QueryInterface(__uuidof(ID3D11Device5),
                                  (void**)direct3d_device_.GetAddressOf());
      ThrowIfFailed(hr);

      ComPtr<IDXGIDevice> dxgiDevice;
      hr = direct3d_device_->QueryInterface(__uuidof(IDXGIDevice),
                                            (void**)dxgiDevice.GetAddressOf());
      ThrowIfFailed(hr);

      hr = direct2d_->CreateDevice(dxgiDevice.Get(),
                                   direct2d_device_.GetAddressOf());
      ThrowIfFailed(hr);

      hr = direct2d_device_->CreateDeviceContext(
          D2D1_DEVICE_CONTEXT_OPTIONS_NONE, device_context_.GetAddressOf());
      ThrowIfFailed(hr);

      DXGI_SWAP_CHAIN_DESC1 swapChainDesc = {0};
      swapChainDesc.Width = 0;
      swapChainDesc.Height = 0;
      swapChainDesc.Format =
          DXGI_FORMAT_B8G8R8A8_UNORM;
      swapChainDesc.Stereo = false;
      swapChainDesc.SampleDesc.Count = 1;
      swapChainDesc.SampleDesc.Quality = 0;
      swapChainDesc.BufferUsage = DXGI_USAGE_RENDER_TARGET_OUTPUT;
      swapChainDesc.BufferCount = 2;
      swapChainDesc.Scaling = DXGI_SCALING_NONE;
      swapChainDesc.SwapEffect = DXGI_SWAP_EFFECT_FLIP_SEQUENTIAL;
      swapChainDesc.Flags = 0;

      ComPtr<IDXGIFactory2> dxgiFactory;
      hr = dxgiAdapter->GetParent(IID_PPV_ARGS(&dxgiFactory));
      ThrowIfFailed(hr);

      hr = dxgiFactory->CreateSwapChainForHwnd(direct3d_device_.Get(), hwnd_,
                                               &swapChainDesc, nullptr, nullptr,
                                               dxgi_swapchain_.GetAddressOf());
      ThrowIfFailed(hr);
    }

    // Get the back buffer as an IDXGISurface (Direct2D doesn't accept an
    // ID3D11Texture2D directly as a render target)
    ComPtr<IDXGISurface> dxgiBackBuffer;
    hr = dxgi_swapchain_->GetBuffer(
        0, IID_PPV_ARGS(dxgiBackBuffer.GetAddressOf()));
    ThrowIfFailed(hr);

    FLOAT dpiX, dpiY;
    direct2d_->GetDesktopDpi(&dpiX, &dpiY);

    // Create a Direct2D surface (bitmap) linked to the Direct3D texture back
    // buffer via the DXGI back buffer
    D2D1_BITMAP_PROPERTIES1 bitmapProperties = D2D1::BitmapProperties1(
        D2D1_BITMAP_OPTIONS_TARGET | D2D1_BITMAP_OPTIONS_CANNOT_DRAW,
        D2D1::PixelFormat(DXGI_FORMAT_B8G8R8A8_UNORM, D2D1_ALPHA_MODE_IGNORE),
        dpiX, dpiY);

    hr = device_context_->CreateBitmapFromDxgiSurface(
        dxgiBackBuffer.Get(), &bitmapProperties,
        direct2d_backbufer_.GetAddressOf());
    ThrowIfFailed(hr);

    device_context_->SetTarget(direct2d_backbufer_.Get());
    return hr;

  } catch (const com_exception& ex) {
    return ex.hresult();
  } catch (...) {
    return E_FAIL;
  }
}

void BaseControl::ResizeSwapChainBitmap() {
  if (device_context_ && dxgi_swapchain_) {
    device_context_->SetTarget(nullptr);
    direct2d_backbufer_.Reset();
    if (S_OK == dxgi_swapchain_->ResizeBuffers(0, 0, 0, DXGI_FORMAT_UNKNOWN, 0)) {
      return;
    }
  }

  DiscardDeviceResources();
}

void BaseControl::DiscardDeviceResources() {
  device_context_.Reset();
  dxgi_swapchain_.Reset();
  direct3d_device_.Reset();
  direct2d_device_.Reset();
  direct2d_backbufer_.Reset();
}

ComPtr<ID2D1DeviceContext5> BaseControl::GetDeviceContext() const {
  return device_context_;
}
}  // namespace mmhmm
