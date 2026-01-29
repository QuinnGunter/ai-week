//
//  looks/text_reaction.js
//  mmhmm
//
//  Created by Seth Hitchings on 11/20/2025.
//  Copyright 2025 mmhmm inc. All rights reserved.
//

/**
 * Static functions for creating new text media in various styles,
 * to be used as reactions. The key thing we do is choose the correct
 * text size for the desired content.
 *
 * TODO Some of these don't really work as inset, e.g. cutout fire.
 * Should we still let the user have control, for consistency?
 */
class TextReaction {

    // TODO does this need to accomodate the stage size?
    // Media with a tail needs to be larger to accomodate the tail
    static #tailedSize = SizeMake(800, 800);
    static #defaultSize = SizeMake(600, 600);
    static #emojiSize = SizeMake(800, 800);

    // LRU cache for computed text sizes to avoid recalculating for the same content
    static #textSizeCache = new Map();
    static #maxCacheSize = 100;

    static styles = [
        {
            id: "funky-angry",
            title: LocalizedString("Loud"),
            insetSize: SizeMake(700, 700),
            fullScreenSize: SizeMake(1280, 800),
        },
        {
            id: "classic-speech",
            title: LocalizedString("Speech"),
            insetSize: TextReaction.#tailedSize,
            fullScreenSize: SizeMake(1280, 1080),
            hasTail: true,
        },
        {
            id: "classic-thought",
            title: LocalizedString("Thought"),
            insetSize: TextReaction.#tailedSize,
            fullScreenSize: SizeMake(1280, 1080),
            hasTail: true,
        },
        {
            id: "cutout-fire",
            title: LocalizedString("Fire"),
            insetSize: this.#defaultSize,
            fullScreenSize: SizeMake(1920 - 200, 1080 - 200),
        },
        {
            id: "cutout-fireworks",
            title: LocalizedString("Fireworks"),
            insetSize: this.#defaultSize,
            fullScreenSize: SizeMake(1920 - 200, 1080 - 200),
        },
        {
            id: "modern-dark-transparent",
            title: LocalizedString("Simple"),
            insetSize: this.#defaultSize,
            fullScreenSize: SizeMake(1920, 1080),
        },
    ];

    static styleWithID(styleId) {
        return this.styles.find((s) => s.id === styleId);
    }

    static createMediaForTextReaction(styleId, message, anchor) {
        const style = this.styleWithID(styleId);
        if (!style) {
            console.error("Unknown text reaction style", styleId);
            return null;
        }
        return this.createMediaForTextReactionWithStyle(style, message, anchor);
    }

    static createMediaForTextReactionWithStyle(style, message, anchor) {
        const mediaStyle = Media.Text.StyleWithThemeID(style.id).clone();
        const size = (anchor == null || anchor == Stage.Object.Anchor.Center) ? style.fullScreenSize : style.insetSize;
        const media = this.#createMedia(message, mediaStyle, size);

        // For media with a tail, the anchor defines the tail position
        if (style.hasTail) {
            media.anchor = anchor ?? Stage.Object.Anchor.Center;
            media.style.angle = this.tailAngleForMedia(media);
        }

        if (style.anchorInset != null) {
            this.#setAnchorInset(media, style.anchorInset);
        }

        return media;
    }

    static CreateEmoji(emoji) {
        const style = Media.Text.StyleWithThemeID("emoji");
        const media = this.#createMedia(emoji, style, this.#emojiSize, Media.Text.Size.Enormous);
        this.#setAnchorInset(media, 0);
        media.metadata.type = LooksMediaType.EmojiReaction;
        return media;
    }

