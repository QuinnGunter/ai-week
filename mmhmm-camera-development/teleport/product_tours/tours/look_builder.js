//
//  look_builder.js
//  mmhmm
//
//  Created by Seth Hitchings on 8/28/2025.
//  Copyright 2025 mmhmm inc. All rights reserved.
//

class LookBuilderTour extends ProductTour {

    #looksPane;

    constructor(looksPane) {
        // This tour isn't shown in the quick tours dialog,
        // so it doesn't need an icon, title, or description
        super();

        this.#looksPane = looksPane;

        this.addCoachmarksToProductTour(this.buildCoachmarks());
    }

    showToursMenuOnCompletion() {
        return false;
    }

    /* Coachmarks */

    buildCoachmarks() {
        return [
            this.tintCoachmark(),
            this.patternCoachmark(),
            this.useThisLookCoachmark(),
        ];
    }

    tintCoachmark() {
        return {
            element: () => this.#getLookEditorOptionsPanel(),
            instructions: LocalizedString("Choose a color to tint your background."),
            position: "right",
            beforeShow: () => this.#ensureTintOptionsPanelVisible(),
            validity: [ this.#tintOptionsPanelVisibleTest() ],
        }
    }

    patternCoachmark() {
        return {
            element: () => this.#getLookEditorOptionsPanel(),
            instructions: LocalizedString("Choose a pattern to apply to your background."),
            position: "right",
            beforeShow: async () => await this.#ensurePatternOptionsPanelVisible(),
            validity: [ this.#patternOptionsPanelVisibleTest() ],
        }
    }

    useThisLookCoachmark() {
        return {
            element: () => this.#getUseThisLookButton(),
            instructions: LocalizedString("Click below to get the app and use your look on Zoom, Teams, Meet and other video apps."),
            position: "top",
        }
    }

    /* Helpers */

    #getLookEditorOptionsPanel() {
        return this.#looksPane.lookEditorOptionsPanel.container;
    }

    #getUseThisLookButton() {
        return document.querySelector('button[data-action="save-demo-look"]');
    }

    /* Before Show Handlers */

    #ensureTintOptionsPanelVisible() {
        this.#looksPane.showTintOptions();
    }

    async #ensurePatternOptionsPanelVisible() {
        await this.#looksPane.showPatternOptions();
    }

    /* Validity tests */

    #tintOptionsPanelVisibleTest() {
        return {
            target: () => this.#looksPane,
            property: "lookEditorOptionsPanel",
            predicate: (target, value, isInitialValue) => value != null && value instanceof TintLayerOptions,
            advanceToNext: false,
        };
    }

    #patternOptionsPanelVisibleTest() {
        return {
            target: () => this.#looksPane,
            property: "lookEditorOptionsPanel",
            predicate: (target, value, isInitialValue) => value != null && value instanceof PatternLayerOptions,
            advanceToNext: false,
        };
    }
}
