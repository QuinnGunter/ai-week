//
//  hybrid/capabilities.js
//  mmhmm
//
//  Created by Steve White on 3/1/23.
//  Copyright © 2023 mmhmm, inc. All rights reserved.
//

if (App.isHybrid == true) {

    // gHybrid is supposed to be injected by the hybrid app
    if (typeof gHybrid == 'undefined') {
        gHybrid = {};
    }

    if (gHybrid.capabilities == null) {
        gHybrid.capabilities = {};
    }

    if (gHybrid.capabilities.nativeSeg == null) {
        // This is to help juggle older versions of the hybrid app
        // that don't inject a gHybrid global into the app
        gHybrid.capabilities.nativeSeg = SharedUserDefaults.getValueForKey("hybridseg", false);
    }

    // It'd be nice if we could next this under gHybrid, or if it were simply populated by
    // the hybrid app, but for now we can't (the native definition of gHybrid is read only)
    // and it isn't.
    if (typeof gHybridHardwareInfo == "undefined") {
        const hardwareInfo = {}

        const pageURL = new URL(window.location);
        const searchParams = pageURL.searchParams;
        let changedURL = false;
        const keys = ["cpuArch", "cpuCores", "gpuName", "memory", "model", "os", "osVersion", "fps", "segmentation"];
        keys.forEach(key => {
            var val = searchParams.get(key);
            if (val == null) {
                return;
            }
            hardwareInfo[key] = val
            searchParams.delete(key);
            changedURL = true;
        })

        if (changedURL == true) {
            window.history.replaceState(
                {},
                "",
                pageURL,
            );
        }

        gHybridHardwareInfo = hardwareInfo;
    }
}
