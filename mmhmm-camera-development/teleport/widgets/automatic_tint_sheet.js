//
//  message_sheet.js
//  mmhmm
//
//  Created by Chris Hinkle on 3/17/2025.
//  Copyright 2025 mmhmm inc. All rights reserved.
//

// A debug panel to show how Automatic Tint is working
class AutomaticTintSheet extends ActionSheet {
    constructor(closable = false, width = 400) {
        var container = document.createElement("div");
        container.className = "automatic_tint_dialog";

        super("Automatic Tint Debug", container, width, false, closable);
        this.sheet.classList.add("autotint_sheet");

        const canvas = document.createElement("canvas");
        canvas.width = 192;
        canvas.height = 108;
        this.autoTintCanvas = canvas;

        this.automaticColorSelector = new AutomaticColorSelector();

        this.detectedPaints = [];
        this.selectedPaints = [];
        this.generatedPalettes = [];

        this.populateContainer(container);
    }

    get actionButton() {
        return this._actionButton;
    }

    displayAsModal() {
        super.displayAsModal();
        var actionButton = this._actionButton;
        if (actionButton != null) {
            actionButton.focus();
        }
    }

    selectColors() {
        this.automaticColorSelector.generateAutomaticPaints( this.autoTintCanvas ).then( result => {
            this.detectedPaints = result[ 0 ];
            this.selectedPaints = result[ 1 ];
            this.generatedPalettes = result[ 2 ];
            this.populatePalette();
        } );
    }

    populatePalette( ){

        //clear lists
        this.paletteList.innerHTML = '';
        this.selectedList.innerHTML = '';
        this.detectedList.innerHTML = '';

        //detected
        this.detectedPaints.forEach((entry, idx) => {
            var button = document.createElement("div");
            button.classList.add("option");
            button.title = entry.title;

            var paint = entry.paint;
            if (paint != null) {
                button.style.background = paint.toCSS(false);

                const border = document.createElement("div");
                border.classList.add("border");
                button.appendChild(border);
            }

            this.detectedList.appendChild(button);

        });

        //selected
        this.selectedPaints.forEach((entry, idx) => {
            var button = document.createElement("button");
            button.classList.add("option");
            button.title = entry.title;

            var paint = entry.paint;
            if (paint != null) {
                button.style.background = paint.toCSS(false);

                const border = document.createElement("div");
                border.classList.add("border");
                button.appendChild(border);

                button.onclick = ( ) => {
                    gApp.localPresenter.backgroundPaint = paint;
                }
            }

            this.selectedList.appendChild(button);

        });

        //generated palettes
        this.generatedPalettes.forEach( (entry, ids ) => {

            var list = document.createElement("div");
            list.className = "colors";

            const label = document.createElement("div");
            label.innerText = entry.name;
            list.appendChild(label);

            var button = document.createElement("button");
            button.classList.add("option");
            button.title = entry.name;
            button.style.background = entry.paint.toCSS(false);
            const border = document.createElement("div");
            border.classList.add("border");

            button.onclick = ( ) => {
                gApp.localPresenter.backgroundPaint = entry.paint;
            }

            button.appendChild(border);

            list.appendChild(button);
            this.paletteList.appendChild(list);

        } );

    }
    populateContainer(container) {

        var selectButton = document.createElement("button");
        selectButton.innerText = LocalizedString("Select Colors / Generate Palette");
        selectButton.className = "capsule";
        selectButton.addEventListener("click", _ => {
            this.selectColors();
        });
        container.appendChild(selectButton);

        container.appendChild(this.autoTintCanvas);

        const detectedLabel = document.createElement("div");
        detectedLabel.innerText = LocalizedString("Detected colors");
        container.appendChild(detectedLabel);

        var detectedList = document.createElement("div");
        detectedList.className = "colors";
        container.appendChild(detectedList);
        this.detectedList = detectedList;

        const paletteLabel = document.createElement("div");
        paletteLabel.innerText = LocalizedString("Selected colors (Stabilized, select one to (re)generate palettes)");
        container.appendChild(paletteLabel);

        var selectedList = document.createElement("div");
        selectedList.className = "colors";
        container.appendChild(selectedList);
        this.selectedList = selectedList;

        const palettesLabel = document.createElement("div");
        palettesLabel.innerText = LocalizedString("Generated Palettes");
        container.appendChild(palettesLabel);

        var paletteList = document.createElement("div");
        container.appendChild(paletteList);
        this.paletteList = paletteList;

        this.populatePalette( );


        var footer = document.createElement("div");
        footer.className = "footer";
        container.appendChild(footer);


        var action = document.createElement("button");
        action.innerText = LocalizedString("Close");
        action.className = "capsule";
        action.addEventListener("click", _ => {
            this.dismiss();
        });
        this._actionButton = action;
        footer.appendChild(action);
    }
}

function ShowAutomaticTintDialog(target ) {
    var sheet = new AutomaticTintSheet();
    if (target != null) {
        sheet.displayFrom(target);
    } else {
        sheet.displayAsModal();
    }
    return sheet;
}