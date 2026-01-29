// Copyright (c) 2013 The Chromium Embedded Framework Authors. All rights
// reserved. Use of this source code is governed by a BSD-style license that
// can be found in the LICENSE file.

// Defines all of the command line switches used by cefclient.

#pragma once

namespace client {
namespace switches {

extern const char kExternalMessagePump[];
extern const char kCachePath[];
extern const char kUrl[];
extern const char kBenchmark[];
extern const char kShowUpdateRect[];
extern const char kMouseCursorChangeDisabled[];
extern const char kOffline[];
extern const char kRequestContextPerBrowser[];
extern const char kRequestContextSharedCache[];
extern const char kBackgroundColor[];
extern const char kEnableGPU[];
extern const char kFilterURL[];
extern const char kUseViews[];
extern const char kUseNative[];
extern const char kHideFrame[];
extern const char kHideControls[];
extern const char kHideOverlays[];
extern const char kAlwaysOnTop[];
extern const char kHideTopMenu[];
extern const char kSslClientCertificate[];
extern const char kCRLSetsPath[];
extern const char kNoActivate[];
extern const char kDisableChromeRuntime[];
extern const char kShowChromeToolbar[];
extern const char kInitialShowState[];
extern const char kUseDefaultPopup[];
extern const char kUseClientDialogs[];
extern const char kHidePipFrame[];
extern const char kHideChromeBubbles[];

extern const char kDisableNativeSegmentation[];
extern const char kAllowMiniRemoteCapture[];

extern const char kLogFile[];
extern const char kLogSeverity[];

extern const char kDisableSentry[];
extern const char kSendTestSentryError[];
extern const char kServiceConfiguration[];

extern const char kAppMode[];
extern const char kWebApp[];
extern const char kSilent[];

}  // namespace switches
}  // namespace client

