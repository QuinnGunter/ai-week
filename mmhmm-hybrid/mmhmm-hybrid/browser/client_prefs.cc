// Copyright (c) 2022 The Chromium Embedded Framework Authors. All rights
// reserved. Use of this source code is governed by a BSD-style license that
// can be found in the LICENSE file.

#include "../browser/client_prefs.h"

#include <memory>

#include "include/base/cef_logging.h"
#include "include/cef_command_line.h"
#include "include/cef_preference.h"
#include "include/cef_values.h"
#include "include/views/cef_display.h"
#include "include/wrapper/cef_helpers.h"
#include "../common/client_switches.h"
#include "../common/string_util.h"

namespace client {
namespace prefs {

namespace {

constexpr char kCreatorRestore[] = "creator.window_restore";
constexpr char kMiniRemoteRestore[] = "mini_remote.window_restore";
constexpr char kApiTesterRestore[] = "api_tester.window_restore";
constexpr char kStacksRestore[] = "stacks.window_restore";
constexpr char kSegmentationRestore[] = "segmentation.window_restore";
constexpr char kMiniRemoteFontSize[] = "mini_remote.font_size";
constexpr char kMiniRemoteNotesExpanded[] = "mini_remote.notes_expanded";
constexpr char kCameraRestore[] = "camera.window_restore";
constexpr char kScreenRecorderRestore[] = "screenrecorder.window_restore";

constexpr char kWindowRestoreStateKey[] = "state";
constexpr char kWindowRestoreBoundsKey[] = "bounds";
constexpr char kWindowRestoreBoundsKey_X[] = "x";
constexpr char kWindowRestoreBoundsKey_Y[] = "y";
constexpr char kWindowRestoreBoundsKey_W[] = "w";
constexpr char kWindowRestoreBoundsKey_H[] = "h";

static struct {
  const char* str;
  cef_show_state_t state;
} const kWindowRestoreStateValueMap[] = {
    {"normal", CEF_SHOW_STATE_NORMAL},
    {"minimized", CEF_SHOW_STATE_MINIMIZED},
    {"maximized", CEF_SHOW_STATE_MAXIMIZED},
    {"fullscreen", CEF_SHOW_STATE_FULLSCREEN},
};

std::string GetRestoreKey(WebAppType app_type) {
  switch (app_type) {
    case WebAppType::mini_remote:
      return kMiniRemoteRestore;
    case WebAppType::hybrid_api_tester:
      return kApiTesterRestore;
    case WebAppType::stacks:
      return kStacksRestore;
    case WebAppType::camera:
      return kCameraRestore;
    case WebAppType::creator:
      return kCreatorRestore;
    case WebAppType::screen_recorder:
      return kScreenRecorderRestore;
    default:
      return std::string();
  }
}

std::optional<cef_show_state_t> ShowStateFromString(const std::string& str) {
  const auto strLower = ToLower(str);
  for (size_t i = 0; i < std::size(kWindowRestoreStateValueMap); ++i) {
    if (strLower == kWindowRestoreStateValueMap[i].str) {
      return kWindowRestoreStateValueMap[i].state;
    }
  }
  return std::nullopt;
}

const char* ShowStateToString(cef_show_state_t show_state) {
  for (size_t i = 0; i < std::size(kWindowRestoreStateValueMap); ++i) {
    if (show_state == kWindowRestoreStateValueMap[i].state) {
      return kWindowRestoreStateValueMap[i].str;
    }
  }
  NOTREACHED();
  return nullptr;
}

// Create the CefValue representation that will be stored in preferences.
CefRefPtr<CefValue> CreateWindowRestoreValue(
    cef_show_state_t show_state,
    std::optional<CefRect> dip_bounds) {
  auto dict = CefDictionaryValue::Create();

  // Show state is required.
  dict->SetString(kWindowRestoreStateKey, ShowStateToString(show_state));

  // Bounds is optional.
  if (dip_bounds) {
    auto bounds_dict = CefDictionaryValue::Create();
    bounds_dict->SetInt(kWindowRestoreBoundsKey_X, dip_bounds->x);
    bounds_dict->SetInt(kWindowRestoreBoundsKey_Y, dip_bounds->y);
    bounds_dict->SetInt(kWindowRestoreBoundsKey_W, dip_bounds->width);
    bounds_dict->SetInt(kWindowRestoreBoundsKey_H, dip_bounds->height);
    dict->SetDictionary(kWindowRestoreBoundsKey, bounds_dict);
  }

  auto value = CefValue::Create();
  value->SetDictionary(dict);
  return value;
}

CefRefPtr<CefValue> CreateDefaultWindowRestoreValue() {
  return CreateWindowRestoreValue(CEF_SHOW_STATE_NORMAL, std::nullopt);
}

// Parse the CefValue representation that was stored in preferences.
bool ParseWindowRestoreValue(CefRefPtr<CefValue> value,
                             cef_show_state_t& show_state,
                             std::optional<CefRect>& dip_bounds) {
  if (!value || value->GetType() != VTYPE_DICTIONARY) {
    return false;
  }

  auto dict = value->GetDictionary();

  bool has_state = false;

  // Show state is required.
  if (dict->GetType(kWindowRestoreStateKey) == VTYPE_STRING) {
    auto result = ShowStateFromString(dict->GetString(kWindowRestoreStateKey));
    if (result) {
      show_state = *result;
      has_state = true;
    }
  }

  // Bounds is optional.
  if (has_state && dict->GetType(kWindowRestoreBoundsKey) == VTYPE_DICTIONARY) {
    auto bounds_dict = dict->GetDictionary(kWindowRestoreBoundsKey);
    if (bounds_dict->GetType(kWindowRestoreBoundsKey_X) == VTYPE_INT &&
        bounds_dict->GetType(kWindowRestoreBoundsKey_Y) == VTYPE_INT &&
        bounds_dict->GetType(kWindowRestoreBoundsKey_W) == VTYPE_INT &&
        bounds_dict->GetType(kWindowRestoreBoundsKey_H) == VTYPE_INT) {
      dip_bounds = CefRect(bounds_dict->GetInt(kWindowRestoreBoundsKey_X),
                           bounds_dict->GetInt(kWindowRestoreBoundsKey_Y),
                           bounds_dict->GetInt(kWindowRestoreBoundsKey_W),
                           bounds_dict->GetInt(kWindowRestoreBoundsKey_H));
    }
  }

  return has_state;
}

// Keep the bounds inside the closest display work area.
CefRect ClampBoundsToDisplay(const CefRect& dip_bounds) {
  auto display = CefDisplay::GetDisplayMatchingBounds(
      dip_bounds, /*input_pixel_coords=*/false);
  const auto work_area = display->GetWorkArea();

  CefRect bounds = dip_bounds;

  if (bounds.width > work_area.width)
    bounds.width = work_area.width;
  if (bounds.height > work_area.height)
    bounds.height = work_area.height;

  if (bounds.x < work_area.x)
    bounds.x = work_area.x;
  else if (bounds.x + bounds.width >= work_area.x + work_area.width)
    bounds.x = work_area.x + work_area.width - bounds.width;

  if (bounds.y < work_area.y)
    bounds.y = work_area.y;
  else if (bounds.y + bounds.height >= work_area.y + work_area.height)
    bounds.y = work_area.y + work_area.height - bounds.height;

  return bounds;
}

}  // namespace

void RegisterGlobalPreferences(CefRawPtr<CefPreferenceRegistrar> registrar) {
  registrar->AddPreference(kCreatorRestore,
                           CreateDefaultWindowRestoreValue());
  registrar->AddPreference(kCameraRestore,
                           CreateDefaultWindowRestoreValue());
  registrar->AddPreference(kMiniRemoteRestore,
      CreateDefaultWindowRestoreValue());
  registrar->AddPreference(kStacksRestore, CreateDefaultWindowRestoreValue());
  registrar->AddPreference(kApiTesterRestore,
                           CreateDefaultWindowRestoreValue());
  registrar->AddPreference(kSegmentationRestore,
                           CreateDefaultWindowRestoreValue());

  auto font_default = CefValue::Create();
  font_default->SetInt(0);
  registrar->AddPreference(kMiniRemoteFontSize, font_default);

  auto notes_expanded_default = CefValue::Create();
  notes_expanded_default->SetBool(false);
  registrar->AddPreference(kMiniRemoteNotesExpanded,
      notes_expanded_default);
}

bool LoadWindowRestorePreferences(WebAppType app_type,
                                  cef_show_state_t& show_state,
                                  std::optional<CefRect>& dip_bounds) {
  CEF_REQUIRE_UI_THREAD();

  // Check if show state was specified on the command-line.
  auto command_line = CefCommandLine::GetGlobalCommandLine();
  if (command_line->HasSwitch(switches::kInitialShowState)) {
    auto result = ShowStateFromString(
        command_line->GetSwitchValue(switches::kInitialShowState));
    if (result) {
      show_state = *result;
      return true;
    }
  }

  // Check if show state was saved in global preferences.
  auto manager = CefPreferenceManager::GetGlobalPreferenceManager();
  auto restore_key = GetRestoreKey(app_type);
  if (restore_key.empty())
      return false;

  if (ParseWindowRestoreValue(manager->GetPreference(restore_key),
                              show_state, dip_bounds)) {
    if (dip_bounds) {
      // Keep the bounds inside the closest display.
      dip_bounds = ClampBoundsToDisplay(*dip_bounds);
    }
    return true;
  }

  return false;
}

bool SaveWindowRestorePreferences(WebAppType app_type,
                                  cef_show_state_t show_state,
                                  std::optional<CefRect> dip_bounds) {
  CEF_REQUIRE_UI_THREAD();

  if (app_type == WebAppType::prompt)
      return false;

  auto manager = CefPreferenceManager::GetGlobalPreferenceManager();

  CefString error;
  auto restore_key = GetRestoreKey(app_type);
  if (restore_key.empty())
      return false;
  return manager->SetPreference(
      restore_key, CreateWindowRestoreValue(show_state, dip_bounds),
      error);
}

bool LoadMiniRemoteState(int& font_size, bool& notes_expanded) {
    CEF_REQUIRE_UI_THREAD();
    bool font_loaded = false;
    bool notes_expanded_loaded = false;

    auto manager = CefPreferenceManager::GetGlobalPreferenceManager();
    auto font_preference = manager->GetPreference(kMiniRemoteFontSize);
    if (font_preference->GetType() == VTYPE_INT)
    {
        font_size = font_preference->GetInt();
        font_loaded = true;
    }

    auto notes_expanded_preference = manager->GetPreference(kMiniRemoteNotesExpanded);
    if (notes_expanded_preference->GetType() == VTYPE_BOOL)
    {
        notes_expanded = notes_expanded_preference->GetBool();
        notes_expanded_loaded = true;
    }
    return font_loaded && notes_expanded_loaded;
}

bool SaveMiniRemoteState(int font_size, bool notes_expanded) {
    CEF_REQUIRE_UI_THREAD();

    if (font_size <= 0)
        return false;

    auto manager = CefPreferenceManager::GetGlobalPreferenceManager();

    auto font_value = CefValue::Create();
    font_value->SetInt(font_size);

    CefString error;
    bool font_set = manager->SetPreference(
        kMiniRemoteFontSize, font_value,
        error);

    auto notes_expanded_value = CefValue::Create();
    notes_expanded_value->SetBool(notes_expanded);
    bool notes_expanded_set = manager->SetPreference(
        kMiniRemoteNotesExpanded, notes_expanded_value,
        error);

    return font_set && notes_expanded_set;

}

}  // namespace prefs
}  // namespace client
