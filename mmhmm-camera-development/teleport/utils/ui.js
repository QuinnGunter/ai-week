//
//  utils.js
//  mmhmm
//
//  Created by Amol Ghode on 7/5/23.
//  Copyright © 2023 mmhmm, inc. All rights reserved.
//

// UI Utility functions
class UIUtils {
    static openWindow(url, target) {
        let handle = null;
        /**
         * Pop up blocker extensions may behave differently.
         * One such scenario was observed in case of Issue 2219 where 'poper' extension
         * was added to chome. This was resulting in an exception instead of
         * returning null. Fixing this by wrapping it inside try-catch block.
         * */

        try {
            handle = window.open(url, target);
        }
        catch (e) {
            console.warn(`Failed to open ${url} with target ${target}`);
        }
        return handle;
    }
}