    static #setAnchorInset(media, inset) {
        if (media.metadata == null) {
            media.metadata = {};
        }
        media.metadata.anchorInset = inset;
    }

    static #createMedia(message, style, contentSize = this.#defaultSize, textSize = null) {
        const media = new Media.Text();
        media.title = message;
        media.style = style;
        media.attributedString = new AttributedString(message, {});
        media.textAlignment = AdvancedTextLayer.HorizontalAlignment.Center;
        media.contentSize = contentSize;
        media.aspectRatio = Media.Text.AspectRatio.Custom;
        media.editOnDisplay = false;

        // If the caller specified a text size, use it
        // Otherwise, we'll calculate the largest text size that fits.
        if (textSize) {
            media.setTextSizeWithoutResizing(textSize);
        } else {
            this.resizeTextToFit(media);
        }

        return media;
    }

    /**
     * Given an existing text media, sets the media's text size to the
     * largest text size that fits the media's current text content.
     * Uses an LRU cache to avoid recalculating for identical content/size/style combinations.
     * @param {Media.Text} media
     */
    static resizeTextToFit(media) {
        // Generate cache key from style, content size, and text content
        const cacheKey = this.#generateCacheKey(media);

        // Check cache first
        const cachedSize = this.#textSizeCache.get(cacheKey);
        if (cachedSize !== undefined) {
            // Move to end for LRU behavior (delete and re-add)
            this.#textSizeCache.delete(cacheKey);
            this.#textSizeCache.set(cacheKey, cachedSize);
            media.setTextSizeWithoutResizing(cachedSize);
            return;
        }

        // Use a temporary text layer so that we can test without
        // updating the media's actual text layer until we find the right size
        // Find the largest text size that fits by trying increasing sizes
        // until they no longer fit

        // The media isn't on stage and therefore has no render layer yet,
        // so create a temporary text layer
        const layer = new Media.Text.Layer(media.contentSize, media.style);
        const textLayer = layer.textLayer;

        const sizes = Object.values(Media.Text.Size);
        this.#applyTextSize(media, textLayer, sizes[0]);

        let calculatedSize = sizes[0];
        let previousSize = null;
        for (let i = 0; i < sizes.length; i++) {
            previousSize = media.textSize;
            this.#applyTextSize(media, textLayer, sizes[i]);

            if (!this.#fits(textLayer)) {
                // We've gone too far, so use the previous size
                this.#applyTextSize(media, textLayer, previousSize);
                calculatedSize = previousSize;
                break;
            }
            calculatedSize = sizes[i];
        }

        // Store result in cache with LRU eviction
        if (this.#textSizeCache.size >= this.#maxCacheSize) {
            // Delete the oldest entry (first key in Map iteration order)
            const firstKey = this.#textSizeCache.keys().next().value;
            this.#textSizeCache.delete(firstKey);
        }
        this.#textSizeCache.set(cacheKey, calculatedSize);
    }

    /**
     * Generate a cache key for text size lookups.
     * Combines style theme, content dimensions, and text content.
     */
    static #generateCacheKey(media) {
        const themeId = media.style?.themeID || "default";
        const width = media.contentSize?.width || 0;
        const height = media.contentSize?.height || 0;
        // Use first 50 chars of title to keep key reasonable while still being unique
        const textSnippet = (media.title || "").substring(0, 50);
        return `${themeId}:${width}x${height}:${textSnippet}`;
    }

    static #applyTextSize(media, textLayer, size) {
        media.setTextSizeWithoutResizing(size);
        media.updateTextLayer(textLayer);
    }

    static #fits(textLayer) {
        const maxSize = textLayer.size;
        const test = textLayer.fullSizeThatFits(maxSize);
        return test.fits && !test.wrappedOnCharacter;
    }

    static tailAngleForMedia(media) {
        switch (media.anchor) {
            case Stage.Object.Anchor.None:
                return media.style.angle;

            case Stage.Object.Anchor.TopLeft:
                return 45;
            case Stage.Object.Anchor.TopCenter:
                return 90;
            case Stage.Object.Anchor.TopRight:
                return 135;

            case Stage.Object.Anchor.CenterLeft:
                return 0;
            case Stage.Object.Anchor.Center:
                return 145;
            case Stage.Object.Anchor.CenterRight:
                return 180;

            case Stage.Object.Anchor.BottomLeft:
                return 315;
            case Stage.Object.Anchor.BottomCenter:
                return 270;
            case Stage.Object.Anchor.BottomRight:
                return 225;
        }
    }

    static resizeToFullScreen(media, stageSize) {
        if (this.isEmojiReactionMedia(media)) {
            return;
        }

        const style = this.styleWithID(media.style.themeID);
        let maxSize = style?.fullScreenSize;
        if (maxSize == null) {
            const padding = 100;
            maxSize = SizeMake(stageSize.width - padding * 2, stageSize.height - padding * 2);
        }
        media.contentSize = maxSize;
        this.resizeTextToFit(media);
        media.style.angle = this.tailAngleForMedia(media);
    }

    static resizeToInset(media) {
        if (this.isEmojiReactionMedia(media)) {
            return;
        }

        const style = this.styleWithID(media.style.themeID);
        media.contentSize = style?.insetSize ?? this.#defaultSize;
        this.resizeTextToFit(media);
        media.style.angle = this.tailAngleForMedia(media);
    }

    static isEmojiReactionMedia(media) {
        return IsKindOf(media, Media.Text) &&
            media.metadata?.type === LooksMediaType.EmojiReaction;
    }

}
