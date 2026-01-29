//
//  flags.js
//  mmhmm
//
//  Created by Jonathan Potter on 04/29/24.
//  Copyright © 2024 mmhmm, inc. All rights reserved.
//

class Flags {
    static fromURLSearchParams(params) {
        return Array.from(params.entries()).reduce((hashValues, [key, value]) => {
            switch (value) {
                case 'true':
                case '':
                    hashValues[key] = true
                    break
                case 'false':
                    hashValues[key] = false
                    break
                default:
                    hashValues[key] = value
            }

            return hashValues
        }, {})
    }

    static getConfig () {
        return this.config ||= Flags.fromURLSearchParams(new URLSearchParams(window.location.hash.slice(1)))
    }
}
