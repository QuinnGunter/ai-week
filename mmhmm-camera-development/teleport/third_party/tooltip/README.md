# Tooltip based on:
https://atomiks.github.io/tippyjs


## Usage:
```js
createQuickRecordingButton() {
    const button =  this.createActionButton(
        AppIcons.Record(),
        LocalizedString("Record a quick video"),
        LocalizedString("Record your screen with just a few clicks"),
        _ => this.delegate.quickRecordingButtonClicked(),
        "quick_recording"
    );

    tippy(button, {
        animation: "scale",
        content: LocalizedString("Record your screen with just a few clicks"),
    });

    return button;
}

// Or by selector:
tippy('#singleElement', { content: 'Tooltip', });

```

More information at: https://atomiks.github.io/tippyjs/v6/getting-started/


## Files were imported and stored in this folder:

This is here as reference for version and where we got it from.

- popper.min.js     -- https://unpkg.com/@popperjs/core@2.11.8/dist/umd/popper.min.js
- tippy.min.js  -- https://unpkg.com/tippy.js@6.3.7/dist/tippy-bundle.umd.min.js
- scale.css         -- https://unpkg.com/tippy.js@6.3.7/animations/scale.css

