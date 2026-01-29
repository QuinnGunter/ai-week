# Customizable Color Picker


- https://simonwep.github.io/pickr/

## Pulled from:

<script src="https://cdn.jsdelivr.net/npm/@simonwep/pickr/dist/pickr.es5.min.js"></script>

<link
    rel="stylesheet"
    href="https://cdn.jsdelivr.net/npm/@simonwep/pickr/dist/themes/nano.min.css"
/>


## Theming

We're starting with the `nano` theme and apply some customizations to it.

NOTE: this is currently only being used by the companion app so extra theming is
being done in `mini.css`

## Example Usage
```ts
const pickr = Pickr.create({
    // el and `useAsButton` makes so that a button that is on the page becomes the trigger for the color picker
    el: "#color-picker-button",
    useAsButton: true,
    theme: "nano",
    swatches: ['rgba(255, 0, 0, 0.5)'],
    components: {
        // Main components
        preview: true,
        opacity: true,
        hue: true,
        // Input / output Options
        interaction: {
            hex: true,
            rgba: true,
            input: true,
            clear: true,
            save: true
        }
    }
});

// NOTE: if loading this from an ACTION SHEET there are a couple of things to do to make sure the action sheet doesn't close when clicking on the color picker
pickr.on("show", () => {
    // stop action sheet from listening to clicks to avoid hiding it when clicking on the color picker
    this.stopClickListener();

    // put it above the action sheet - can't do this with css
    const zIndex = GetWindowMaxZIndex();
    pickr.getRoot().app.style.zIndex = zIndex + 1;
});

pickr.on("save", (pickrColor) => {
    // do things with the color
    pickr.hide();
});

pickr.on("hide", () => {
    // after hiding the color picker
    // let action sheet close when clicking outside of it
    this.startClickListener();
});
```
