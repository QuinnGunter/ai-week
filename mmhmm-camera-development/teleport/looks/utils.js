//
//  looks/utils.js
//  mmhmm
//
//  Created by Seth Hitchings on 6/18/2025.
//  Copyright 2025 mmhmm inc. All rights reserved.
//

class LooksUtils {

    /**
     * Applies a color scheme to the media object. This doesn't
     * change the colors of the media object, it simply sets the
     * metadata that will later be used to actually change the colors.
     * @param {Paint} color
     * @param {Media.Image} media
     * @param {Function(String, Object) | null} colorizationCallback
     */
    static updateColorScheme(color, media, colorizationCallback = null) {
        let metadata = media.metadata;
        if (!metadata) {
            metadata = {};
            media.metadata = metadata;
        }

        const keyColor = LooksColors.primaryColorFromPaint(color).toUpperCase();
        metadata.colorScheme = { tint: keyColor };

        if (colorizationCallback) {
            colorizationCallback(keyColor, metadata.colorScheme);
        }

        media.invalidateThumbnail();
    }

    static normalizeMediaPosition(stage, center) {
        // The center point expects a default stage size
        // We need to convert it to the current stage size
        const stageSize = stage.size;
        const defaultSize = Stage.DefaultSize;
        const normalizedX = (center.x / defaultSize.width) * stageSize.width;
        const normalizedY = (center.y / defaultSize.height) * stageSize.height;
        return PointMake(normalizedX, normalizedY);
    }

    /**
     * Calculate the scale factor for a media object so that it fits
     * within the specified bounding box using an "object fit" approach -
     * the media will fill at least one dimension of the bounding box.
     * @param {Media} media
     * @param {{width: number, height: number}} maxSize
     * @returns {Promise<Number>}
     */
    static async calculateScaleForLogo(media, maxSize = SizeMake(480, 480)) {
        // Scale the logo to fit a bounding box
        const assetSize = await media.getContentSize();

        // Figure out which dimension is the limiting factor
        const horizontalScale = maxSize.width / assetSize.width;
        const verticalScale = maxSize.height / assetSize.height;

        const stageSize = Stage.DefaultSize;
        if (horizontalScale < verticalScale) {
            // Width is the limiting factor
            return maxSize.width / stageSize.width;
        } else {
            // Height is the limiting factor
            return maxSize.height / stageSize.height;
        }
    }

    /**
     * Calculate the scale factor for a media object so that it is displayed
     * at its natural size on the stage.
     * @param {Media} media
     * @returns {Promise<Number>}
     */
    static async naturalSizeScaleForLogo(media) {
        // Figure out the size of the media and stage
        const assetSize = await media.getContentSize();
        const stageSize = Stage.DefaultSize;

        // Figure out the scale to fit the logo at its natural size
        const widthScale = assetSize.width / stageSize.width;
        const heightScale = assetSize.height / stageSize.height;

        return Math.min(1.0, Math.max(widthScale, heightScale));
    }

    static createVideoMediaFromURL(url, type) {
        const asset = new LocalAsset({contentURL: url});
        const media = new Media.BasicVideo(null, null, asset);
        media.metadata = { sourceUrl: url };
        if (type) {
            media.metadata.type = type;
        }
        return media;
    }

    static createImageMediaFromURL(url, type) {
        const asset = new LocalAsset({contentURL: url});
        const media = new Media.Image(null, null, asset);
        media.metadata = { sourceUrl: url };
        if (type) {
            media.metadata.type = type;
        }
        return media;
    }

    static createImageMediaFromBlob(blob, type) {
        const asset = new LocalAsset({ blob });
        const media = new Media.Image(null, null, asset);
        if (type) {
            media.metadata = { type };
        }
        return media;
    }

    static createGIFMediaFromBlob(blob, type) {
        const asset = new LocalAsset({ blob });
        const media = new Media.GIF(null, null, asset);
        if (type) {
            media.metadata = { type };
        }
        return media;
    }

    static isWallpaperNone(presenter) {
        return LooksUtils.isShapeNone(presenter) &&
            presenter.backgroundStyle != Presenter.BackgroundStyle.Hide &&
            presenter.scale == 1.0 &&
            InsetsEqual(presenter.cropInsets, InsetsZero());
    }

    static isShapeNone(presenter) {
        // The Presenter model doesn't have a "none" shape, but for Camera
        // we treat a full-size rectangle as "none".
        return presenter.shape == Presenter.Shape.Rectangle &&
            presenter.scale == 1.0 &&
            InsetsEqual(presenter.cropInsets, InsetsZero());
    }

    static minPresenterScale() {
        // We don't want huge insets, this is just to achieve a "framed" effect
        const maxBorder = 100;
        let min = (Stage.DefaultSize.width - 2 * maxBorder) / Stage.DefaultSize.width;
        return Math.round(min * 1000) / 1000; // Round to 3 decimal places
    }

    static stageCenterPoint(stage) {
        const stageSize = stage?.size ?? Stage.DefaultSize;
        return PointMake(stageSize.width / 2, stageSize.height / 2);
    }

