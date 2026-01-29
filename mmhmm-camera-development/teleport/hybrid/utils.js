//
//  hybrid/utils.js
//  mmhmm
//
//  Created by Seth Hitchings on 10/7/2025.
//  Copyright 2025 mmhmm inc. All rights reserved.
//

class HybridUtils {

    /**
     * @returns {Promise<boolean>} true if a camera device named "Airtime" is present
     */
    static async isAirtimeCameraDevicePresent() {
        try {
            const devices = await navigator.mediaDevices?.enumerateDevices();
            if (devices) {
                return devices.some(device => {
                    return device.kind === "videoinput" && device.label.toLowerCase().includes("airtime");
                })
            }
        } catch (err) {
            console.error("Error enumerating media devices", err);
            return false;
        }
    }

}
