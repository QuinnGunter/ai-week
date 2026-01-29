//
//  observable.js
//
//  Created by Steve White on 8/10/15.
//  Copyright © 2015 Steve White. All rights reserved.
//

/** @interface */
function ObserverObject() {}
/**
 * @param {Object} object The object that changed
 * @param {string} key The key/property on the object that changed
 * @param {Object|null} val The new value of the key/property
 */
ObserverObject.prototype.observePropertyChanged = function(obj, key, val, previous) {};

/**
 * @callback ObserverCallback
 * @param {Object} object The object that changed
 * @param {string} key The key/property on the object that changed
 * @param {Object|null} val The new value of the key/property
 */

/** @class ObservableObject */
class ObservableObject {
    didChangeValueForProperty(value, property, previous) {
        var observersKey = "$$observers$$";
        var allObservers = this[observersKey];
        if (allObservers == null) {
            return;
        }

        var observers = allObservers[property];
        if (observers == null) {
            return;
        }

        observers.forEach(anObserver => {
            if (typeof anObserver == "function") {
                anObserver(this, property, value, previous);
            }
            else {
                anObserver.observePropertyChanged.call(anObserver, this, property, value, previous);
            }
        });
    }
    /**
     * @param {ObserverObject|ObserverCallback} observer The observer to be notified of changes
     * @param {string} property The key/property the observer wants notifications for
     */
    addObserverForProperty(observer, property) {
        // This was a separate function to support propertiesAffectingValueOf,
        // which was removed for teleport
        var definePropertyWithSetter = function(object, propertyName, setter) {
            var ivar = "$$private$$";
            var originalConfigKey = "$$" + propertyName + "$$";
            if (Object.getOwnPropertyDescriptor(object, ivar) == null) {
                // ivar to store the value
                Object.defineProperty(object, ivar, {
                    enumerable: false,
                    configurable: false,
                    writable: true,
                    value: {},
                });
            }
            else if (object[ivar][originalConfigKey] != null) {
                // $$private$$._<propertyName> indicates we've already configured it.
                return;
            }

            var propDesc = Object.getOwnPropertyDescriptor(object, propertyName);
            var parent = object;
            while (propDesc == null) {
                // Property may be defined on a superclass, so walk up
                // until we hit ourself
                parent = Object.getPrototypeOf(parent);
                if (parent == null || parent.constructor == ObservableObject) {
                    break;
                }
                propDesc = Object.getOwnPropertyDescriptor(parent, propertyName);
            }

            if (propDesc == null) {
                // The property does not exist – it could be a function which
                // we can't really support.  The property may not have been defined
                // yet, and we *could* just add the property (via null get&set below)
                // but for now just error out about this.
                console.error("Could not find property '" + propertyName + "' on object:", object)
                return;
            }

            // Store the original propDesc as we could revert to it once
            // all the observers are removed
            object[ivar][originalConfigKey] = (propDesc != null ? propDesc : true);

            var newProperty = {
                enumerable: true,
                configurable: true, // true so we can revert it later
            };

            if (propDesc.get == null && propDesc.set == null) {
                // Property is *not* using custom setter and getter

                // Copy existing value into ivar stash for our
                // new getter+setter to use
                object[ivar][propertyName] = object[propertyName];

                newProperty.get = function() {
                    return object[ivar][propertyName];
                }
                newProperty.set = function(value) {
                    var previous = object[ivar][propertyName];
                    object[ivar][propertyName] = value;
                    object.didChangeValueForProperty(value, propertyName, previous);
                    if (setter != null) {
                        setter.call(object, propertyName);
                    }
                }
            }
            else if (propDesc.get != null && propDesc.set != null) {
                // Property is using custom setter and getter, which we can just wrap
                newProperty.get = propDesc.get;
                newProperty.set = function(value) {
                    var previous = propDesc.get.call(object);
                    propDesc.set.call(object, value)
                    object.didChangeValueForProperty(value, propertyName, previous);
                    if (setter != null) {
                        setter.call(object, propertyName);
                    }
                }
            }
            else {
                console.error("unsupported property descriptor: ", propDesc);
                // We can't really support this, so we'll leave the
                // property descriptor alone. It'll be up to the
                // owning object to call didChangeValueForProperty
                return;
            }

            Object.defineProperty(object, propertyName, newProperty);
        };

        // Setup custom getter/setters to monitor changes to this property
        var automaticKey = "automaticallyNotifiesObserversOf";
        automaticKey += property.substring(0, 1).toUpperCase() + property.substring(1);
        if (this[automaticKey] != false) {
            definePropertyWithSetter(this, property, null);
        }

        //
        // Setup observers
        //
        var observersKey = "$$observers$$";
        if (this[observersKey] == null) {
            Object.defineProperty(this, observersKey, {
                enumerable: false,
                configurable: false,
                writable: true,
                value: {},
            });
        }

        var allObservers = this[observersKey];
        var observers = allObservers[property];
        if (observers == null) {
            observers = [];
            allObservers[property] = observers;
        }

        if (observers.indexOf(observer) == -1) {
            observers.push(observer);
        }
    }
    /**
     * @param {ObserverObject|ObserverCallback} observer The observer to be removed
     * @param {string} property The key/property the observer no longer wants notifications for
     */
    removeObserverForProperty(observer, property) {
        var observersKey = "$$observers$$";

        var allObservers = this[observersKey];
        if (allObservers == null) {
            // We might've been invoked before a call to add
            return;
        }
        var observers = allObservers[property];
        if (observers == null) {
            // ditto above
            return;
        }
        var observerIdx = observers.indexOf(observer);
        if (observerIdx != -1) {
            observers.splice(observerIdx, 1);
        }

        if (observers.length > 0) {
            return;
        }

        var automaticKey = "automaticallyNotifiesObserversOf";
        automaticKey += property.substring(0, 1).toUpperCase() + property.substring(1);
        if (this[automaticKey] == false) {
            return;
        }

        // No more observers left for this property
        delete allObservers[property];

        var privateKey = "$$private$$";
        var originalConfigKey = "$$" + property + "$$";

        // Try to restore the original property
        var orig = this[privateKey][originalConfigKey];
        if (typeof orig == "object") {
            // Ensure it has the latest value
            if (property in this[privateKey]) {
                orig.value = this[privateKey][property];
                delete this[privateKey][property];
            }

            // Restore it
            Object.defineProperty(this, property, orig);
        }
        delete this[privateKey][originalConfigKey];
    }

