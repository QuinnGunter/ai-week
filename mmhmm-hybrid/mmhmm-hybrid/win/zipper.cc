#include "zipper.h"
#include "../win/third-party/libarchive/include/archive.h"
#include "../win/third-party/libarchive/include/archive_entry.h"
#include <filesystem>
#include <fcntl.h>
#include <io.h>
#include "../common/string_util.h"

namespace mmhmm {
  namespace zip {
    void WriteZip(const std::wstring destination_filename, const std::vector<std::wstring> files) {
      struct archive* a;
      struct archive_entry* entry;
      struct stat st;
      char buff[8192];
      int len;
      int fd;

      a = archive_write_new();
      archive_write_add_filter_gzip(a);
      archive_write_set_format_pax_restricted(a);
      archive_write_open_filename(a, client::ToNarrowString(destination_filename).c_str());
      for (auto file : files) {
        std::filesystem::path path(file);
        auto filename = path.filename();
        stat(client::ToNarrowString(file).c_str(), &st);
        entry = archive_entry_new();
        archive_entry_set_pathname(entry, filename.string().c_str());
        archive_entry_set_size(entry, st.st_size);
        archive_entry_set_filetype(entry, AE_IFREG);
        archive_entry_set_perm(entry, 0644);
        archive_write_header(a, entry);
        fd = open(client::ToNarrowString(file).c_str(), O_RDONLY);
        len = read(fd, buff, sizeof(buff));
        while (len > 0) {
          archive_write_data(a, buff, len);
          len = read(fd, buff, sizeof(buff));
        }
        close(fd);
        archive_entry_free(entry);
      }

      archive_write_close(a);
      archive_write_free(a);
    }
  }
}