    static makeAnchorOptions(currentAnchor = null, includeNone = false) {
        const result = Object.entries(Stage.Object.Anchor).map(([_key, value]) => {
            if (value == Stage.Object.Anchor.None && !includeNone) {
                return null;
            }
            return {
                value,
                label: LooksUtils.nameForAnchor(value),
                selected: value === currentAnchor,
            };
        });
        return result.filter((option) => option != null);
    }

    static nameForAnchor(anchor) {
        switch (anchor) {
            case Stage.Object.Anchor.None:
                return LocalizedString("None");
            case Stage.Object.Anchor.TopLeft:
                return LocalizedString("Top Left");
            case Stage.Object.Anchor.TopCenter:
                return LocalizedString("Top Center");
            case Stage.Object.Anchor.TopRight:
                return LocalizedString("Top Right");

            case Stage.Object.Anchor.CenterLeft:
                return LocalizedString("Center Left");
            case Stage.Object.Anchor.Center:
                return LocalizedString("Middle");
            case Stage.Object.Anchor.CenterRight:
                return LocalizedString("Center Right");

            case Stage.Object.Anchor.BottomLeft:
                return LocalizedString("Bottom Left");
            case Stage.Object.Anchor.BottomCenter:
                return LocalizedString("Bottom Center");
            case Stage.Object.Anchor.BottomRight:
                return LocalizedString("Bottom Right");
        }
    }

    static defaultZIndexForLayer(type, presenterForegroundZindex = null) {
        if (presenterForegroundZindex === null) {
            presenterForegroundZindex = Slide.Modern.DefaultPresenterZIndices.Foreground;
        }

        const offsets = {
            [LooksMediaType.Logo]: 100,
            [LooksMediaType.Overlay]: 200,
            [LooksMediaType.Pattern]: 300,
        };
        const offset = offsets[type] ?? 500;
        return presenterForegroundZindex - offset;
    }

    /* BrandFetch stuff */

    static thumbnailUrlForOverlay(media) {
        const fingerprint = media?.asset?.fingerprint;
        if (fingerprint) {
            return LookOverlays.All.find(option => option.fingerprint === fingerprint)?.thumbnailUrl;
        }
        return LooksUtils.matchAssetByContentURL(media?.asset, LookOverlays.All)?.thumbnailUrl;
    }

    static matchAssetByContentURL(asset, options) {
        const url = asset?.contentURL?.href;
        return options.find((option) => {
            let optionUrl = null;
            if (option.assetUrl.indexOf("://") == -1) {
                optionUrl = new URL(option.assetUrl, window.location);
            } else {
                optionUrl = new URL(option.assetUrl);
            }
            return optionUrl.href == url;
        });
    }

    static isValidDomain(domain) {
        const regex = /^(?=.{1,253}$)(?!-)[A-Za-z0-9-]{1,63}(?<!-)(\.(?!-)[A-Za-z0-9-]{1,63}(?<!-))+$/;
        return regex.test(domain);
    }

    static extractDomainFromString(value) {
        value = value?.trim();

        if (value?.includes("://")) {
            // It's a URL, extract the domain
            try {
                const url = new URL(value);
                return url.hostname;
            } catch (e) {
                // If URL parsing fails, return null
                return null;
            }
        }

        if (value?.includes("/")) {
            // It includes a path, extract the first part
            const parts = value.split("/");
            value = parts[0];
        }

        if (this.isValidDomain(value)) {
            return value;
        }

        return null;
    }

    static isFreemailDomain(domain) {
        // TODO we don't currently have a robust way to check if it's freemail,
        // but the backend does - we should use it. For now we hardcode a short list.
        const freemailDomains = [
            "gmail.com", "yahoo.com", "hotmail.com", "outlook.com", "icloud.com",
            "aol.com", "mail.com", "live.com", "msn.com", "yandex.com"
        ];
        return freemailDomains.includes(domain.toLowerCase());
    }

    /* Reactions stuff */

    static isAwayScreenReaction(slide) {
        if (slide.type == LooksContentType.AwayScreen) {
            return true;
        }

        // The user made an explicit choice
        if (slide.metadata?.useAsAwayScreen != null) {
            return slide.metadata.useAsAwayScreen;
        }

        // We didn't always have a strong concept of away screens
        // Look for reactions with a name tag or text media and at least one other media item
        const objects = slide.objects;
        const hasNameTag = objects.some((obj) => IsKindOf(obj, Media.NameBadge));
        const hasText = objects.some((obj) => IsKindOf(obj, Media.Text));
        const hasOther = objects.some((obj) => !IsKindOf(obj, Media.NameBadge) && !IsKindOf(obj, Media.Text));
        return hasOther && (hasNameTag || hasText);
    }

    static sortSlidesList(slides) {
        const pinned = slides.filter((slide) => slide.metadata?.pinned != null);
        const unpinned = slides.filter((slide) => slide.metadata?.pinned == null);

        pinned.sort((a, b) => {
            // "pinned" values are timestamps
            const aPinned = new Date(a.metadata.pinned);
            const bPinned = new Date(b.metadata.pinned);
            return bPinned - aPinned;
        });

        unpinned.sort((a, b) => {
            return b.created - a.created;
        });

        return pinned.concat(unpinned);
    }

}
