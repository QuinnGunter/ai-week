//
//  confirm_sheet.js
//  mmhmm
//
//  Created by Steve White on 4/29/22.
//  Copyright © 2022 mmhmm, inc. All rights reserved.
//

// Abuse a text field dialog for now...
class ConfirmationSheet extends TextFieldSheet {
    constructor(titleText, messageText, confirmText) {
        super(titleText, true);

        let message = null;
        if (messageText.constructor == String) {
            message = document.createElement("div");
            message.innerText = messageText;
        } else {
            // Assume it's a DOM element
            message = messageText;
        }
        message.style.maxWidth = "320px";

        var textfield = this.textfield;
        textfield.parentNode.replaceChild(message, textfield);

        if (confirmText != null) {
            var action = this.actionButton;
            action.innerText = confirmText;
            AddClassNameToElement("destructive", action);
        }
    }
    displayAsModal() {
        super.displayAsModal();
        var actionButton = this._actionButton;
        if (actionButton != null) {
            actionButton.focus();
        }
    }
}
