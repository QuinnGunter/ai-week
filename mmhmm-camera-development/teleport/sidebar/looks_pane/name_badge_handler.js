//
//  sidebar/looks_pane/name_badge_handler.js
//  mmhmm
//
//  Created by Cristiano Oliveira on 1/28/2025.
//  Copyright 2025 mmhmm inc. All rights reserved.
//

/**
 * Handles the details of how we use Media.NameBadge objects
 * as part of Looks.
 */
class LooksNameBadgeHandler {
    static defaultsTitleKey = "nameBadgeHeader";
    static defaultsSubtitleKey = "nameBadgeSubheader";

    /**
     *
     */
    constructor() {}

    static getFontFamily(media) {
        // It might be a FontFace object; it might be a string...
        let fontFace = media.variables.fontFace;
        if (fontFace?.family != null) {
            fontFace = fontFace.family;
        }

        // defaulting to serif but this shouldn't happen
        return fontFace || "serif";
    }

    static getDefaultFontFamily(media) {
        const style = media.style;
        const variables = style.variables;
        let fontFace = variables?.fontFace;

        // It might be a FontFace object; it might be a string...
        if (fontFace?.family != null) {
            fontFace = fontFace.family;
        }
        return fontFace || "serif";
    }

    /**
     * Change the style of a name tag.
     * @param {Slide.Modern} slide the look to update.
     * @param {Paint} tint the current presenter tint.
     * @param {string} styleId the id of the built in style to apply.
     */
    changeStyle(slide, tint, styleId) {
        const media = slide.getNametagMedia();

        // If the built-in style doesn't use a custom font
        // and the current nametag does, we need to remove it
        media.fontAsset = null;

        const style = Media.NameBadge.StyleWithID(styleId);
        if (style == null) {
            console.error("Unknown nametag style:", styleId);
            return;
        }
        const variant = style.defaultVariant ?? 0;
        media.applyStyle(style, variant);

        // Presets might colorize the nametag
        slide.getPreset()?.colorizeNametag(tint, media);
    }

    /**
     * Replaces the name tag with a copy of an existing custom nametag.
     * @param {Slide.Modern} slide the look to update.
     * @param {Media.NameBadge} customNametag the custom nametag to duplicate.
     */
    useCustomNametag(slide, customNametag) {
        const oldNametag = slide.getNametagMedia();
        const newNametag = customNametag.copy();
        newNametag.titleLabel.string = oldNametag.titleLabel.string;
        newNametag.subtitleLabel.string = oldNametag.subtitleLabel.string;
        slide.replaceObject(oldNametag, newNametag, false);
    }

    /**
     * Changes the selected layout variant for the name tag.
     * @param {Slide.Modern} slide - The slide object.
     * @param {string} layout - the selected variant id
     */
    changeLayout(slide, layout) {
        this.#updateNameBadgeMediaItemLayout(slide, layout);
    }

