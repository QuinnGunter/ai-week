//
//  nametag_fields_sheet.js
//  mmhmm
//
//  Created by Seth Hitchings on 10/30/2025
//  Copyright 2025 mmhmm inc. All rights reserved.
//

class NametagFieldsSheet extends ActionSheet {

    constructor(title, subtitle) {
        const container = document.createElement("div");
        super(LocalizedString("Set up your name tag"), container, "min(400px, 90vw)", false, true);

        this.populateContainer(container, title, subtitle);
    }

    displayAsModal() {
        super.displayAsModal();
        this.setInitialFocus(this.contents);
        this.addEventListeners();
    }

    setInitialFocus(container) {
        const input = container.querySelector("input[type='text']");
        input?.focus();
    }

    addEventListeners() {
        // If the user types enter or escape, dismiss the sheet
        this.contents.addEventListener("keydown", (event) => {
            if (event.key === "Enter" || event.key === "Escape") {
                event.preventDefault();
                this.dismiss();
            }
        });
    }

    populateContainer(container, title, subtitle) {
        const inputs = document.createElement("div");
        inputs.classList.add("flex", "flex-col", "w-full", "p-6", "gap-6", "border-top");
        container.appendChild(inputs);

        inputs.appendChild(this.createTitleInput(title));
        inputs.appendChild(this.createSubtitleInput(subtitle));

        container.appendChild(this.createFooter());
    }

    createTitleInput(title) {
        return this.createTextInput(LocalizedString("Top line"), "title", "name", title);
    }

    createSubtitleInput(subtitle) {
        return this.createTextInput(LocalizedString("Bottom line"), "subtitle", null, subtitle);
    }

    createTextInput(labelText, name, autocomplete, value) {
        const container = document.createElement("div");
        container.classList.add("flex", "flex-col", "w-full", "justify-start");

        const label = document.createElement("label");
        label.innerText = labelText;
        label.htmlFor = name;
        container.appendChild(label);

        const input = document.createElement("input");
        input.type = "text";
        input.name = name;
        input.id = name;
        input.value = value ?? "";
        input.autocomplete = autocomplete ?? "off";
        input.spellcheck = false;
        container.appendChild(input);

        this[`${name}Input`] = input;

        return container;
    }

    createFooter() {
        const footer = document.createElement("div");
        footer.classList.add("flex", "flex-row", "w-full", "justify-end", "p-6", "border-top");

        const button = document.createElement("button");
        button.innerText = LocalizedString("Done");
        button.className = "capsule";
        button.addEventListener("click", () => this.dismiss());
        footer.appendChild(button);

        return footer;
    }
}
