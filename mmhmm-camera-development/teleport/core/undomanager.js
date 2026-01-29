//
//  core/undomanager.js
//  mmhmm
//
//  Created by Steve White on 11/16/23.
//  Copyright © 2023 mmhmm, inc. All rights reserved.
//

class UndoManagerGrouping {
    constructor() {
        this.entries = [];
    }
}

class UndoManager extends ObservableObject {
    constructor() {
        super();

        this._undoStack = [];
        this._redoStack = [];

        this._undoGrouping = 0;
        this._undoDisabled = 0;

        this.levelsOfUndo = 500;

        this.isUndoing = false;
        this.isRedoing = false;
        this.automaticallyNotifiesObserversOfCanUndo = false;
        this.automaticallyNotifiesObserversOfCanRedo = false;

        if (!App.isHybrid) {
            gApp.registerKeyboardObserver(this);
        }
    }

    handleKeyboardEvent (event) {
        const OS = getPlatform();

        switch (OS) {
            case Platform.MACOS:
            case Platform.IOS:
                if (eventKeysMatch(event, '⌘+z')) {
                    this.undo();
                    return true;
                }
                if (eventKeysMatch(event, '⌘+shift+z')) {
                    this.redo();
                    return true;
                }
                break;
            case Platform.WINDOWS:
            case Platform.ANDROID:
            case Platform.LINUX:
                if (eventKeysMatch(event, 'ctrl+z')) {
                    this.undo();
                    return true;
                }
                if (eventKeysMatch(event, 'ctrl+shift+z')) {
                    this.redo();
                    return true;
                }
                break;
        }
        return false;
    }