    #updateNameBadgeMediaItemLayout(slide, layout) {
        const media = slide.getNametagMedia();
        const style = media.style;
        const variants = style.variants;
        const variantNum = variants.findIndex((variant) => variant.id == layout);
        if (variantNum != -1) {
            media.applyStyle(style, variantNum);
        }
    }


    setFontFamily(media, fontFace) {
        media.variables.fontFace = fontFace;

        // Backwards compatibility: make sure that this media is using the variable
        const style = media.style;
        if (
            style.base.title.fontFace != "$fontFace" ||
            style.base.subtitle.fontFace != "$fontFace"
        ) {
            style.base.title.fontFace = "$fontFace";
            style.base.subtitle.fontFace = "$fontFace";
            media.style = style;
        }
    }

    /**
     * @param {Slide.Look} look - The look object.
     * @param {{ value: string, rgba: { r: number, g: number, b: number, a: number } }} color - Updated color.
     */
    static updateNameBadgeColor(look, name, color) {
        const media = look.getNametagMedia();
        LooksNameBadgeHandler.updateNameBadgeMediaColor(media, name, color);
    }

    /**
     * @param {Media.NameBadge} media - The name tag object.
     * @param {{ value: string, rgba: { r: number, g: number, b: number, a: number } }} color - Updated color.
     */
    static updateNameBadgeMediaColor(media, name, color) {
        const variables = media.variables;
        if (!variables) {
            console.error("No variables found in Media.NameBadge");
            return;
        }
        let paint = null;
        if (color.rgba != null) {
            paint = new Paint.Color([
                color.rgba.r / 255,
                color.rgba.g / 255,
                color.rgba.b / 255,
                color.rgba.a
            ]);
        } else if (IsKindOf(color, Paint.Color) || IsKindOf(color, Paint.LinearGradient) || IsKindOf(color, Paint.RadialGradient)) {
            paint = color;
        } else {
            // It's a hex string
            paint = new Paint.Color(color);
        }
        variables[name] = paint;
    }

    revertNameBadgeColorsToDefaults(slide, paint) {
        const media = slide.getNametagMedia();
        media.restoreDefaultColors();

        // Apply any custom colorization from the preset that created the look
        const preset = slide.getPreset();
        if (preset?.isNametagColorizable()) {
            preset.colorizeNametag(paint, media);
        }
    }

    /**
     * @param {Slide.Modern} slide - The slide object.
     * @param {string} value - The new value for the title.
     */
    updateNameBadgeTitle(slide, value) {
        LooksNameBadgeHandler.#updateNameBadgeTitle(slide, value);
        SharedUserDefaults.setValueForKey(value, LooksNameBadgeHandler.defaultsTitleKey);
    }

    /**
     * @param {Media.NameBadge} media - The name tag object.
     * @param {string} value - The new value for the title.
     */
    static updateNameBadgeMediaTitle(media, value) {
        LooksNameBadgeHandler.updateNameBadgeMediaItemTitle(media, value);
        SharedUserDefaults.setValueForKey(value, LooksNameBadgeHandler.defaultsTitleKey);
    }

    /**
     * @param {Slide.Modern} slide - The slide object.
     * @param {string} value - The new value for the subtitle.
     */
    updateNameBadgeSubtitle(slide, value) {
        LooksNameBadgeHandler.#updateNameBadgeSubtitle(slide, value);
        SharedUserDefaults.setValueForKey(value, LooksNameBadgeHandler.defaultsSubtitleKey);
    }

    /**
     * @param {Media.NameBadge} media - The name tag object.
     * @param {string} value - The new value for the subtitle.
     */
    static updateNameBadgeMediaSubtitle(media, value) {
        LooksNameBadgeHandler.updateNameBadgeMediaItemSubtitle(media, value);
        SharedUserDefaults.setValueForKey(value, LooksNameBadgeHandler.defaultsSubtitleKey);
    }

    /*
     * If the name badge slide has never had its template text boxes filled in,
     * populate them with the most recent text that the user entered.
     */
    static populateNameBadgeFieldsIfNeeded(slide) {
        const media = slide.getNametagMedia();
        if (media?.template) {
            this.populateNameBadgeMediaItemFields(slide, media);
        }
    }

    static populateNameBadgeFields(slide) {
        const media = slide.getNametagMedia();
        if (media) {
            LooksNameBadgeHandler.populateNameBadgeMediaItemFields(slide, media);
        }
    }

    static populateNameBadgeMediaItemFields(slide, media) {
        const title = LooksNameBadgeHandler.getDefaultNameBadgeTitleValue(slide);
        LooksNameBadgeHandler.updateNameBadgeMediaItemTitle(media, title);

        const subtitle = LooksNameBadgeHandler.getDefaultNameBadgeSubtitleValue(slide);
        LooksNameBadgeHandler.updateNameBadgeMediaItemSubtitle(media, subtitle);
    }

    static getDefaultNameBadgeTitleValue(slide) {
        return (
            SharedUserDefaults.getValueForKey(LooksNameBadgeHandler.defaultsTitleKey) ||
            slide.getPreset()?.defaultNametagValues?.title ||
            gApp.localPresenter.screenName ||
            LocalizedString("Name")
        );
    }

    static getDefaultNameBadgeSubtitleValue(slide) {
        return (
            SharedUserDefaults.getValueForKey(LooksNameBadgeHandler.defaultsSubtitleKey) ||
            slide.getPreset()?.defaultNametagValues?.subtitle ||
            LocalizedString("Title or Location")
        );
    }

    static #updateNameBadgeTitle(slide, value) {
        const media = slide.getNametagMedia();
        if (media) {
            LooksNameBadgeHandler.updateNameBadgeMediaItemTitle(media, value);
        }
    }

    static updateNameBadgeMediaItemTitle(media, value) {
        media.titleLabel.string = value || " ";
        if (media.template) {
            media.template = false;
        }
    }

    static #updateNameBadgeSubtitle(slide, value) {
        const media = slide.getNametagMedia();
        if (media) {
            LooksNameBadgeHandler.updateNameBadgeMediaItemSubtitle(media, value);
        }
    }

    static updateNameBadgeMediaItemSubtitle(media, value) {
        media.subtitleLabel.string = value || " ";
        if (media.template) {
            media.template = false;
        }
    }
}
