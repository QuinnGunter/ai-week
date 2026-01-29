//
//  textfield_sheet.js
//  mmhmm
//
//  Created by Steve White on 4/25/22.
//  Copyright © 2022 mmhmm, inc. All rights reserved.
//

class TextFieldSheet extends ActionSheet {
    constructor(title, disableActionValidation, useTextArea=false) {
        var container = document.createElement("div");
        container.className = "textfield_dialog";

        super(title, container, "fit-content", false, false);

        this.disableActionValidation = (disableActionValidation == true);
        this.populateContainer(container, useTextArea);
        this.contents = container;
    }
    get textfield() {
        return this._textfield;
    }
    get cancelButton() {
        return this._cancelButton;
    }
    get actionButton() {
        return this._actionButton;
    }
    populateContainer(container, useTextArea) {
        var textfield;
        if (useTextArea) {
            textfield = document.createElement("textarea");
        } else {
            textfield = document.createElement("input");
            textfield.type = "text";
        }

        textfield.autocomplete = "off";
        container.appendChild(textfield);
        this._textfield = textfield;

        var buttons = document.createElement("div");
        buttons.className = "buttons";
        container.appendChild(buttons);

        var cancel = document.createElement("button");
        cancel.innerText = LocalizedString("Cancel");
        cancel.className = "capsule secondary";
        buttons.appendChild(cancel);
        this._cancelButton = cancel;

        var action = document.createElement("button");
        action.innerText = LocalizedString("Save Changes");
        action.className = "capsule";
        buttons.appendChild(action);
        this._actionButton = action;

        textfield.addEventListener("keyup", evt => {
            if (textfield.selectionStart != textfield.selectionEnd) {
                // In limited testing, using Japanese input on macOS
                // if I navigate the autocomplete using up/down arrows,
                // the selection start/end will differ.
                // So this test is for that – this way the person can
                // press escape to dismiss their autocomplete, or enter to
                // select an item from autocomplete, without
                // dismissing/submitting the textfield
                return;
            }

            var code = evt.code;
            if (code == "Escape") {
                var clickEvent = new Event("click");
                cancel.dispatchEvent(clickEvent);
            }
        });

        var changeTimeout = null;
        textfield.addEventListener("blur", evt => {
            if (changeTimeout != null) {
                window.clearTimeout(changeTimeout);
                changeTimeout = null;
            }
        });

        textfield.addEventListener("change", evt => {
            if (changeTimeout != null) {
                window.clearTimeout(changeTimeout);
            }
            changeTimeout = window.setTimeout(() => {
                var clickEvent = new Event("click");
                action.dispatchEvent(clickEvent);
            }, 1);
        });

        if (this.disableActionValidation != true) {
            textfield.addEventListener("input", evt => {
                var value = textfield.value;
                if (value == null || value.trim().length == 0) {
                    action.disabled = true;
                }
                else {
                    action.disabled = false;
                }
            })
        }
    }
    doDisplayHooks(focusDelayMS = 0) {
        var textfield = this.textfield;
        if (focusDelayMS <= 0) {
            textfield.focus();
        }
        else {
            window.setTimeout(() => textfield.focus(), focusDelayMS);
        }
        if (this.disableActionValidation != true) {
            if (textfield.value == null || textfield.value == "") {
                this.actionButton.disabled = true;
            }
        }
    }
    displayFrom(sender) {
        super.displayFrom(sender);
        this.doDisplayHooks(500);
    }
    displayAsModal() {
        super.displayAsModal();
        this.doDisplayHooks();
    }
    addCancelHandler(handler) {
        this.cancelButton.addEventListener("click", handler, {once: true});
    }
    addActionHandler(handler, once = true) {
        this.actionButton.addEventListener("click", handler, {once});
    }
}
