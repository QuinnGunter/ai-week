//
//  filters_ui.js
//  mmhmm
//
//  Created by Steve White on 8/9/21.
//  Copyright © 2021 mmhmm, inc. All rights reserved.
//

class RenderFilterParameterControl {
    constructor(filter, key, parameter, showAnnotations) {
        this.filter = filter;
        this.key = key;

        this.parameter = parameter;
        this.label = null;
        this.control = null;
        this.showAnnotations = showAnnotations || false;
    }
    get undoManager() {
        return gApp.undoManager;
    }
    attachToNode(parentNode, prefixID) {
        var param = this.parameter;
        var key = this.key;
        var controlID = "";
        if (prefixID != null) {
            controlID = prefixID;
        }
        controlID += key;

        var label = this.label;
        var control = this.control;
        if (label != null && control != null) {
            // Ensure we're using the requested prefix
            label.for = controlID;
            control.id = controlID;
            // And attach to the new parent
            parentNode.appendChild(label);
            parentNode.appendChild(control);
            return;
        }

        var filter = this.filter;
        var type = param.type;
        var name = param.name;
        label = null;
        var listeners = {};

        control = null;
        var wrapper = null;
        if (type == "range") {
            wrapper = document.createElement("div");
            wrapper.className = "slider_wrapper";
            wrapper.style.setProperty("--slider-length", "100%");

            if (this.showAnnotations == true) {
                label = document.createElement("div");

                var minTitle = param.minValueTitle;
                if (minTitle == null) {
                    minTitle = "min";
                }
                var minLabel = document.createElement("span");
                minLabel.style.float = "left";
                minLabel.innerText = minTitle;
                label.appendChild(minLabel);

                var maxLabel = document.createElement("span");
                maxLabel.style.float = "right";
                var maxTitle = param.maxValueTitle;
                if (maxTitle == null) {
                    maxTitle = "max";
                }
                maxLabel.innerText = maxTitle;
                label.appendChild(maxLabel);
            }

            control = document.createElement("input");
            control.type = "range";
            control.min = param.min * 100;
            control.max = param.max * 100;
            control.value = filter[key] * 100;
            wrapper.appendChild(control);
            UpdateStyledSliderFillAmount(control);

            listeners.mousedown = (evt) => {
                this.undoManager?.beginUndoGrouping();
            };
            listeners.mouseup = (evt) => {
                this.undoManager?.endUndoGrouping();
            };

            listeners.input = (evt) => {
                var current = control.value / 100;
                this.setFilterKeyValue(filter, key, current);
                UpdateStyledSliderFillAmount(control);
            };
        }
        else if (type == "select") {
            control = document.createElement("select");
            var values = param.values;
            values.forEach(aValue => {
                var option = document.createElement("option");
                option.innerText = aValue;
                control.appendChild(option);
            })
            control.selectedIndex = filter[key];
            listeners.change = evt => {
                this.setFilterKeyValue(filter, key, control.selectedIndex);
            };
        }

        if (control == null) {
            console.error("Failed to make a control for ", this.filter, this.key, this.parameter);
            return;
        }

        for (var aListenerKey in listeners) {
            control.addEventListener(aListenerKey, listeners[aListenerKey]);
        }
        this.listeners = listeners;

        if (label == null) {
            label = document.createElement("label");
            label.innerText = name;
            label.for = controlID;
        }
        parentNode.appendChild(label);

        control.id = controlID;

        this.label = label;
        this.control = control;

        this.filter.addObserverForProperty(this, key);

        if (wrapper != null) {
            parentNode.appendChild(wrapper);
        }
        else {
            parentNode.appendChild(control);
        }
    }
    detach() {
        var label = this.label;
        var control = this.control;
        if (label != null && control != null) {
            this.filter.removeObserverForProperty(this, key);
        }

        if (label != null && label.parentNode != null) {
            label.parentNode.removeChild(label);
            this.label = null;
        }
        if (control != null) {
            if (control.parentNode != null) {
                control.parentNode.removeChild(control);
            }

            var listeners = this.listeners;
            if (listeners != null) {
                for (var key in listeners) {
                    control.removeEventListener(key, listeners[key]);
                }
                this.listeners = null;
            }

            this.control = null;
        }
    }
    setFilterKeyValue(filter, key, value) {
        var previous = filter[key];
        filter[key] = value;

        this.undoManager?.registerUndoWithTargetSlotArguments(this, 'setFilterKeyValue', filter, key, previous);
    }
    observePropertyChanged(object, key, value) {
        if (this.onValueChange != null) {
            this.onValueChange();
        }
        var control = this.control;
        if (control == null) {
            return;
        }

        switch (control.tagName) {
            case "INPUT":
                var elemValue = Math.round(value * 100);
                if (elemValue != control.value) {
                    control.value = elemValue;
                    if (control.type == "range") {
                        UpdateStyledSliderFillAmount(control);
                    }
                }
                break;
            case "SELECT":
                if (control.selectedIndex != value) {
                    control.selectedIndex = value;
                }
                break;
        }
    }
}

RenderFilterParameterControl.controlsForFilter = function(aRenderFilter, showAnnotations) {
    var parameters = aRenderFilter.parameters;
    if (parameters == null) {
        return null;
    }

    var results = [];
    for (var key in parameters) {
        var param = parameters[key];
        if (param.configurable == false) {
            continue;
        }
        var control = new RenderFilterParameterControl(aRenderFilter, key, param, showAnnotations);
        results.push(control);
    }
    return results;
}
