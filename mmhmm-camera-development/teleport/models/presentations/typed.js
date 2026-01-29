//
//  models/presentations/typed.js
//  mmhmm
//
//  Created by Seth Hitchings on 2/27/2025.
//  Copyright 2025 mmhmm inc. All rights reserved.
//

/**
 * A presentation with a specific purpose that is created by us and cannot
 * be removed or renamed by the user.
 *
 * Based on Presentation.ScratchPad.
 */
Presentation.Typed = class extends Presentation.Modern {
    constructor(endpoint, cloudyObj, type) {
        super(endpoint, cloudyObj);
        this.type = type;
    }
    get canRename() {
        return false;
    }
    get canShare() {
        return false;
    }
    get canDelete() {
        return true;
    }
    get canDuplicate() {
        return false;
    }
    encodeToRecord(record) {
        super.encodeToRecord(record);
        record.encodeProperty("type", this.type);
    }
    newSlideForRecord(record) {
        if (this.type == Presentation.Typed.Type.Looks) {
            return new Slide.Look(this.endpoint, record);
        } else if (this.type == Presentation.Typed.Type.Reactions) {
            return new Slide.Reaction(this.endpoint, record);
        }
        return super.newSlideForRecord(record);
    }
}

Presentation.Typed.Type = Object.freeze({
    Looks: "companion.looks",
    Nametags: "companion.nametags", // TODO no longer used
    Reactions: "companion.reactions",
});

