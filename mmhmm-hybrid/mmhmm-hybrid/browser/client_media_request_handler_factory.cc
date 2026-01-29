#pragma once

#include "client_media_request_handler_factory.h"

#include "include/cef_browser.h"
#include "include/cef_callback.h"
#include "include/cef_frame.h"
#include "include/cef_request.h"
#include "include/cef_resource_handler.h"
#include "include/cef_response.h"
#include "include/cef_scheme.h"
#include "include/wrapper/cef_helpers.h"

#include "include/wrapper/cef_stream_resource_handler.h"
#include <include/cef_parser.h>

#include <include/wrapper/cef_zip_archive.h>
#include <locale>
#include <codecvt>

#include "screen_share_manager_win.h"

#include "include/base/cef_callback.h"
#include "include/wrapper/cef_closure_task.h"

namespace client_media_request_handler {

      const char kMimeType[] = "image/x-windows-bmp";
      const char* kErrorContent = "Failed to load resource";

      void DeviceResourceHandler::SendPreviewOnIOThread(std::vector<unsigned char> preview, CefRefPtr<CefCallback> callback)
      {
        CEF_REQUIRE_IO_THREAD();

         stream_ = CefStreamReader::CreateForData(
          static_cast<void*>(preview.data()),
          preview.size()
        );

         mime_type_ = kMimeType;
         status_code_ = 200;
         status_text_ = "OK";
         
         callback->Continue();
      }

      void DeviceResourceHandler::SendErrorOnIOThread(CefRefPtr<CefCallback> callback)
      {
        CEF_REQUIRE_IO_THREAD();

        CefResponse::HeaderMap header_map;
        stream_ =
          CefStreamReader::CreateForData(
            static_cast<void*>(const_cast<char*>(kErrorContent)),
            strlen(kErrorContent)
          );

        LOG(WARNING) << "Unable to load image";

        mime_type_ = kMimeType;
        status_code_ = 404;
        status_text_ = std::string();

        callback->Continue();
      }

      void DeviceResourceHandler::GetPreviewOnUIThread(const std::string& media_type, int64_t media_id, CefRefPtr<CefCallback> callback)
      {
        CEF_REQUIRE_UI_THREAD();

        LOG(INFO) << "Trying to send preview to the UI thread..";


        std::vector<unsigned char> preview;
        if (mmhmm::ScreenShareManagerWin::GetMediaPreview(media_type, media_id, &preview))
        {
          LOG(INFO) << "Load preview image for type:" << media_type << " id:" << media_id;
          CefPostTask(TID_IO,
            base::BindOnce(&DeviceResourceHandler::SendPreviewOnIOThread, this, preview, callback));
        }
        else
        {
          CefPostTask(TID_IO, base::BindOnce(&DeviceResourceHandler::SendErrorOnIOThread,this, callback));
        }
      }

      bool DeviceResourceHandler::Open(CefRefPtr<CefRequest> request,
        bool& handle_request,
        CefRefPtr<CefCallback> callback) {

        //delay the response until we can get the image
        handle_request = false;

        const std::string& url = request->GetURL();

        std::string::size_type delimiter = url.find_last_of('/');
        if (delimiter == std::string::npos)
        {
          return false;
        }

        std::string request_string = url.substr(delimiter+1, url.size());

        std::string::size_type id_start = request_string.find_first_of(':');
        std::string::size_type id_end = request_string.find_last_of(':');

        std::string id_string = request_string.substr(id_start + 1, id_end - (id_start + 1));
        std::string type = request_string.substr(0, id_start);

        int64_t id = atoi(id_string.c_str());

        CefPostTask(TID_UI,
          base::BindOnce(&DeviceResourceHandler::GetPreviewOnUIThread,this, type, id, callback));

        return true;
      }

      void DeviceResourceHandler::GetResponseHeaders(CefRefPtr<CefResponse> response,
        int64_t& response_length,
        CefString& redirectUrl)  {
        CEF_REQUIRE_IO_THREAD();

        response->SetStatus(status_code_);
        response->SetStatusText(status_text_);
        response->SetMimeType(mime_type_);

        if (!header_map_.empty())
          response->SetHeaderMap(header_map_);

        response_length = stream_ ? -1 : 0;
      }

      void DeviceResourceHandler::Cancel() { }

      bool DeviceResourceHandler::Read(void* data_out,
        int bytes_to_read,
        int& bytes_read,
        CefRefPtr<CefResourceReadCallback> callback) {
        DCHECK(!CefCurrentlyOn(TID_UI) && !CefCurrentlyOn(TID_IO));
        DCHECK_GT(bytes_to_read, 0);
        DCHECK(stream_);

        //early out in error cases
        if (bytes_to_read == 0 || stream_ == nullptr)
          return false;

        // Read until the buffer is full or until Read() returns 0 to indicate no
        // more data.
        bytes_read = 0;
        int read = 0;
        do {
          read = static_cast<int>(
            stream_->Read(static_cast<char*>(data_out) + bytes_read, 1,
              bytes_to_read - bytes_read));
          bytes_read += read;
        } while (read != 0 && bytes_read < bytes_to_read);

        return (bytes_read > 0);
      }

      // Return a new scheme handler instance to handle the request.
      CefRefPtr<CefResourceHandler> ClientMediaRequestHandlerFactory::Create(CefRefPtr<CefBrowser> browser,
        CefRefPtr<CefFrame> frame,
        const CefString& scheme_name,
        CefRefPtr<CefRequest> request) {
        CEF_REQUIRE_IO_THREAD();

        return new DeviceResourceHandler();
      }

      std::string ClientMediaRequestHandlerFactory::GetMimeType(const std::string& resource_path) {
        std::string mime_type;
        size_t sep = resource_path.find_last_of(".");
        if (sep != std::string::npos) {
          mime_type = CefGetMimeType(resource_path.substr(sep + 1));
          if (!mime_type.empty())
            return mime_type;
        }
        return "text/html";
      }

      void RegisterClientMediaRequestHandlerFactory() {
        CefRegisterSchemeHandlerFactory("http", "mmhmm-client-media",
          new ClientMediaRequestHandlerFactory());
      }

  }  // namespace

