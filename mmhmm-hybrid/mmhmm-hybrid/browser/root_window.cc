// Copyright (c) 2015 The Chromium Embedded Framework Authors. All rights
// reserved. Use of this source code is governed by a BSD-style license that
// can be found in the LICENSE file.

#include "root_window.h"

#include "include/base/cef_callback_helpers.h"

#include "main_context.h"
#include "root_window_manager.h"

namespace client {

RootWindowConfig::RootWindowConfig() : url(MainContext::Get()->GetMainURL()) {}

RootWindow::RootWindow() : delegate_(nullptr) {}

RootWindow::~RootWindow() {}

// static
scoped_refptr<RootWindow> RootWindow::GetForBrowser(int browser_id) {
  return MainContext::Get()->GetRootWindowManager()->GetWindowForBrowser(
      browser_id);
}
}  // namespace client
