//
//  media/drawing/controls.js
//  mmhmm
//
//  Created by Steve White on 8/17/21.
//  Copyright © 2021 mmhmm, inc. All rights reserved.
//

class DrawingSlideControls {
    constructor(slide) {
        this.slide = slide;
        slide.addObserverForProperty(this, "penStyle");
        slide.addObserverForProperty(this, "color");

        this.createControlElement();
    }
    destroy() {
        var slide = this.slide;
        if (slide != null) {
            slide.removeObserverForProperty(this, "penStyle");
            slide.removeObserverForProperty(this, "color");
        }
    }
    createControlElement() {
        var slide = this.slide;

        var container = document.createElement("div");
        container.className = "drawing_controls";

        //
        // Pens segmented control
        //
        var penControl = document.createElement("span");
        penControl.className = "tabs";
        penControl.style = "margin-right: 8px"

        container.appendChild(penControl);

        this.penButtons = [];

        slide.pens.forEach(aPen => {
            var button = document.createElement("button");
            button.appendChild(aPen.icon);
            button.className = "tab";
            button.id = aPen.id;
            button.title = aPen.name;
            penControl.appendChild(button);
            this.penButtons.push(button);

            if (aPen == slide.penStyle) {
                AddClassNameToElement("selected", button);
            }

            button.addEventListener("click", evt => {
                var clicked = FirstAncestorWithTagName(evt.target, "BUTTON");
                if (clicked == null) {
                    return;
                }
                slide.penStyle = aPen;
            })
        })

        //
        // Color buttons
        //
        this.colorButtons = {};
        slide.colors.forEach(color => {
            var button = document.createElement("button");
            button.className = "sketch_color";
            if (color == slide.color) {
                AddClassNameToElement("selected", button);
            }
            button.style.backgroundColor = color;
            button.addEventListener("click", evt => {
                slide.color = color
            });
            container.appendChild(button);
            this.colorButtons[color] = button;
        })

        //
        // Clear button
        //
        var clear = document.createElement("button");
        clear.className = "capsule secondary";
        clear.style = "margin-left: 16px"
        clear.innerText = LocalizedString("Clear");
        clear.addEventListener("click", evt => {
            slide.clearCanvas();
        });
        container.appendChild(clear);

        this.element = container;
    }
    updateSelectedColor() {
        var color = this.slide.color;
        var buttons = this.colorButtons;
        for (var key in buttons) {
            var button = buttons[key];

            button.classList.toggle("selected", key == color);
        }
    }
    updateSelectedPen() {
        var penStyle = this.slide.penStyle;

        this.penButtons.forEach(aPenButton => {
            aPenButton.classList.toggle("selected", aPenButton.id == penStyle.id);
        })
    }
    observePropertyChanged(obj, key, val) {
        if (key == "penStyle") {
            this.updateSelectedPen();
        }
        else if (key == "color") {
            this.updateSelectedColor();
        }
    }
}
