// Copyright (c) 2015 The Chromium Embedded Framework Authors. All rights
// reserved. Use of this source code is governed by a BSD-style license that
// can be found in the LICENSE file.

#pragma once

enum class WebAppType {
  external,
  mini_remote,
  mmhmm,
  broadcast,
  prompt,
  hybrid_api_tester,
  segmentation_panel,
  toolbox,
  offline_wall,
  stacks,
  camera,
  creator,
  screen_recorder,
  local_host,
  settings,
  floating_camera_nav,
};

#if defined(OS_LINUX)
#include <gtk/gtk.h>

// The Linux client uses GTK instead of the underlying platform type (X11).
#define ClientWindowHandle GtkWidget*
#else
#define ClientWindowHandle CefWindowHandle
#endif

#if defined(OS_MAC)
#define ClientNativeMacWindow void*
#ifdef __OBJC__
#define CAST_CLIENT_NATIVE_MAC_WINDOW_TO_NSWINDOW(native) \
  (__bridge NSWindow*)native
#define CAST_NSWINDOW_TO_CLIENT_NATIVE_MAC_WINDOW(window) (__bridge void*)window
#endif  // __OBJC__
#endif  // defined OS_MAC

