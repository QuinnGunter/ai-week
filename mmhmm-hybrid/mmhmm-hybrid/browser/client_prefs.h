// Copyright (c) 2022 The Chromium Embedded Framework Authors. All rights
// reserved. Use of this source code is governed by a BSD-style license that
// can be found in the LICENSE file.

#pragma once

#include <optional>

#include "include/cef_base.h"
#include "include/cef_preference.h"
#include "client_types.h"
#include "../common/titlebar_button.h"

using namespace mmhmm;

namespace client {
namespace prefs {

// Register global preferences with default values.
void RegisterGlobalPreferences(CefRawPtr<CefPreferenceRegistrar> registrar);

// Load/save window restore info.
bool LoadWindowRestorePreferences(WebAppType app_type,
                                  cef_show_state_t& show_state,
                                  std::optional<CefRect>& dip_bounds);
bool SaveWindowRestorePreferences(WebAppType app_type,
                                  cef_show_state_t show_state,
                                  std::optional<CefRect> dip_bounds);

bool LoadMiniRemoteState(int& font_size, bool& notes_expanded);
bool SaveMiniRemoteState(int font_size, bool notes_expanded);

}  // namespace prefs
}  // namespace client

