//
//  CameraExtensionConnector.h
//
// Copyright © 2024 mmhmm, inc. All rights reserved.
//

#ifndef CameraExtensionConnector_h
#define CameraExtensionConnector_h

#include <stddef.h>
#include <IOSurface/IOSurface.h>

#ifdef __cplusplus
  extern "C" {
#endif
    int camera_extension_initialize();
    int camera_extension_send(IOSurfaceRef io_surface);
    int camera_extension_dispose();
#ifdef __cplusplus
  }
#endif
#endif /* CameraExtensionConnector_h */
