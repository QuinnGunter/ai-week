//
//  hybrid/wall.js
//  mmhmm
//
//  Created by Seth Hitchings on 1/16/2025
//  Copyright 2025 mmhmm inc. All rights reserved.
//

class HybridWall {
    constructor(content) {
        this.buildWall(content);
    }

    buildWall(content) {
        const container = document.createElement("div");
        container.classList.add("native_bounce_required_wall");

        const left = document.createElement("div");
        left.classList.add("left");
        container.appendChild(left);

        const dark = AppIcons.LaunchWallLogoDark();
        dark.setAttributeNS(null, "class", "dark");
        left.appendChild(dark);

        const light = AppIcons.LaunchWallLogoLight();
        light.setAttributeNS(null, "class", "light");
        left.appendChild(light);

        const right = document.createElement("div");
        right.classList.add("right");
        right.appendChild(content);
        container.appendChild(right);

        this.container = container;
    }

    show(onDismiss) {
        this.onDismiss = onDismiss;
        this.removeWall = ShowPageWall(this.container);
        return this.removeWall;
    }

    dismiss() {
        if (this.removeWall) {
            this.removeWall();
            this.removeWall = null;
            this.onDismiss();
            this.onDismiss = null;
        }
    }
}
