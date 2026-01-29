//
//  optionlist_sheet.js
//  mmhmm
//
//  Created by Steve White on 4/25/22.
//  Copyright © 2022 mmhmm, inc. All rights reserved.
//

class OptionListSheet extends ActionSheet {
    constructor(title, actionButtonTitle = null) {
        var container = document.createElement("div");
        container.className = "textfield_dialog";

        super(title, container, "fit-content", false, true);

        this.populateContainer(container, actionButtonTitle);
        this.contents = container;
    }
    addOption(title, value, selected = false) {
        var option = document.createElement("option");
        option.value = value;
        option.innerText = title;
        this.selectList.appendChild(option);
        if (selected == true) {
            // XXX: implement me someday
        }
        return option;
    }
    get selectedOption() {
        var selectList = this.selectList;
        var selectedIndex = selectList.selectedIndex;
        if (selectedIndex < 0 || selectedIndex == null) {
            return null;
        }
        return selectList.options[selectedIndex];
    }
    get selectList() {
        return this._selectList;
    }
    get header() {
        return this._header;
    }
    get cancelButton() {
        return this._cancelButton;
    }
    get actionButton() {
        return this._actionButton;
    }
    populateContainer(container, actionButtonTitle) {
        var header = document.createElement("label");
        container.appendChild(header);
        this._header = header;

        var selectList = document.createElement("select");
        container.appendChild(selectList);
        this._selectList = selectList;

        var buttons = document.createElement("div");
        buttons.className = "buttons";
        container.appendChild(buttons);

        var cancel = document.createElement("button");
        cancel.innerText = LocalizedString("Cancel");
        cancel.className = "capsule secondary";
        buttons.appendChild(cancel);
        this._cancelButton = cancel;

        var action = document.createElement("button");

        var title = actionButtonTitle;
        if (title == null) {
            title = LocalizedString("Save Changes");
        }
        action.innerText = title;
        action.className = "capsule";
        buttons.appendChild(action);
        this._actionButton = action;
    }
}
