//
//  hybrid/callback.js
//  mmhmm
//
//  Created by Seth Hitchings on 9/30/2025
//  Copyright 2025 mmhmm inc. All rights reserved.
//

// Called by the hybrid application when a deep link that targets Camera is opened
function HandleCallbackData(query, hash) {
    const parsed = {};
    const components = hash.split(/[#&]/g).filter(a => a.length > 0).map(a => a.split("="));
    components.forEach(pair => parsed[pair[0]] = pair[1]);

    if (parsed["importID"]) {
        gApp.handleImportHashCode(parsed["importID"]);
    }
}
