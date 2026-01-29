//
//  core.js
//  mmhmm
//
//  Created by Steve White on 8/19/21.
//  Copyright © 2021 mmhmm, inc. All rights reserved.
//

/** @typedef {string} UUID */

class RenderFilter extends ObservableObject {
    /**
     * @constructor
     * @param {string} fragment The fragment shader source
     * @param {string[]} uniforms A list of required uniforms
     * @param {string[]|null} parameters An optional list of parameters for the UI to display
     */
    constructor(fragment, uniforms, parameters) {
        /**
         * @readonly
         * @type {UUID}
         */
        super();

        this.identifier = this.constructor.identifier;
        this.fragment = fragment;
        this.uniforms = uniforms;
        this.parameters = parameters;
        this.enabled = true;
        this.modifiesContents = false;
        if (parameters != null) {
            for (var key in parameters) {
                this[key] = parameters[key].default;
            }
        }
    }
    /**
     * @return {RenderFilter}
     */
    copy() {
        var copy = new this.constructor();
        Object.assign(copy, this);
        return copy;
    }
    /**
     * @param {Object<string,any>} event The event to apply
     */
    applyEvent(event) {
        var parameters = this.parameters;
        if (parameters != null) {
            for (var key in parameters) {
                var value = event[key];
                if (value == null) {
                    continue;
                }
                if (this[key] != value) {
                    this[key] = value;
                }
            }
        }
    }
    toMedia() {
        var state = this.toJSON();
        var id = state.id;
        delete state.id;
        var media = {
            id: id
        };
        if (Object.keys(state).length > 0) {
            media.state = state;
        }
        return media;
    }
    toJSON() {
        var result = {};
        var id = this.identifier;
        if (id != null) {
            result.id = id;
        }
        var parameters = this.parameters;
        if (parameters != null) {
            for (var key in parameters) {
                result[key] = this[key];
            }
        }
        return result;
    }
}
