#pragma once

#include "include/cef_browser.h"
#include "include/cef_callback.h"
#include "include/cef_frame.h"
#include "include/cef_request.h"
#include "include/cef_resource_handler.h"
#include "include/cef_response.h"
#include "include/cef_scheme.h"
#include "include/wrapper/cef_helpers.h"

namespace client_media_request_handler {

  void RegisterClientMediaRequestHandlerFactory();

  class DeviceResourceHandler : public CefResourceHandler
  {
  public:
    DeviceResourceHandler() = default;
    void SendPreviewOnIOThread(std::vector<unsigned char> preview, CefRefPtr<CefCallback> callback);
    void SendErrorOnIOThread(CefRefPtr<CefCallback> callback);
    void GetPreviewOnUIThread(const std::string& media_type, int64_t media_id, CefRefPtr<CefCallback> callback);
    bool Open(CefRefPtr<CefRequest> request,
      bool& handle_request,
      CefRefPtr<CefCallback> callback) override;

    void GetResponseHeaders(CefRefPtr<CefResponse> response,
      int64_t& response_length,
      CefString& redirectUrl) override;

    void Cancel() override;

    bool Read(void* data_out,
      int bytes_to_read,
      int& bytes_read,
      CefRefPtr<CefResourceReadCallback> callback) override;

  private:
    std::string data_;
    std::string mime_type_;
    size_t offset_ = 0;

    int status_code_ = 404;
    std::string status_text_;
    const CefResponse::HeaderMap header_map_;
    CefRefPtr<CefStreamReader> stream_;

    IMPLEMENT_REFCOUNTING(DeviceResourceHandler);
    DISALLOW_COPY_AND_ASSIGN(DeviceResourceHandler);
  };


  class ClientMediaRequestHandlerFactory : public CefSchemeHandlerFactory {

  public:
    ClientMediaRequestHandlerFactory() {}

    CefRefPtr<CefResourceHandler> Create(CefRefPtr<CefBrowser> browser,
      CefRefPtr<CefFrame> frame,
      const CefString& scheme_name,
      CefRefPtr<CefRequest> request) override;

    std::string GetMimeType(const std::string& resource_path);

  private:
    IMPLEMENT_REFCOUNTING(ClientMediaRequestHandlerFactory);
    DISALLOW_COPY_AND_ASSIGN(ClientMediaRequestHandlerFactory);
  };

}  // namespace client_media_request_handler

