//
//  chroma_threshold.js
//  mmhmm
//
//  Created by Steve White on 8/4/22.
//  Copyright © 2022 mmhmm, inc. All rights reserved.
//

class ChromaThresholdControl {
    constructor(chromaFilter) {
        this.chromaFilter = chromaFilter;

        chromaFilter.addObserverForProperty(this, "rangeLow");
        chromaFilter.addObserverForProperty(this, "rangeHigh");
        chromaFilter.addObserverForProperty(this, "keyRGB");
    }
    get container() {
        var container = this._container;
        if (container != null) {
            return container;
        }
        container = document.createElement("div");

        var chromaFilter = this.chromaFilter;

        // Color selection
        var colorSectionHeader = document.createElement("div");
        colorSectionHeader.className = "subheader";
        colorSectionHeader.innerText = LocalizedString("Color");
        container.appendChild(colorSectionHeader);

        var colorSectionWrapper = document.createElement("div");
        colorSectionWrapper.className = "chroma_colorpick";
        container.appendChild(colorSectionWrapper);

        var colorGreen = this.createOneColorControl(0.0, 1.0, 0.0, false)
        colorSectionWrapper.appendChild(colorGreen);

        var colorBlue = this.createOneColorControl(0.0, 0.0, 1.0, false)
        colorSectionWrapper.appendChild(colorBlue);

        var currentColor = chromaFilter.keyRGB;
        var colorCustom = this.createOneColorControl(currentColor[0], currentColor[1], currentColor[2], true)
        this.customColorPicker = colorCustom;
        colorSectionWrapper.appendChild(colorCustom);

        var colorCustomWheel = document.createElement('span');
        colorCustomWheel.className = 'chroma_colorwheel';
        colorSectionWrapper.appendChild(colorCustomWheel);

        this.colorControls = {
            green: colorGreen,
            blue: colorBlue,
            custom: colorCustom,
        };

        // Header label
        var header = document.createElement("div");
        header.className = "subheader";
        header.innerText = LocalizedString("Threshold");
        container.appendChild(header);

        // Container for sliders
        var wrapper = document.createElement("div");
        wrapper.className = "chroma_threshold";
        container.appendChild(wrapper);
        this.wrapper = wrapper;

        // Container for values
        var values = document.createElement("div");
        values.className = "chroma_threshold_values";
        container.appendChild(values);

        // Slider for rangeLow
        var sliderLow = document.createElement("input");
        sliderLow.type = "range";
        sliderLow.className = "low";
        sliderLow.id = "chroma_threshold_low"
        sliderLow.min = "1";
        sliderLow.max = "99";
        sliderLow.value = chromaFilter.rangeLow * 100;
        this.sliderLow = sliderLow;
        wrapper.appendChild(sliderLow);

        // Label for rangeLow
        var labelLow = document.createElement("label");
        labelLow.innerText = `${sliderLow.value}%`;
        labelLow.setAttribute("for", sliderLow.id);
        this.labelLow = labelLow;
        values.appendChild(labelLow);

        // Slider for rangeHigh
        var sliderHigh = document.createElement("input");
        sliderHigh.type = "range";
        sliderHigh.className = "high";
        sliderHigh.id = "chroma_threshold_high"
        sliderHigh.min = "2";
        sliderHigh.max = "100";
        sliderHigh.value = chromaFilter.rangeHigh * 100;
        this.sliderHigh = sliderHigh;
        wrapper.appendChild(sliderHigh);

        // Label for rangeHigh
        var labelHigh = document.createElement("label");
        labelHigh.innerText = `${sliderHigh.value}%`;
        labelHigh.setAttribute("for", sliderHigh.id);
        this.labelHigh = labelHigh;
        values.appendChild(labelHigh);

        var handleSliderChange = (active) => {
            var lowVal = parseInt(sliderLow.value);
            var highVal = parseInt(sliderHigh.value);

            if (highVal <= lowVal || lowVal >= highVal) {
                if (active == sliderHigh) {
                    highVal = lowVal + 1;
                    sliderHigh.value = highVal;
                }
                else {
                    lowVal = highVal - 1;
                    sliderLow.value = lowVal;
                }
            }

            labelLow.innerText = `${lowVal}%`;
            labelHigh.innerText = `${highVal}%`;
            this.updateChromaThresholdValues(lowVal / 100, highVal / 100);
        }

        sliderLow.addEventListener("input", (evt) => {
            handleSliderChange(sliderLow);
        })
        sliderHigh.addEventListener("input", (evt) => {
            handleSliderChange(sliderHigh);
        })

        this._container = container;
        this.updateGradientColor();
        return container;
    }
    createOneColorControl(red, green, blue, editable) {
        var hex = this.toHexColorString(red, green, blue);

        let colorPick = null;
        if (editable === false) {
            colorPick = document.createElement("input");
            colorPick.type = "button";
            colorPick.addEventListener("click", evt => {
                this.updateKeyColor(red, green, blue)
                this.updateSelectionState(colorPick);
            });
        }
        else {
            colorPick = document.createElement("input");
            colorPick.type = "color";
            colorPick.value = hex;

            colorPick.addEventListener("click", evt => {
               const newColor = colorPick.value;
               this.updateKeyColorFromHex(newColor);
               this.updateSelectionState(colorPick);
            })
            colorPick.addEventListener("input", evt => {
               // Update the button UI element as the user changes colors
               // in the picker
               const newColor = colorPick.value;
               colorPick.style.backgroundColor = newColor;
               this.updateKeyColorFromHex(newColor);
           });
        }

        colorPick.style.backgroundColor = hex;

        return colorPick
    }
    colorPickForColor(color) {
        const green = [0, 1, 0];
        const blue = [0, 0, 1];
        const colorControls = this.colorControls;

        if (EqualObjects(color, green) == true) {
            return colorControls.green;
        }
        else if (EqualObjects(color, blue) == true) {
            return colorControls.blue;
        }
        else {
            return colorControls.custom;
        }
    }
    updateSelectionState(selectedColorPick) {
        const colorPickContainer = this._container.querySelector('.chroma_colorpick');
        const colorPicks = colorPickContainer.querySelectorAll('input');
        if (selectedColorPick == null) {
            selectedColorPick = this.colorPickForColor(this.chromaFilter.keyRGB);
        }

        colorPicks.forEach((colorPick) => {
            if (colorPick === selectedColorPick) {
                colorPick.classList.add("selected_color");
            } else {
                colorPick.classList.remove("selected_color");
            }
        });
    }
    updateKeyColor(red, green, blue) {
        var chromaFilter = this.chromaFilter;
        chromaFilter.keyRGB = [red, green, blue]
    }
    updateKeyColorFromHex(colorHex) {
       const r = parseInt("0x" + colorHex.slice(1,3), 16)
       const g = parseInt("0x" + colorHex.slice(3,5), 16)
       const b = parseInt("0x" + colorHex.slice(5,7), 16)
       this.updateKeyColor(r / 255.0, g / 255.0, b / 255.0)
    }
    updateChromaThresholdValues(low, high) {
        var chromaFilter = this.chromaFilter;
        chromaFilter.rangeLow = low;
        chromaFilter.rangeHigh = high;
    }
    updateGradientColor() {
        var chromaFilter = this.chromaFilter;
        var keyRGB = chromaFilter.keyRGB;
        var red = Math.round(keyRGB[0] * 255);
        var green = Math.round(keyRGB[1] * 255);
        var blue = Math.round(keyRGB[2] * 255);
        this.wrapper.style.setProperty("--chroma_color", `rgb(${red}, ${green}, ${blue})`);
    }
    updateCustomColor() {
        var chromaFilter = this.chromaFilter;
        var keyRGB = chromaFilter.keyRGB;
        var currentColor = this.toHexColorString(keyRGB[0], keyRGB[1], keyRGB[2]);

        // If the current color is our hardcoded green or blue, ignore the change
        // Otherwise, update the picker to reflect the custom color
        if (currentColor == "#00ff00" || currentColor == "#0000ff") {
            return;
        }

        var customColorPicker = this.customColorPicker;
        customColorPicker.value = currentColor;
        customColorPicker.style.backgroundColor = currentColor;
    }
    toHexColorString(red, green, blue) {
        var colorToHex = (color) => {
            color = color * 255;
            var hex = color.toString(16);
            return hex.length == 1 ? "0" + hex : hex;
        }
        return "#" + colorToHex(red) + colorToHex(green) + colorToHex(blue);
    }
    observePropertyChanged(obj, key, val) {
        if (this._container == null) {
            return;
        }
        if (key == "keyRGB") {
            this.updateGradientColor();
            this.updateCustomColor();
            this.updateSelectionState();
        }
        else if (key == "rangeLow") {
            this.sliderLow.value = val * 100;
            this.labelLow.innerText = `${this.sliderLow.value}%`;
        }
        else {
            this.sliderHigh.value = val * 100;
            this.labelHigh.innerText = `${this.sliderHigh.value}%`;
        }
    }
}
