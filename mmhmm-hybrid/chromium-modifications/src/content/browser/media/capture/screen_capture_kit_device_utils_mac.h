// Copyright 2024 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

#ifndef CONTENT_BROWSER_MEDIA_CAPTURE_SCREEN_CAPTURE_KIT_DEVICE_UTILS_MAC_H_
#define CONTENT_BROWSER_MEDIA_CAPTURE_SCREEN_CAPTURE_KIT_DEVICE_UTILS_MAC_H_

#include "content/common/content_export.h"
#include "content/public/browser/desktop_media_id.h"

namespace media {
class VideoCaptureDevice;
}  // namespace media

namespace content {

// MMHMM: Three overload pattern for backwards compatibility
// Overload 1: No parameters (existing, calls overload 2 with empty string)
std::unique_ptr<media::VideoCaptureDevice> CONTENT_EXPORT
CreateScreenCaptureKitDeviceMac(const DesktopMediaID& source);

// Overload 2: With config (NEW - calls overload 3 with nullptr filter)
// Note: Overload 3 is declared in screen_capture_kit_device_mac.h
std::unique_ptr<media::VideoCaptureDevice> CONTENT_EXPORT
CreateScreenCaptureKitDeviceMac(const DesktopMediaID& source,
                                const std::string& config_json);

}  // namespace content

#endif  // CONTENT_BROWSER_MEDIA_CAPTURE_SCREEN_CAPTURE_KIT_DEVICE_UTILS_MAC_H_
