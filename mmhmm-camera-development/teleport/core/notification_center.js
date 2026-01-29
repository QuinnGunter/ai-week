//
//  notification_center.js
//  mmhmm
//
//  Created by Steve White on 12/22/21.
//  Copyright © 2021 mmhmm, inc. All rights reserved.
//

class NotificationCenter {
    static AT_MIDNIGHT = "AT_MIDNIGHT";
    static FOCUS_IN = "FOCUS_IN";

    constructor() {
        this.observers = {}
    }
    postNotification(name, object, info) {
        const observers = this.observers[name];
        if (observers == null) {
            return;
        }

        // Make a copy of the observers array in case it is modified while we're iterating
        const toNotify = observers.slice();
        toNotify.forEach(observer => {
            const obj = observer.object;
            if (obj == null || obj == object) {
                observer.callback.call(observer.context, info, name, object);
            }
        })
    }
    addObserver(name, object, callback, context = null) {
        if (name == null) {
            console.error("No name specified");
            console.trace();
            return;
        }
        var observers = this.observers[name];
        if (observers == null) {
            observers = [];
            this.observers[name] = observers;
        }
        observers.push({ object, callback, context });
        return () => {
            this.removeObserver(name, object, callback, context);
        }
    }
    removeObserver(name, object, callback, context = null) {
        var observers = this.observers[name];
        if (observers == null) {
            return;
        }

        var entry = observers.find(info => info.object == object && info.callback == callback && info.context == context);
        if (entry == null) {
            console.error("Couldn't find registered observer", {name, object, callback, context});
            debugger;
        }
        else {
            var index = observers.indexOf(entry);
            if (index == -1) {
                console.error("observers.find returned entry that indexOf can't find??", observers, entry, index);
            }
            else {
                observers.splice(index, 1);
            }
        }
        if (observers.length == 0) {
            delete this.observers[name];
        }
    }
}
NotificationCenter.default = new NotificationCenter();
