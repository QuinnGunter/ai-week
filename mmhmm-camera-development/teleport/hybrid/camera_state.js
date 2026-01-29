//
//  hybrid/camera_state.js
//  mmhmm
//
//  Created by Seth Hitchings on 10/16/2024
//  Copyright 2024 mmhmm inc. All rights reserved.
//

/**
 * The possible "state" values reported by gHybrid.virtualCamera.state.description.
 * See https://docs.google.com/document/d/1QUapwGPW4Kw6zefKwUgDXlOEYlGQMZ80a8Xism8mvog/edit?tab=t.93kqk45hv5h1
 */
const VirtualCameraState = Object.freeze({
    notInstalled: "notInstalled",
    notInstallable: "notInstallable",
    awaitingUserApproval: "awaitingUserApproval",
    installing: "installing",
    installed: "installed",
    uninstalling: "uninstalling",
    needsUpdate: "needsUpdate",
    needsReboot: "needsReboot",
    error: "error",
});
