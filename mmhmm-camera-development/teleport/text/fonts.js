//
//  fonts.js
//  mmhmm
//
//  Created by Steve White on 12/15/21.
//  Copyright © 2021 mmhmm, inc. All rights reserved.
//

function Font({ family, size, weight, bold, strikeout }) {
    return {
        family, size, weight, bold,
        strikeout: strikeout ?? {},
        copy: function() {
            return Object.assign({}, this);
        },
        equals: function(other) {
            const us = this.toJSON();
            const them = (other?.toJSON != null ? other.toJSON() : other);
            return EqualObjects(us, them);
        },
        toJSON: function() {
            let family = this.family;
            if (IsKindOf(family, FontFace) == true) {
                family = family.family;
            }
            else if (IsKindOf(family, Array) == true) {
                family = family[0]?.family;
            }
            return {family: family, size: this.size, weight: this.weight, bold: this.bold, strikeout: this.strikeout };
        },
        toString: function() {
            var components = [];
            var weight = this.weight;
            if (weight != null) components.push(weight);

            var size = this.size;
            if (size != null) components.push(size + "px");

            var family = this.family;
            if (family) {
                if (family.constructor == FontFace) {
                    family = family.family;
                }
                else if (family.constructor == Array) {
                    family = family[0].family;
                }
            }

            if (family != null) components.push(family);

            return components.join(" ");
        },
        load: async function() {
            var family = this.family;
            if (family.constructor == String) {
                return;
            }
            else if (family.constructor == FontFace) {
                return family.load();
            }
            else if (family.constructor == Array) {
                return Promise.all(family.map(f => f.load()));
            }
            else {
                return null;
            }
        }
    };
}

Font.DefaultFontFamily = () => {
    var font = this._Font;
    if (font == null) {
        font = window.getComputedStyle(document.body)["font-family"];
        this._Font = font;
    }
    return font;
}