//
//  media/text/layers/root.js
//  mmhmm
//
//  Created by Steve White on 6/1/23.
//  Copyright © 2023 mmhmm, inc. All rights reserved.
//

Media.Text.Layer = class extends RenderLayer {
    constructor(size, style) {
        super();

        var blurLayer = new Media.Text.BlurredLayer();
        blurLayer.zIndex = -1;
        this.blurLayer = blurLayer;

        var backgroundLayer = new Media.Text.BackgroundLayer();
        this.backgroundLayer = backgroundLayer;
        this.addSublayer(backgroundLayer);

        var textLayer = new Media.Text.TextLayer(style);
        textLayer.zIndex = 1;
        this.textLayer = textLayer;
        this.addSublayer(textLayer);

        this.size = size;
        this.style = style;
    }
    // We override this because
    // 1) We don't need the standard RenderLayer filter used
    // 2) so we can pass the value down to our sublayers
    set cornerRadius(val) {
        const layers = [this.backgroundLayer, this.textLayer, this.blurLayer];
        layers.forEach(layer => {
            if (layer != null) {
                layer.cornerRadius = val;
            }
        })
    }
    get cornerRadius() {
        return this.backgroundLayer?.cornerRadius;
    }
    set blurEffectEnabled(value) {
        var blurEffectEnabled = !!value;
        if (blurEffectEnabled == this.blurEffectEnabled) {
            return;
        }
        this._blurEffectEnabled = blurEffectEnabled;

        var blurLayer = this.blurLayer;
        if (blurEffectEnabled == false) {
            this.removeSublayer(blurLayer);
        }
        else {
            this.addSublayer(blurLayer);
        }
    }
    get blurEffectEnabled() {
        return this._blurEffectEnabled ?? false;
    }
    set size(value) {
        super.size = value;
        this._updateSublayerSizes();
    }
    get size() {
        return super.size;
    }
    set style(style) {
        if (style == this._style) {
            return;
        }
        this._style = style;

        // Toggle the background blur layer
        const backdropFilter = style?.backgroundAttributes?.filter;
        if (backdropFilter == "blur") {
            this.blurEffectEnabled = true;
        }
        else {
            this.blurEffectEnabled = false;
        }

        this.backgroundLayer.style = style;
        this._updateSublayerSizes();
    }
    get style() {
        return this._style;
    }
    textLayerSizeForContentSize(size) {
        const style = this.style ?? Media.Text.Styles[0];
        const bgInset = style.backgroundInset ?? 0;

        const contentInsets = InsetsCopy(style.contentInsets);
        if (style.insetsAreProportional == true) {
            const width = size.width - (bgInset * 2);
            const height = size.height - (bgInset * 2);

            contentInsets.left *= width;
            contentInsets.right *= width;
            contentInsets.top *= height;
            contentInsets.bottom *= height;
        }

        const hInset = contentInsets.left + contentInsets.right + (bgInset * 2);
        const vInset = contentInsets.top + contentInsets.bottom + (bgInset * 2);

        return SizeMake(
            Math.max(0, Math.ceil(size.width - hInset)),
            Math.max(0, Math.ceil(size.height - vInset)),
        );
    }
    _updateSublayerSizes() {
        const size = this.size;
        const textSize = this.textLayerSizeForContentSize(size);

        const position = PointMake(size.width / 2, size.height / 2);
        this.sublayers.forEach(layer => {
            layer.position = position;
            if (layer == this.textLayer) {
                layer.size = textSize;
            }
            else {
                layer.size = size;
            }
        })
    }
    addSublayer(sublayer) {
        super.addSublayer(sublayer);
        this._updateSublayerSizes();
    }
    draw() {
        this.backgroundLayer.draw();
        this.textLayer.draw();
    }
    hitTest(event) {
        var hit = super.hitTest(event);
        if (hit == this) {
            return null;
        }
        return hit;
    }
    isPointInTail(inPoint) {
        var frame = this.frame;
        if (this.style?.angle == null) {
            return false;
        }

        // XXX: Really need to fix events to supply relative points
        // instead of absolute points.
        var point = PointCopy(inPoint);
        point.x -= frame.x;
        point.y -= frame.y;

        var pixel = this.backgroundLayer.hitTestPixelAtPoint(point);
        if (pixel == 0 || pixel == 255) {
            return false;
        }
        return true;
    }
    async drawStandaloneImageInContext(context, loader) {
        const style = this.style;
        const contentSize = this.size;

        const cornerRadius = this.cornerRadius;
        if (cornerRadius != null) {
            const radius = (Math.min(contentSize.width, contentSize.height) / 2) * cornerRadius;
            const rect = RectMake(0, 0, contentSize.width, contentSize.height);
            const path = new NewRoundRectPathForRectWithRadius(rect, radius);
            context.clip(path);
        }

        await style.preprocessThumbnailInContext(context, loader, contentSize.width, contentSize.height);

        context.save();

        const textSize = this.textLayerSizeForContentSize(contentSize);
        context.translate(
            (contentSize.width - textSize.width) / 2,
            (contentSize.height - textSize.height) / 2,
        );

        this.textLayer.drawInContext(context, textSize.width, textSize.height);

        await style.postprocessThumbnailInContext(context, loader, contentSize.width, contentSize.height);

        context.restore();
    }
}
