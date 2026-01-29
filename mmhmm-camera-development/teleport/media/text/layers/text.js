//
//  media/text/layers/text.js
//  mmhmm
//
//  Created by Steve White on 2/23/22.
//  Copyright © 2022 mmhmm, inc. All rights reserved.
//

Media.Text.TextLayer = class extends AdvancedTextLayer {
    constructor(style) {
        super(RectZero());

        if (style == null) {
            style = Media.Text.Style.Default;
        }

        // We need the style to draw borders/etc
        this.style = style;

        this.verticalAlignment = "center";
    }
    get hitTestMask() {
        // We override this so that one doesn't have to click
        // on text pixels to register a hit
        return null;
    }
    set attributedString(anAttributedString) {
        var previous = this.attributedString;
        if (previous == anAttributedString) {
            // Absolutely no change
            return;
        }
        if (previous != null && previous.equals(anAttributedString) == true) {
            // Object changed, but its contents are identical
            return;
        }

        var fontLoadPromises = [];
        if (anAttributedString != null) {
            anAttributedString.enumerate((offset, text, attrs) => {
                var font = attrs.font;
                if (font != null) {
                    fontLoadPromises.push(font.load());
                }
            });
        }

        super.attributedString = anAttributedString;
        Promise.all(fontLoadPromises).then(() => {
            this.recalculate();
            this.draw();
        });
    }
    get attributedString() {
        return super.attributedString;
    }
    set style(aStyle) {
        if (EqualObjects(this._style, aStyle) == true) {
            return;
        }
        this._style = aStyle;

        var contentInsets = null;
        var textAttributes = null;
        var shape = null;
        if (aStyle != null) {
            contentInsets = aStyle.contentInsets;
            textAttributes = aStyle.textAttributes;
            shape = aStyle.shape;
        }
        else {
            contentInsets = { top: 0, left: 0, bottom: 0, right: 0 };
        }

        if (shape == null) {
            shape = AdvancedTextLayer.Shape.Rectangle;
        }
        this.shape = shape;
        this.contentInsets = contentInsets;

        if (textAttributes != null) {
            var alignment = textAttributes.alignment;
            if (alignment == null) {
                alignment = "left";
            }
            this.horizontalAlignment = alignment;
        }
    }
    get style() {
        return this._style;
    }
}
