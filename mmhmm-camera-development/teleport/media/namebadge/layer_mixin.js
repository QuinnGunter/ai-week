//
//  media/namebadge/layer_mixin.js
//  mmhmm
//
//  Created by Steve White on 4/3/25.
//  Copyright © 2025 mmhmm, inc. All rights reserved.
//

Media.NameBadge.LayerMixin = (superclass) => class extends superclass {
    applyEvent(event) {
        const settings = {};
        this.encodeTo(settings);
        Object.assign(settings, event);
        this.decodeFrom(settings);
    }

    encodeObjectForProperty(object, prop) {
        if (object?.toJSON != null) {
            return object.toJSON();
        }
        return object;
    }

    encodeTo(coder) {
        this.codingProperties.forEach(prop => {
            const obj = this[prop];
            coder[prop] = this.encodeObjectForProperty(obj, prop);
        })
    }

    decodeObjectForProperty(object, prop) {
        return object;
    }

    decodeFrom(coder) {
        if (coder == null) {
            coder = {};
        }
        this.codingProperties.forEach(prop => {
            const obj = coder[prop];
            this[prop] = this.decodeObjectForProperty(obj, prop);
        });
    }
}
