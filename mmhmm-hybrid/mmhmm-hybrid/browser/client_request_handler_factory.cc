#include "client_request_handler_factory.h"

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

#if defined(OS_MAC)
#include <mach-o/dyld.h>
#include <CoreFoundation/CoreFoundation.h>
#endif

#include <filesystem>


namespace client_request_handler {

  namespace {
  
#define PAK_NAME "mmhmm-client.pak"
  const std::string UrlPrefix = { "http://mmhmm-client/" };

    class ClientRequestHandlerFactory : public CefSchemeHandlerFactory {
    public:
      ClientRequestHandlerFactory() {}

      CefRefPtr<CefResourceHandler> Create(CefRefPtr<CefBrowser> browser,
        CefRefPtr<CefFrame> frame,
        const CefString& scheme_name,
        CefRefPtr<CefRequest> request) override {
        CEF_REQUIRE_IO_THREAD();

        try {
          auto pak_resource_path = GetRootResourcePath();
          if (pak_resource_path.empty() ||
              !std::filesystem::exists(pak_resource_path)) {
            LOG(ERROR) << "Unable to find local resources at path "
                       << pak_resource_path;
            return nullptr;
          }

          std::filesystem::path filePath = pak_resource_path;
          root_path_ = filePath.parent_path().string();

          auto url = request->GetURL();
          if (!url.empty() && url.size() > UrlPrefix.size()) {
            auto relative_url = url.ToString().substr(
                UrlPrefix.size(), url.size() - UrlPrefix.size());
            std::string trimmed_url(
                relative_url.begin(),
                std::find(relative_url.begin(), relative_url.end(), '?'));

            auto resource_path = root_path_ + trimmed_url;

            auto zip_path = root_path_ + GetPathSeparator() + PAK_NAME;

            CefRefPtr<CefStreamReader> zip_stream(
                CefStreamReader::CreateForFile(zip_path));
            CefRefPtr<CefZipArchive> archive(new CefZipArchive());

            auto num_files = archive->Load(zip_stream, CefString(), false);
            if (num_files > 0 && archive->HasFile(trimmed_url)) {
              CefRefPtr<CefZipArchive::File> file;
              file = archive->GetFile(trimmed_url);
              if (file != nullptr) {
                CefRefPtr<CefStreamReader> file_stream(file->GetStreamReader());
                return new CefStreamResourceHandler(GetMimeType(resource_path),
                                                    file_stream);
              }
            }
            LOG(WARNING) << "Pak file didn't contain expected file"
                         << trimmed_url;
          }
        } catch (const std::exception& ex) {
          LOG(ERROR) << "Error locating resource: " << ex.what();
        }
        return nullptr;
      }

      std::string GetMimeType(const std::string& resource_path) {
        std::string mime_type;
        auto separator_position = resource_path.find_last_of(".");
        if (separator_position != std::string::npos) {
          mime_type = CefGetMimeType(resource_path.substr(separator_position + 1));
          if (!mime_type.empty())
            return mime_type;
        }
        return "text/html";
      }

      char GetPathSeparator() {
#if defined(OS_WIN)
        return '\\';
#else
        return std::filesystem::path::preferred_separator;
#endif
      }
      
      std::string GetRootResourcePath(){
#if defined(OS_WIN)

        wchar_t buffer[MAX_PATH];
        // Retrieve the executable path.
        auto len = GetModuleFileName(nullptr, buffer, MAX_PATH);
        if (len == 0)
          return "";

        std::wstring_convert<std::codecvt_utf8_utf16<wchar_t>> converter;
        return converter.to_bytes(std::wstring(buffer));
        
#else
        CFURLRef resource_path_ref = CFBundleCopyResourceURL(CFBundleGetMainBundle(),CFSTR(PAK_NAME), NULL, NULL);
        char resourcePath[PATH_MAX];
        if (CFURLGetFileSystemRepresentation(resource_path_ref, true,
                                             (UInt8 *)resourcePath,
                                             PATH_MAX))
        {
          CFRelease(resource_path_ref);
          return resourcePath;
        }
        return "";
#endif
      }

    public:
      std::string root_path_;

    private:
      IMPLEMENT_REFCOUNTING(ClientRequestHandlerFactory);
      DISALLOW_COPY_AND_ASSIGN(ClientRequestHandlerFactory);
    };

  }  // namespace

  void RegisterClientRequestHandlerFactory() {
    CefRegisterSchemeHandlerFactory("http", "mmhmm-client",
      new ClientRequestHandlerFactory());
  }

}  // namespace scheme_handler
