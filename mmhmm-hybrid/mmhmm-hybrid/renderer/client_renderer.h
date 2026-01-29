// Copyright (c) 2012 The Chromium Embedded Framework Authors. All rights
// reserved. Use of this source code is governed by a BSD-style license that
// can be found in the LICENSE file.

#pragma once

#include "include/cef_base.h"
#include "client_app_renderer.h"

namespace client {
namespace renderer {

// Create the renderer delegate. Called from client_app_delegates_renderer.cc.
void CreateDelegates(ClientAppRenderer::DelegateSet& delegates);

}  // namespace renderer
}  // namespace client

