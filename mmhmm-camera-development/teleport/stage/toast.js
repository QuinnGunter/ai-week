//
//  toast.js
//  mmhmm
//
//  Created by Seth Hitchings on 11/19/2025.
//  Copyright 2025 mmhmm inc. All rights reserved.
//
class Toast {

    /**
     * An Tippy-based toast system that shows a single-line message above
     * the app panel (sidebar), or at the top of the app panel if it is at
     * the top of the viewport.
     *
     * @param {String} message
     */
    static show(message) {
        const target = document.querySelector("#sidebar_pane > .contents");
        const props = {
            content: message,
            arrow: false,
            theme: "toast",
            hideOnClick: false,
            trigger: "manual",
            popperOptions: {
                modifiers: [{
                    name: 'preventOverflow',
                    options: {
                        altAxis: true,
                        padding: 6,
                    },
                }],
            },
        }

        // Hide any existing toast before showing a new one
        tippy.hideAll();

        const instance = tippy(target, props);
        instance.show();
        setTimeout(() => {
            instance.hide();
        }, 3000);
    }
}
