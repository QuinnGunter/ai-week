//
//  media/namebadge/custom_styles.js
//  mmhmm
//
//  Created by Seth Hitchings on 4/6/2025.
//  Copyright 2025 mmhmm inc. All rights reserved.
//

// These are styles that aren't selectable through the app,
// but that we've manually applied and used on looks that
// are published. Some are in our global catalog, others are
// for custom looks that we made for potential customers.

Media.NameBadge.CustomStyles = {

    // Corporate
    // ---------
    // x Sequoia
    // x Carrot
    // x Airtime
    // x MongoDB
    // x LVMH

    // This doesn't have the actual Airtime corporate font...
    Airtime: {
        name: "Airtime",
        id: "airtime",
        variables: {
            primary: new Paint.Color("#000000"),
            secondary: new Paint.Color("#FFFFFF"),
            tertiary: new Paint.Color("#1D8C98"),
            fontFace: "serif",
            verticalMargin: 90,
            horizontalMargin: 0,
        },
        base: {
            background: {
                paint: "$secondary",
                border: {
                    left: 80,
                    color: "$tertiary",
                },
            },
            title: {
                foregroundColor: "$primary",
                font: new Font({ family: "serif", size: 80 }),
                fontFace: "$fontFace",
                top: 0,
                left: 0,
                padding: InsetsMake(24, 120, 0, 40),
            },
            subtitle: {
                foregroundColor: "$primary",
                font: new Font({ family: "serif", size: 40 }),
                fontFace: "$fontFace",
                bottom: 0,
                left: 0,
                padding: InsetsMake(0, 120, 32, 40),
            }
        },
        variants: Media.NameBadge.StandardVariants,
        defaultVariant: 6,
    },

    Carrot1: {
        name: "Carrot 1",
        id: "carrot-1",
        variables: {
            primary: new Paint.Color("#FFFFFF"),
            secondary: new Paint.Color("rgba(.18, .18, .18, 0.60)"),
            tertiary: new Paint.Color("#FE762D"),
            fontFace: "serif",
            verticalMargin: 90,
            horizontalMargin: 0,
        },
        base: {
            background: {
                paint: "$secondary",
                border: {
                    color: "$tertiary",
                    margin: InsetsMake(24, 60, 32, 0),
                    left: 6,
                }
            },
            title: {
                foregroundColor: "$primary",
                font: new Font({ family: "serif", size: 74 }),
                fontFace: "$fontFace",
                padding: InsetsMake(24, 90, 0, 32),
                top: 0,
                left: 0,
            },
            subtitle: {
                foregroundColor: "$primary",
                font: new Font({ family: "serif", size: 28 }),
                fontFace: "$fontFace",
                padding: InsetsMake(8, 90, 32, 32),
                bottom: 0,
                left: 0,
                textTransform: "uppercase",
            }
        },
        defaultVariant: 6,
        variants: Media.NameBadge.StandardVariants,
    },

    Carrot2: {
        name: "Carrot 2",
        id: "carrot-2",
        variables: {
            primary: new Paint.Color("#2D2D2D"),
            secondary: new Paint.Color("rgba(224, 221, 212, 0.70)"),
            fontFace: "serif",
            verticalMargin: 24,
            horizontalMargin: 88,
        },
        base: {
            background: {
                paint: "$secondary",
            },
            title: {
                foregroundColor: "$primary",
                font: new Font({ family: "serif", size: 68 }),
                fontFace: "$fontFace",
                padding: InsetsMake(36, 40, 0, 40),
                top: 0,
                left: 0,
            },
            subtitle: {
                foregroundColor: "$primary",
                font: new Font({ family: "serif", size: 32 }),
                fontFace: "$fontFace",
                padding: InsetsMake(10, 40, 40, 40),
                bottom: 0,
                left: 0,
                textTransform: "uppercase",
            }
        },
        defaultVariant: 6,
        variants: Media.NameBadge.StandardVariants,
    },

    // Used on all Sequoia looks, with different color schemes on each
    // This doesn't have the actual Sequoia corporate font...
    SequoiaBase: {
        name: "Sequoia",
        id: "sequoia-base",
        variables: {
            verticalMargin: 90,
            horizontalMargin: 90,
            fontFace: "Inter",
        },
        base: {
            background: {
                paint: "$secondary",
            },
            title: {
                foregroundColor: "$primary",
                font: new Font({ family: "Inter", size: 72 }),
                fontFace: "$fontFace",
                padding: InsetsMake(22, 30, 6, 30),
                top: 0,
                left: 0,
                right: 0,
                textTransform: "uppercase",
                border: {
                    margin: InsetsMake(0, 30, 0, 30),
                    color: "$primary",
                    bottom: 1,
                },
            },
            subtitle: {
                foregroundColor: "$primary",
                font: new Font({ family: "Inter", size: 32 }),
                fontFace: "$fontFace",
                padding: InsetsMake(14, 30, 28, 30),
                bottom: 0,
                left: 0,
                right: 0,
                textTransform: "uppercase",
            }
        },
        variants: Media.NameBadge.StandardVariants,
        defaultVariant: 6
    },

    MongoDB1: {
        name: "MongoDB 1",
        id: "mongodb-1",
        variables: {
            primary: new Paint.Color("#FFFFFF"),
            secondary: new Paint.Color("#6CE975"),
            tertiary: new Paint.Color("#000000"),
            quaternary: new Paint.Color("rgba(0, 0, 0, 0.40)"),
            fontFace: "serif",
            verticalMargin: 90,
            horizontalMargin: 0,
        },
        base: {
            background: {
                paint: "$quaternary",
                border: {
                    color: "$tertiary",
                    bottom: 0,
                    top: 6,
                    // Is this supposed to vary? See Gabe's code
                }
            },
            title: {
                foregroundColor: "$primary",
                font: new Font({ family: "serif", size: 64 }),
                fontFace: "serif",
                padding: InsetsMake(16, 90, 0, 40),
                top: 0,
                left: 0,
                // Should these allow text alignment?
            },
            subtitle: {
                foregroundColor: "$secondary",
                font: new Font({ family: "serif", size: 30 }),
                fontFace: "serif",
                padding: InsetsMake(8, 90, 32, 40),
                bottom: 0,
                left: 0,
            }
        },
        defaultVariant: 6,
        variants: Media.NameBadge.StandardVariants,
    },

    MongoDB2: {
        name: "MongoDB 2",
        id: "mongodb-2",
        variables: {
            primary: new Paint.Color("#E9EDEB"),
            secondary: new Paint.Color("#6CE975"),
            tertiary: new Paint.Color("rgba(32, 45, 55, 0.80)"),
            verticalMargin: 56,
            horizontalMargin: 56,
        },
        base: {
            background: {
                paint: "$tertiary",
            },
            title: {
                foregroundColor: "$primary",
                font: new Font({ family: "serif", size: 64 }),
                fontFace: "serif",
                padding: InsetsMake(32, 36, 0, 36),
                top: 0,
                left: 0,
            },
            subtitle: {
                foregroundColor: "$secondary",
                font: new Font({ family: "serif", size: 28 }),
                fontFace: "serif",
                padding: InsetsMake(8, 36, 36, 36),
                bottom: 0,
                left: 0,
            }
        },
        defaultVariant: 6,
        variants: Media.NameBadge.StandardVariants,
    },

    LVMH1: {
        name: "LVMH 1",
        id: "lvmh-1",
        variables: {
            primary: new Paint.Color("#FFFFFF"),
            fontFace: "serif",
            verticalMargin: 70,
            horizontalMargin: 70,
        },
        base: {
            title: {
                foregroundColor: "$primary",
                font: new Font({ family: "serif", size: 96 }),
                fontFace: "serif",
                padding: InsetsMake(0, 32, 0, 0),
                top: 0,
                left: 0,
                textTransform: "uppercase",
            },
            subtitle: {
                foregroundColor: "$primary",
                font: new Font({ family: "serif", size: 40 }),
                fontFace: "serif",
                padding: InsetsMake(8, 32, 0, 0),
                bottom: 0,
                left: 0,
            }
        },
        defaultVariant: 6,
        variants: Media.NameBadge.StandardVariants,
    },

    LVMH2: {
        name: "LVMH 2",
        id: "lvmh-2",
        variables: {
            primary: new Paint.Color("#FFFFFF"),
            fontFace: "serif",
            verticalMargin: 122,
            horizontalMargin: 450,
        },
        base: {
            title: {
                foregroundColor: "$primary",
                font: new Font({ family: "serif", size: 96 }),
                fontFace: "serif",
                padding: InsetsMake(0, 32, 0, 0),
                top: 0,
                left: 0,
                textTransform: "uppercase",
            },
            subtitle: {
                foregroundColor: "$primary",
                font: new Font({ family: "serif", size: 40 }),
                fontFace: "serif",
                padding: InsetsMake(0, 32, 0, 0),
                bottom: 0,
                left: 0,
            }
        },
        defaultVariant: 0,
        variants: [
            {
                name: "Bottom Left",
                id: "bottom-left",
                bottom: "$verticalMargin",
                left: "$horizontalMargin",
            },
        ],
    },
};

Media.NameBadge.CustomStyles.SequoiaGreen = Media.NameBadge.ExtendStyle(
    Media.NameBadge.CustomStyles.SequoiaBase,
    "sequoia-green",
    "Sequoia Green",
    {
        primary: new Paint.Color("#FCF7F0"),
        secondary: new Paint.Color("rgba(0, 160, 113, 0.80"),
    },
);

Media.NameBadge.CustomStyles.SequoiaWhite = Media.NameBadge.ExtendStyle(
    Media.NameBadge.CustomStyles.SequoiaBase,
    "sequoia-white",
    "Sequoia White",
    {
        primary: new Paint.Color("#3C3C3C"),
        secondary: new Paint.Color("rgba(252, 247, 240, 0.80)"),
    },
);

Media.NameBadge.CustomStyles.SequoiaDark = Media.NameBadge.ExtendStyle(
    Media.NameBadge.CustomStyles.SequoiaBase,
    "sequoia-dark",
    "Sequoia Dark",
    {
        primary: new Paint.Color("#FCF7F0"),
        secondary: new Paint.Color("rgba(60, 60, 60, 0.50)"),
    },
);
