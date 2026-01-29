#include "file_utils.h"

#include <fstream>

#include <ShlObj_core.h>
#include <commdlg.h>
#include <shellapi.h>

namespace mmhmm {
  namespace files {
    bool WriteStringToFile(std::wstring data, std::wstring filepath) {
      try {
        std::wofstream outfile;
        outfile.open(filepath, std::ios_base::app);
        outfile << data;
        outfile.close();
      }
      catch (...) {
        return false;
      }
      return true;
    }

    bool OpenFileInExplorer(std::wstring file_path) {
      PIDLIST_ABSOLUTE idl = ILCreateFromPath(file_path.c_str());
      auto hr = SHOpenFolderAndSelectItems(idl, 0, 0, 0);
      ILFree(idl);
      return SUCCEEDED(hr);
    }

    SaveFileNameResult GetSaveFileNameFromDialog(HWND parent, std::wstring filename, std::wstring extensions) {
      OPENFILENAME ofn = { sizeof(OPENFILENAME) };
      WCHAR szFile[_MAX_PATH];
      wcscpy(szFile, filename.c_str());
      WCHAR szExt[_MAX_PATH];
      wcscpy(szExt, extensions.c_str());

      ofn.hwndOwner = parent;
      ofn.lpstrFile = szFile;
      ofn.nMaxFile = sizeof(szFile) / sizeof(szFile[0]);
      ofn.lpstrFilter = ofn.lpstrDefExt = szExt;
      ofn.Flags = OFN_OVERWRITEPROMPT | OFN_NOREADONLYRETURN;

      std::wstring save_file_path;
      if (GetSaveFileName(&ofn))
      {
        return { ofn.lpstrFile, true };
      }
      else {
        return {std::wstring(), false};
      }
    }
  }
}
