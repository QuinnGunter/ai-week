//
//  looks/away_screens.js
//  mmhmm
//
//  Created by Seth Hitchings on 12/10/2025.
//  Copyright 2025 mmhmm inc. All rights reserved.
//

/**
 * Contains the definitions of our built-in away screens and
 * functionality to turn them into reactions slides in a
 * user's account.
 */
class AwayScreens {

    static catalogIds = {
        Spotlight: "0bc3787d-4a3c-48ca-b8bf-9cbc6f7b3e16",
        Coffee: "47c3ef6b-977b-467e-ba0a-584a90019a68",
        Sign: "483600be-2c3b-4921-a925-3e1334f69f88",
        Fishing: "c38ceb1f-25fd-40a6-ba12-caa077c6eec5",
        Note: "7226bb03-14f2-4d7b-9258-99dcb0db833f",
    };

    static create(stage, presentation) {
        return [
            this.createSpotlight(stage, presentation),
            this.createCoffee(stage, presentation),
            this.createSign(stage, presentation),
            this.createFishing(stage, presentation),
            this.createNote(stage, presentation),
        ];
    }

    static createNote(stage, presentation) {
        const catalogId = this.catalogIds.Note;
        const image = this.#newBackgroundImage(stage, "assets/looks/away/note.png");
        const nametag = this.#newNametag(this.#noteNametagStyle,
            LocalizedString("Be right back"),
            LocalizedString("Need to step away for a moment"));
        return this.#newAwayScreen(presentation, image, nametag, LocalizedString("Be right back"), catalogId);
    }

    static createSpotlight(stage, presentation) {
        const catalogId = this.catalogIds.Spotlight;
        const image = this.#newBackgroundImage(stage, "assets/looks/away/spotlight.png");
        const nametag = this.#newNametag(this.#spotlightNametagStyle,
            LocalizedString("Be right back"),
            LocalizedString("Need to step away for a moment")
        );
        return this.#newAwayScreen(presentation, image, nametag, LocalizedString("Spotlight"), catalogId);
    }

    static createCoffee(stage, presentation) {
        const catalogId = this.catalogIds.Coffee;
        const image = this.#newBackgroundVideo(stage, "assets/looks/away/coffee.mp4");
        const nametag = this.#newNametag(this.#coffeeNametagStyle,
            LocalizedString("Be right back"),
            LocalizedString("Brewing..."));
        return this.#newAwayScreen(presentation, image, nametag, LocalizedString("Brewing"), catalogId);
    }

    static createFishing(stage, presentation) {
        const catalogId = this.catalogIds.Fishing;
        const image = this.#newBackgroundVideo(stage, "assets/looks/away/fishing.mp4");
        const nametag = this.#newNametag(this.#fishingNametagStyle,
            LocalizedString("Be right back"),
            LocalizedString("Gone fishing..."));
        return this.#newAwayScreen(presentation, image, nametag, LocalizedString("Gone fishing"), catalogId);
    }

    static createSign(stage, presentation) {
        const catalogId = this.catalogIds.Sign;
        const image = this.#newBackgroundVideo(stage, "assets/looks/away/sign.mp4");
        const nametag = this.#newNametag(this.#signNametagStyle,
            LocalizedString("Back in 5 minutes"),
            LocalizedString("If I'm not just read this message again"));
        return this.#newAwayScreen(presentation, image, nametag, LocalizedString("Back in 5"), catalogId);
    }

    static #newBackgroundImage(stage, url) {
        const media = LooksUtils.createImageMediaFromURL(url);
        media.anchor = Stage.Object.Anchor.None;
        media.scale = 1.0;
        media.center = LooksUtils.stageCenterPoint(stage);
        media.zIndex = Slide.Modern.DefaultPresenterZIndices.Foreground + 1;
        return media;
    }

    static #newBackgroundVideo(stage, url) {
        const media = LooksUtils.createVideoMediaFromURL(url);
        media.anchor = Stage.Object.Anchor.None;
        media.scale = 1.0;
        media.center = LooksUtils.stageCenterPoint(stage);
        media.zIndex = Slide.Modern.DefaultPresenterZIndices.Foreground + 1;
        media.muted = true;
        return media;
    }

    static #newNametag(style, title, subtitle) {
        const media = new Media.NameBadge();
        media.applyStyle(style, 0);
        media.titleLabel.string = title;
        media.subtitleLabel.string = subtitle;
        media.zIndex = Slide.Modern.DefaultPresenterZIndices.Foreground + 2;
        return media;
    }

    static #newAwayScreen(presentation, background, nametag, title, catalogId) {
        const metadata = {
            type: LooksContentType.AwayScreen,
            style: LooksReactionLayout.SlideMedia,
            catalogAwayScreenId: catalogId,
        };
        const reaction = presentation.newSlideObjectWithMetadata(null, null, metadata, title);
        reaction.addObjectWithoutPersisting(background);
        reaction.addObjectWithoutPersisting(nametag);
        return reaction;
    }

    static #noteNametagStyle = {
        id: "away-note",
        name: "Away screen note",
        base: {
            top: 254,
            bottom: 254,
            left: 388,
            right: 388,
            maxWidth: 1144,
            title: {
                top: 0,
                font: new Font({ family: "Solitreo", size: 152 }),
                fontFace: "$fontFace",
                foregroundColor: "$primary",
                padding: InsetsMake(0, 0, 0, 0),
                horizontalAlignment: "center",
            },
            subtitle: {
                bottom: 0,
                font: new Font({ family: "Solitreo", size: 64 }),
                fontFace: "$fontFace",
                foregroundColor: "$primary",
                padding: InsetsMake(0, 0, 0, 0),
                horizontalAlignment: "center",
            },
        },
        selectedVariant: 0,
        variants: [
            {
                id: "center middle",
                name: "center middle",
            }
        ],
        variables: {
            fontFace: "Solitreo ",
            primary: new Paint.Color("#37191a"),
        }
    };

    static #spotlightNametagStyle = {
        id: "away-spotlight",
        name: "Away screen spotlight",
        base: {
            top: 140,
            bottom: 140,
            left: 510,
            right: 510,
            maxWidth: 940,
            title: {
                top: 0,
                font: new Font({family: "Roboto Serif", size: 114 }),
                fontFace: "$fontFace",
                foregroundColor: "$primary",
                margin: InsetsMake(0, 0, 0, 0),
                padding: InsetsMake(80, 80, 80, 80),
                horizontalAlignment: "center",
            },
            subtitle: {
                bottom: 0,
                font: new Font({ family: "Roboto Serif", size: 64 }),
                fontFace: "$fontFace",
                foregroundColor: "$primary",
                margin: InsetsMake(0, 0, 0, 0),
                padding: InsetsMake(0, 0, 0, 0),
                horizontalAlignment: "center",
            },
        },
        selectedVariant: 0,
        variants: [ { id: "center middle" } ],
        variables: {
            fontFace: "Roboto Serif",
            primary: new Paint.Color("#FFFFFF"),
        }
    };

    static #coffeeNametagStyle = {
        id: "away-coffee",
        name: "Away screen coffee",
        base: {
            top: 700,
            maxWidth: 1680,
            title: {
                top: 0,
                font: new Font({ family: "Bebas Neue", size: 160 }),
                fontFace: "$fontFace",
                foregroundColor: "$primary",
                margin: InsetsMake(0, 0, 0, 0),
                padding: InsetsMake(0, 0, 0, 0),
            },
            subtitle: {
                bottom: 0,
                font: new Font({ family: "Bebas Neue", size: 56 }),
                fontFace: "$fontFace",
                foregroundColor: "$primary",
                margin: InsetsMake(0, 0, 0, 0),
                padding: InsetsMake(0, 0, 0, 0),
            },
        },
        selectedVariant: 0,
        variants: [ { id: "center middle" } ],
        variables: {
            fontFace: "Bebas Neue",
            primary: new Paint.Color("#37191A"),
        }
    };

    static #fishingNametagStyle = {
        id: "away-fishing",
        name: "Away screen gone fishing",
        base: {
            title: {
                top: 0,
                font: new Font({ family: "Rye", size: 136 }),
                fontFace: "$fontFace",
                foregroundColor: "$primary",
                padding: InsetsMake(0, 0, 16, 0),
            },
            subtitle: {
                bottom: 0,
                font: new Font({ family: "Rye", size: 56 }),
                fontFace: "$fontFace",
                foregroundColor: "$primary",
                padding: InsetsMake(0, 0, 0, 0),
            },
        },
        selectedVariant: 0,
        variants: [
            {
                id: "center middle",
                name: "center middle",
                top: 310,
                bottom: 310,
                left: 540,
                right: 540,
                maxWidth: 840,
                title: {
                    horizontalAlignment: "center",
                },
                subtitle: {
                    horizontalAlignment: "center",
                },
            }
        ],
        variables: {
            fontFace: "Rye",
            primary: new Paint.Color("#37191a"),
        }
    };

    static #signNametagStyle = {
        id: "away-back-in-five",
        name: "Away screen back in five",
        base: {
            title: {
                top: 0,
                font: new Font({ family: "Freeman", size: 152 }),
                fontFace: "$fontFace",
                foregroundColor: "$primary",
                padding: InsetsMake(0, 0, 16, 0),
                textTransform: "uppercase",
            },
            subtitle: {
                bottom: 0,
                font: new Font({ family: "Freeman", size: 48 }),
                fontFace: "$fontFace",
                foregroundColor: "$primary",
                padding: InsetsMake(0, 0, 0, 0),
                textTransform: "uppercase"
            },
        },
        selectedVariant: 0,
        variants: [
            {
                id: "center middle",
                name: "center middle",
                top: 318,
                bottom: 238,
                left: 372,
                right: 372,
                maxWidth: 1176,
                title: {
                    horizontalAlignment: "center",
                },
                subtitle: {
                    horizontalAlignment: "center",
                },
            }
        ],
        variables: {
            fontFace: "Freeman",
            primary: new Paint.Color("#37191a"),
        }
    };
}
