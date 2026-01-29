//
//  media/namebadge/variables.js
//  mmhmm
//
//  Created by Steve White on 4/3/25.
//  Copyright © 2025 mmhmm, inc. All rights reserved.
//

Media.NameBadge.Variables = class extends ObservableObject {
    constructor(data) {
        super();
        Object.assign(this, data);
    }
    resolve(obj, level=0) {
        if (level > 3) {
            // Primarily to avoid traversing outside the obj
            // e.g. a Font might lead it to document
            return obj;
        }

        if (obj == null || obj.constructor == Number || obj.constructor == FontFace) {
            return obj;
        }
        else if (obj.constructor == String) {
            if (obj[0] == "$") {
                return this[obj.substring(1)];
            }
            return obj;
        }

        const result = new obj.constructor();
        for (let key in obj) {
            let val = obj[key];
            if (val != null) {
                if (val.constructor == Array) {
                    val = val.map(item => this.resolve(item, level + 1));
                }
                else {
                    val = this.resolve(val, level + 1);
                }
            }
            result[key] = val;
        }
        return result;
    }
}
