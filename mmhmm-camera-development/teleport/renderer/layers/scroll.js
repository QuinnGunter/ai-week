//
//  scroll.js
//  mmhmm
//
//  Created by Steve White on 9/30/21.
//  Copyright © 2021 mmhmm, inc. All rights reserved.
//

/**
 * @extends {RenderLayer}
 */
class ScrollLayer extends RenderLayer {
    /**
     * @return {ScrollLayer}
     */
    constructor() {
        super();
        this._contentOffset = PointZero();
    }
    onContentsSrcLoaded() {
        this.contentOffset = PointZero();
    }
    /** @type {Point} */
    set contentOffset(anOffset) {
        this._contentOffset = PointCopy(anOffset);

        var frame = this.frame;
        var size = this.naturalSize;

        var width = frame.width / size.width;
        var height = frame.height / size.height;
        var x = anOffset.x / size.width;
        var y = anOffset.y / size.height;
        this.contentRect = RectMake(x, y, width, height);
    }
    get contentOffset() {
        return PointCopy(this._contentOffset);
    }
}
