//
//  framebuffer.js
//  mmhmm
//
//  Created by Steve White on 3/9/22.
//  Copyright © 2022 mmhmm, inc. All rights reserved.
//

/**
 * @extends {RenderLayer}
 */
class RendererFramebufferLayer extends RenderLayer {
    constructor() {
        super();
        this.usePositionForCoordinate = true;
    }
    set contents(anIgnoredValue) {
        // Intentionally discard
    }
    get contents() {
        return this;
    }
    set contentsNeedUpdate(anIgnoredValue) {
        // Intentionally discard
    }
    get contentsNeedUpdate() {
        return false;
    }
}
