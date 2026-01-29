//
//  solid_color.js
//  mmhmm
//
//  Created by Steve White on 5/10/22.
//  Copyright © 2022 mmhmm, inc. All rights reserved.
//

class SolidColorRoom extends Room {
    constructor(identifier, title, thumbnailSrc, color) {
        super(identifier, title, thumbnailSrc);

        if (typeof color == "string") {
            var channels = color.match(/([0-9a-fA-F]{2})/g);
            if (channels != null && channels.length == 3) {
                color = channels.map(a => parseInt(a, 16) / 255);
                color.push(1.0);
            }
            else {
                color = [1, 0, 1, 1];
            }
        }
        this._color = color;
        this.thumbnailForCurrentState();
    }
    get hash() {
        return cyrb53(this.color.join(""));
    }
    willAttachToStage(stage) {
        super.willAttachToStage(stage);

        var filter = new SolidColorFilter(this.color);
        this.layer.filter = filter;
    }
    didDetachFromStage(stage) {
        super.didDetachFromStage(stage);
        this.filter = null;
    }
    set color(color) {
        this._color = color;
        var filter = this.filter;
        if (filter != null) {
            filter.color = color;
        }
    }
    get color() {
        return this._color;
    }
    applyEvent(event) {
        super.applyEvent(event);
        var color = event.color;
        if (color != null) {
            this.color = color;
        }
    }
    toJSON() {
        var r = super.toJSON();
        r.color = this.color;
        r.type = SolidColorRoom.Type;
        return r;
    }
    /*
     * Thumbnails
     */
    async thumbnailForState(state) {
        if (this.thumbnailAsset == null) {
            var canvas = document.createElement("canvas");
            canvas.width = 160;
            canvas.height = 90;
            var context = canvas.getContext("2d");
            var hex = state.color.map(c => (c * 255).toString(16));
            context.fillStyle = "#" + hex.join("");
            context.fillRect(0, 0, canvas.width, canvas.height);

            const blob = await new Promise(resolve => canvas.toBlob(resolve));
            this.thumbnailAsset = new LocalAsset({blob});
        }

        return super.thumbnailForState(state);
    }
}

SolidColorRoom.Type = "color";

SolidColorRoom.FromJSON = function(json) {
    var id = json.id;
    var color = json.color;
    return new SolidColorRoom(id, "", null, color);
}
