//
//  models/slides/reaction.js
//  mmhmm
//
//  Created by Seth Hitchings on 12/8/2025.
//  Copyright 2025 mmhmm inc. All rights reserved.
//

/**
 * A subclass of Slide.Modern that represents a Reaction / Visual in the Camera app.
 */
Slide.Reaction = class extends Slide.Modern {

    constructor(endpoint, cloudyObj) {
        super(endpoint, cloudyObj);
    }

    /**
     * The type of this reaction slide.
     * @returns {LooksContentType.Reaction|LooksContentType.AwayScreen}
     */
    get type() {
        return this.metadata?.type;
    }

    /**
     * Whether this reaction should also be included in the
     * user's list of away screen options, allowing them to
     * use any reaction as an away screen.
     * @returns {boolean}
     */
    get useAsAwayScreen() {
        return this.metadata?.useAsAwayScreen === true;
    }

    /**
     * Whether this reaction should also be included in the
     * user's list of away screen options, allowing them to
     * use any reaction as an away screen.
     * @param {boolean} val
     */
    set useAsAwayScreen(val) {
        this.#setMetadataValue("useAsAwayScreen", val === true);
    }

    /**
     * The layout style for this reaction.
     * @returns {LooksReactionLayout}
     */
    get layout() {
        // If the user has set a style, use that
        if (this.metadata?.style) {
            return this.metadata.style;
        }

        // If this is a slide the user created in Creator, use the layout they set
        if (this.isCustomReaction()) {
            return LooksReactionLayout.SlideMedia;
        }

        // This is a slide the user created in Camera, use full screen
        return LooksReactionLayout.FullScreen;
    }

    /**
     * The layout style for this reaction.
     * @param {LooksReactionLayout} value
     */
    set layout(value) {
        this.#setMetadataValue("style", value);
    }

    /**
     * Whether this reaction works with nametags.
     * @returns {boolean}
     */
    worksWithNametags() {
        return this.layout != LooksReactionLayout.SlideAndPresenter;
    }

    /**
     * Internal users can create arbitrarily complex slides in Creator,
     * then add them to their Reactions presentation to use them
     * as a reaction in Camera. We call these "custom reactions".
     * @returns {boolean}
     */
    isCustomReaction() {
        // We set the metadata type when creating a reaction,
        // so a reaction without that type is by definition a custom
        // slide someone created outside of the Camera app.
        // We also treat slides with more than one media as custom,
        // since you can't create those in the Camera app.
        return this.objects.length != 1 || this.type != LooksContentType.Reaction;
    }


    /* Metadata manipulation */

    #setMetadataValue(key, val) {
        if (this.metadata == null) {
            this.metadata = {};
        }
        this.metadata[key] = val;
        this.setObjectNeedsPersistence(this);
    }

}
