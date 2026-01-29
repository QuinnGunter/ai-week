//
//  all_icons.js
//  mmhmm
//
//  Created by Jonathan Potter on 15 March 2024
//  Copyright 2024 mmhmm inc. All rights reserved.
//

// This is a dev modal for showing all of the icons
class AllIcons extends ActionSheet {
    /*
    <ul class="all_icons">
        <li><icon /></li>
        <li><icon /></li>
        ...
    </ul>
    */
    constructor() {
        const content = document.createElement("ul");
        content.classList.add("all_icons");

        const headerText = LocalizedString("All Icons");
        super(headerText, content, "min(85%, 930px)", true, true);

        this.sheet.style.height = "100%";
        this.container.style.height = "100%";

        content.style.display = "flex";
        content.style.flexFlow = "row wrap";
        content.style.listStyle = "none";
        content.style.fill = "var(--background-primary)";
        content.style.stroke = "var(--background-primary)";
        content.style["overflow-y"] = "auto";
        content.style["padding-bottom"] = "64px";

        this.populateIcons();
    }

    populateIcons () {
        const iconFunctions = Object.entries(AppIcons).filter(([key, iconFunction]) => {
            return key.startsWith("_") == false;
        });

        const elements = iconFunctions.map(([key, iconFunction]) => {
            const icon = iconFunction()

            const button = document.createElement("button");
            button.append(icon);
            button.title = key
            button.addEventListener("click", () => {
                navigator.clipboard.writeText(key);
            });

            const li = document.createElement("li");
            li.append(button);

            return li;
        })

        this.contents.append(...elements);
    }
}
