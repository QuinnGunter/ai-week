//
//  media/text/layers/blur_bg.js
//  mmhmm
//
//  Created by Steve White on 07/28/22.
//  Copyright © 2022 mmhmm, inc. All rights reserved.
//

Media.Text.BlurredLayer = class extends RendererFramebufferLayer {
    constructor() {
        super();
        this.filter = new GaussianBlurFilter();
    }
    set cornerRadius(val) {
        this._cornerRadius = val;

        let mask = this.roundRectFilter;
        if (val == null || val <= 0) {
            this.removeFilter(mask);
        }
        else {
            if (mask == null) {
                mask = new RoundRectMaskFilter();
                this.roundRectFilter = mask;
                this.addFilter(mask);
            }
            mask.cornerRadius = val;
        }
    }
    get cornerRadius() {
        return this._cornerRadius;
    }
}