    async _popAndInvokeFromStack(stack) {
        var top = stack.pop();
        if (IsKindOf(top, UndoManagerGrouping) == false) {
            await this._invokeStackEntry(top);
            return;
        }

        this.beginUndoGrouping();

        var entries = top.entries;
        var numEntries = entries.length;
        for (var idx=numEntries-1; idx>=0; idx-=1) {
            var entry = entries[idx];
            await this._invokeStackEntry(entry);
        }

        this.endUndoGrouping();
    }
    async _invokeStackEntry(entry) {
        var context = entry.context;
        if (context != null) {
            var presentation = context.presentation;
            if (presentation != null) {
                var dataStore = gApp.dataStore;
                if (dataStore.activePresentation?.identifier != presentation.identifier) {
                    dataStore.activePresentation = presentation;
                }
            }

            var slide = context.slide;
            var stage = gApp.stage;
            if (slide == null) {
                stage.slide = null;
            }
            else if (stage.slide?.identifier != slide.identifier) {
                stage.slide = slide;
            }

            var selection = context.selection;
            if (stage.selectedObject != selection) {
                stage.selectedObject = selection;
            }
        }

        var handler = entry.handler;
        if (handler != null) {
            let result = handler();
            if (IsKindOf(result, Promise) == true) {
                await result;
            }
            return;
        }

        var target = entry.target;
        var slot = entry.slot;
        var args = entry.args;

        var propDesc = Object.getOwnPropertyDescriptor(target, slot);
        var parent = target;
        while (propDesc == null) {
            // Property may be defined on a superclass, so walk up
            // until we hit ourself
            parent = Object.getPrototypeOf(parent);
            if (parent == null || parent.constructor == Object) {
                break;
            }
            propDesc = Object.getOwnPropertyDescriptor(parent, slot);
        }

        if (propDesc == null) {
            console.error("Couldn't figure out how to handle entry", entry);
            if (gLocalDeployment == true) {
                debugger;
            }
        }
        else {
            if (propDesc.set != null) {
                target[slot] = args[0];
            }
            else if (propDesc.value != null) {
                let result = target[slot].apply(target, args);
                if (IsKindOf(result, Promise) == true) {
                    await result;
                }
            }
            else {
                console.error("Couldn't figure out how to handle descriptor", propDesc, entry);
                if (gLocalDeployment == true) {
                    debugger;
                }
            }
        }
    }
    _removeEntriesMatching(predicate) {
        const removeMatchesFrom = (bucket) => {
            const matches = bucket.filter(entry => predicate(entry));
            const indices = matches.map(item => bucket.indexOf(item));
            indices.reverse().forEach(index => bucket.splice(index, 1));
            return bucket.length;
        }

        const stacks = [
            [ this._undoStack, 'canUndo' ],
            [ this._redoStack, 'canRedo' ],
        ];

        stacks.forEach(pair => {
            const stack = pair[0];
            const kvoKey = pair[1];

            const before = stack.length;
            const after = removeMatchesFrom(stack);

            if (before != after) {
                this.didChangeValueForProperty(this[kvoKey], kvoKey);
            }

            const groupings = stack.filter(entry => entry.entries != null);
            groupings.forEach(group => {
                const remaining = removeMatchesFrom(group.entries);
                if (remaining == 0) {
                    this.removeEntry(group);
                    if (group == this._undoGroupingEntry) {
                        this._undoGroupingEntry = null;
                    }
                }
            });
        })
    }
    removeAllActions() {
        this._removeEntriesMatching(entry => true);
    }
    removeAllActionsWithTarget(target) {
        this._removeEntriesMatching(entry => entry.target == target);
    }
    removeEntry(entry) {
        this._removeEntriesMatching(anEntry => anEntry == entry);
    }
    disableUndoRegistration() {
        this._undoDisabled += 1;
    }
    enableUndoRegistration() {
        this._undoDisabled -= 1;
        if (this._undoDisabled < 0) {
            console.error("enableUndoRegistration called too many times");
            if (gLocalDeployment == true) {
                debugger;
            }
            this._undoDisabled = 0;
        }
    }
    get undoRegistrationEnabled() {
        return (this._undoDisabled == 0);
    }
    beginUndoGrouping() {
        this._undoGrouping += 1;
        if (this._undoGrouping == 1) {
            this.didChangeValueForProperty(this.canUndo, "canUndo");
            this.didChangeValueForProperty(this.canRedo, "canRedo");
        }
    }
    endUndoGrouping() {
        this._undoGrouping -= 1;
        if (this._undoGrouping < 0) {
            console.error("enableUndoRegistration called too many times");
            if (gLocalDeployment == true) {
                debugger;
            }
            this._undoGrouping = 0;
        }
        if (this._undoGrouping > 0) {
            return;
        }

        const grouping = this._undoGroupingEntry;
        if (grouping != null && grouping.entries.length == 0) {
            this.removeEntry(grouping);
        }
        delete this._undoGroupingEntry;
        this.didChangeValueForProperty(this.canUndo, "canUndo");
        this.didChangeValueForProperty(this.canRedo, "canRedo");
    }
    undo() {
        if (this.canUndo == false || this.isUndoing == true || this.isRedoing == true) {
            return;
        }

        Analytics.Log("application.undo");

        this.isUndoing = true;
        this._popAndInvokeFromStack(this._undoStack).finally(() => {
            this.didChangeValueForProperty(this.canUndo, "canUndo");
            this.isUndoing = false;
        });
    }
    get canUndo() {
        return (this._undoStack.length > 0 && this._undoGrouping == 0);
    }
    redo() {
        if (this.canRedo == false || this.isRedoing == true || this.isUndoing == true) {
            return;
        }

        Analytics.Log("application.redo");

        this.isRedoing = true;
        this._popAndInvokeFromStack(this._redoStack).finally(() => {
            this.didChangeValueForProperty(this.canRedo, "canRedo");
            this.isRedoing = false;
        });
    }
    get canRedo() {
        return (this._redoStack.length > 0 && this._undoGrouping == 0);
    }
    registerUndoWithTargetBlock(target, handler) {
        return this._registerUndoWithEntry({target, handler});
    }
    registerUndoWithTargetSlotArguments(target, slot, ...args) {
        return this._registerUndoWithEntry({target, slot, args});
    }
    _registerUndoWithEntry(entry) {
        if (this.undoRegistrationEnabled == false) {
            return null;
        }

        var context = {};
        if (window.gApp != null) {
            var dataStore = gApp.dataStore;
            var stage = gApp.stage;
            context.presentation = dataStore.activePresentation;
            context.slide = stage.slide;
            context.selection = stage.selectedObject;
        }
        entry.context = context;

        var stack = null;
        var kvoKey = null;
        if (this.isUndoing == true) {
            stack = this._redoStack;
            kvoKey = "canRedo";
        }
        else {
            stack = this._undoStack;
            kvoKey = "canUndo";
            if (this.isRedoing == false && this._redoStack.length > 0) {
                this._redoStack = [];
            }
        }

        if (this._undoGrouping == 0) {
            stack.push(entry);
        }
        else {
            var grouping = this._undoGroupingEntry;
            if (grouping == null) {
                grouping = new UndoManagerGrouping();
                this._undoGroupingEntry = grouping;
                stack.push(grouping);
            }
            grouping.entries.push(entry);
        }

        if (stack.length > this.levelsOfUndo) {
            stack.shift();
        }

        this.didChangeValueForProperty(this[kvoKey], kvoKey);
        return entry;
    }
}