    addObserverForKeyPath(observer, keyPath) {
        const path = keyPath.split(".");
        const len = path.length;

        // We store the keypath and observer to handle removals
        // And the stack to deal with value propagation
        const context = {
            keyPath,
            observer,
            stack: []
        };

        // Helper to propagate a change from one entry to the next
        const propagate = (value, nextIdx) => {
            if (nextIdx < len) {
                context.stack[nextIdx].target = value;
                return;
            }

            if (typeof observer == "function") {
                observer(this, keyPath, value);
            }
            else {
                observer.observePropertyChanged.call(observer, this, keyPath, value);
            }
        }

        // Walk through all the keypaths populating the context's stack
        for (let idx=0; idx<len; idx+=1) {
            const property = path[idx];
            const observer = new ObservableObject.KeyPathHelper(property, propagate, idx + 1);
            context.stack.push(observer);
        }

        // And kick things off..
        context.stack[0].target = this;

        // Store the context...
        const keyPathContext = "$$keyPathContext$$";
        if (this[keyPathContext] == null) {
            Object.defineProperty(this, keyPathContext, {
                enumerable: false,
                configurable: false,
                writable: true,
                value: [],
            });
        }
        this[keyPathContext].push(context);
    }
    removeObserverForKeyPath(observer, keyPath) {
        const path = keyPath.split(".");

        const keyPathContext = "$$keyPathContext$$";
        const entries = this[keyPathContext] ?? [];

        const context = entries.find(entry =>
            (entry.observer == observer) &&
            (entry.keyPath == keyPath)
        );

        if (context != null) {
            // Tear things down
            context.stack.forEach(entry => {
                entry.destroy();
            })

            const index = entries.indexOf(context);
            entries.splice(index, 1);
        }
    }
    bind(keypath, toObject, property, transformer=null) {
        if (property == null && IsKindOf(toObject, Function) == false) {
            console.error("Cannot bind to an object without a property to set");
            debugger;
            return;
        }

        const observer = (obj, key, val) => {
            let value = val;
            if (transformer != null) {
                value = transformer(value);
            }

            if (property == null) {
                toObject(value);
                return;
            }

            const path = property.split(".");
            let target = toObject;
            for (let idx=0; idx<path.length-1; idx+=1) {
                target = target[path[idx]];
                if (target == null) {
                    return;
                }
            }
            target[path[path.length-1]] = value;
        };
        this.addObserverForKeyPath(observer, keypath);

        const unbind = () => this.removeObserverForKeyPath(observer, keypath);
        return unbind;
    }
}

ObservableObject.KeyPathHelper = class {
    constructor(property, onChange, onChangeContext) {
        this.property = property;
        this.onChange = onChange;
        this.onChangeContext = onChangeContext;
    }
    destroy() {
        const target = this._target;
        if (target != null) {
            target.removeObserverForProperty(this, this.property);
            this._target = null;
        }
    }
    get target() {
        return this._target;
    }
    set target(target) {
        const previous = this._target;
        if (target == previous) {
            return;
        }

        const property = this.property;
        if (previous != null) {
            previous.removeObserverForProperty(this, property);
        }
        this._target = target;
        if (target != null) {
            target.addObserverForProperty(this, property);
        }
        const value = (target ? target[property] : null);
        this.onChange(value, this.onChangeContext);
    }
    observePropertyChanged(obj, key, val) {
        this.onChange(obj[key], this.onChangeContext);
    }
}
