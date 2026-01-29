//
//  media/namebadge/styles.js
//  mmhmm
//
//  Created by Steve White on 3/12/25.
//  Copyright © 2025 mmhmm, inc. All rights reserved.
//


// This is the base style for the Auto Pop and Auto Blend styles
Media.NameBadge.BaseStyles = {};
Media.NameBadge.BaseStyles.AutoBase = {
    variables: {
        fontFace: "Bebas Neue",
        maxWidth: 600,
    },
    base: {
        bottom: 0,
        background: {
            paint: "$secondary",
        },
        title: {
            foregroundColor: "$primary",
            font: new Font({ family: "serif", size: 84 }),
            fontFace: "$fontFace",
            top: 0,
            left: 0,
            right: 0,
            textTransform: "uppercase",
        },
        subtitle: {
            foregroundColor: "$primary",
            font: new Font({ family: "serif", size: 38 }),
            fontFace: "$fontFace",
            bottom: 0,
            left: 0,
            right: 0,
            textTransform: "uppercase",
        }
    },
    defaultVariant: 0,
    variants: [
        {
            name: "Left Fill",
            id: "left-fill",
            maxWidth: "$maxWidth",
            left: 0,
            top: 0,
            title: {
                horizontalAlignment: AdvancedTextLayer.HorizontalAlignment.Left,
                padding: InsetsMake(56, 80, 0, 56),
                border: {
                    margin: InsetsMake(0, 80, 0, 56),
                    color: "$primary",
                    bottom: 1,
                }
            },
            subtitle: {
                horizontalAlignment: AdvancedTextLayer.HorizontalAlignment.Left,
                padding: InsetsMake(16, 80, 56, 56),
            },
        },
        {
            name: "Center",
            id: "center",
            left: 0,
            right: 0,
            title: {
                left: null,
                right: null,
                padding: InsetsMake(56, 56, 0, 56),
                border: {
                    margin: InsetsMake(0, 56, 0, 56),
                    color: "$primary",
                    bottom: 1,
                }
            },
            subtitle: {
                left: null,
                right: null,
                padding: InsetsMake(16, 56, 56, 56),
            },
        },
        {
            name: "Right Fill",
            id: "Right Fill",
            maxWidth: "$maxWidth",
            right: 0,
            top: 0,
            title: {
                horizontalAlignment: AdvancedTextLayer.HorizontalAlignment.Right,
                padding: InsetsMake(56, 56, 0, 80),
                border: {
                    margin: InsetsMake(0, 56, 0, 80),
                    color: "$primary",
                    bottom: 1,
                }
            },
            subtitle: {
                horizontalAlignment: AdvancedTextLayer.HorizontalAlignment.Right,
                padding: InsetsMake(16, 56, 56, 80),
            },
        },
    ],
};

Media.NameBadge.ExtendStyle = (base, id, name, variables) => {
    // Duplicate the base style
    const style = {};
    Object.keys(base).forEach((key) => {
        style[key] = base[key];
    });

    // Change the name and ID
    style.name = name;
    style.id = id;

    // Change the variables
    const mergedVariables = Object.assign({}, base.variables, variables);
    style.variables = mergedVariables;

    return style;
};

// A set of 8 standard placement variants for a name badge.
// These variants expect the #verticalMargin and $horizontalMargin
// variables to be defined in the style.
Media.NameBadge.StandardVariants = Object.freeze([
    {
        id: "top-left",
        name: "Top Left",
        left: "$horizontalMargin",
        top: "$verticalMargin",
        title: {
            horizontalAlignment: AdvancedTextLayer.HorizontalAlignment.Left,
        },
        subtitle: {
            horizontalAlignment: AdvancedTextLayer.HorizontalAlignment.Left,
        },
    },
    {
        id: "top-center",
        name: "Top Center",
        top: "$verticalMargin",
        title: {
            horizontalAlignment: AdvancedTextLayer.HorizontalAlignment.Center,
        },
        subtitle: {
            horizontalAlignment: AdvancedTextLayer.HorizontalAlignment.Center,
        },
    },
    {
        id: "top-right",
        name: "Top Right",
        right: "$horizontalMargin",
        top: "$verticalMargin",
        title: {
            horizontalAlignment: AdvancedTextLayer.HorizontalAlignment.Right,
        },
        subtitle: {
            horizontalAlignment: AdvancedTextLayer.HorizontalAlignment.Right,
        },
    },
    {
        id: "center-left",
        name: "Center Left",
        left: "$horizontalMargin",
        title: {
            horizontalAlignment: AdvancedTextLayer.HorizontalAlignment.Left,
        },
        subtitle: {
            horizontalAlignment: AdvancedTextLayer.HorizontalAlignment.Left,
        },
    },
    {
        id: "center-right",
        name: "Center Right",
        right: "$horizontalMargin",
        title: {
            horizontalAlignment: AdvancedTextLayer.HorizontalAlignment.Right,
        },
        subtitle: {
            horizontalAlignment: AdvancedTextLayer.HorizontalAlignment.Right,
        },
    },
    {
        id: "bottom-left",
        name: "Bottom Left",
        left: "$horizontalMargin",
        bottom: "$verticalMargin",
        title: {
            horizontalAlignment: AdvancedTextLayer.HorizontalAlignment.Left,
        },
        subtitle: {
            horizontalAlignment: AdvancedTextLayer.HorizontalAlignment.Left,
        },
    },
    {
        id: "bottom-center",
        name: "Bottom Center",
        bottom: "$verticalMargin",
        title: {
            horizontalAlignment: AdvancedTextLayer.HorizontalAlignment.Center,
        },
        subtitle: {
            horizontalAlignment: AdvancedTextLayer.HorizontalAlignment.Center,
        },
    },
    {
        id: "bottom-right",
        name: "Bottom Right",
        right: "$horizontalMargin",
        bottom: "$verticalMargin",
        title: {
            horizontalAlignment: AdvancedTextLayer.HorizontalAlignment.Right,
        },
        subtitle: {
            horizontalAlignment: AdvancedTextLayer.HorizontalAlignment.Right,
        },
    },
]);

Media.NameBadge.Styles = Object.freeze({
    Simple: {
        id: "simple-1",
        name: "Simple",
        variables: {
            margin: 90,
            primary: new Paint.Color("#FFFFFF"), // Text color
            secondary: new Paint.Color("rgba(0, 0, 0, 0.8)"), // Background color
            tertiary: new Paint.Color("#FFFFFF"), // Dividing line color
            fontFace: "Figtree",
        },
        base: {
            background: {
                paint: "$secondary",
            },
            title: {
                top: 0,
                left: 0,
                right: 0,
                foregroundColor: "$primary",
                font: new Font({ family: "Figtree", size: 56 }),
                fontFace: "$fontFace",
                padding: InsetsMake(32, 32, 12, 32),
                textTransform: "uppercase",
                border: {
                    bottom: 1.5,
                    color: "$tertiary",
                    margin: InsetsMake(0, 32, 0, 32),
                }
            },
            subtitle: {
                bottom: 0,
                left: 0,
                right: 0,
                foregroundColor: "$primary",
                font: new Font({ family: "Figtree", size: 28 }),
                fontFace: "$fontFace",
                padding: InsetsMake(14, 32, 36, 32),
                textTransform: "uppercase",
            },
        },
        defaultVariant: 6,
        variants: [
            {
                id: "top-left",
                name: "Top Left",
                left: "$margin",
                top: "$margin",
                title: {
                    horizontalAlignment: AdvancedTextLayer.HorizontalAlignment.Left,
                },
                subtitle: {
                    horizontalAlignment: AdvancedTextLayer.HorizontalAlignment.Left,
                },
            },
            {
                id: "top-center",
                name: "Top Center",
                top: "$margin",
                title: {
                    horizontalAlignment: AdvancedTextLayer.HorizontalAlignment.Center,
                },
                subtitle: {
                    horizontalAlignment: AdvancedTextLayer.HorizontalAlignment.Center,
                },
            },
            {
                id: "top-right",
                name: "Top Right",
                right: "$margin",
                top: "$margin",
                title: {
                    horizontalAlignment: AdvancedTextLayer.HorizontalAlignment.Right,
                },
                subtitle: {
                    horizontalAlignment: AdvancedTextLayer.HorizontalAlignment.Right,
                },
            },
            {
                id: "center-left",
                name: "Center Left",
                left: "$margin",
                title: {
                    horizontalAlignment: AdvancedTextLayer.HorizontalAlignment.Left,
                },
                subtitle: {
                    horizontalAlignment: AdvancedTextLayer.HorizontalAlignment.Left,
                },
            },
            {
                id: "center-right",
                name: "Center Right",
                right: "$margin",
                title: {
                    horizontalAlignment: AdvancedTextLayer.HorizontalAlignment.Right,
                },
                subtitle: {
                    horizontalAlignment: AdvancedTextLayer.HorizontalAlignment.Right,
                },
            },
            {
                id: "bottom-left",
                name: "Bottom Left",
                left: "$margin",
                bottom: "$margin",
                title: {
                    horizontalAlignment: AdvancedTextLayer.HorizontalAlignment.Left,
                },
                subtitle: {
                    horizontalAlignment: AdvancedTextLayer.HorizontalAlignment.Left,
                },
            },
            {
                id: "bottom-center",
                name: "Bottom Center",
                bottom: "$margin",
                title: {
                    horizontalAlignment: AdvancedTextLayer.HorizontalAlignment.Center,
                },
                subtitle: {
                    horizontalAlignment: AdvancedTextLayer.HorizontalAlignment.Center,
                },
            },
            {
                id: "bottom-right",
                name: "Bottom Right",
                right: "$margin",
                bottom: "$margin",
                title: {
                    horizontalAlignment: AdvancedTextLayer.HorizontalAlignment.Right,
                },
                subtitle: {
                    horizontalAlignment: AdvancedTextLayer.HorizontalAlignment.Right,
                },
            },
        ],
    },

    Tinted: {
        // Based on Simple, used by the Simple/Tinted preset
        id: "tinted",
        name: "Tinted",
        variables: {
            margin: 60,
            primary: new Paint.Color("#FFFFFF"), // Text color
            secondary: new Paint.Color("rgba(0, 0, 0, 0.6)"), // Background color
            tertiary: new Paint.Color("rgba(255, 255, 255, 0.5)"), // Dividing line color
            fontFace: "Inter",
        },
        base: {
            background: {
                paint: "$secondary",
            },
            title: {
                top: 0,
                left: 0,
                right: 0,
                foregroundColor: "$primary",
                font: new Font({ family: "Inter", size: 56 }),
                fontFace: "$fontFace",
                padding: InsetsMake(32, 32, 12, 32),
                textTransform: "uppercase",
                border: {
                    bottom: 1.5,
                    color: "$tertiary",
                    margin: InsetsMake(0, 32, 0, 32),
                }
            },
            subtitle: {
                bottom: 0,
                left: 0,
                right: 0,
                foregroundColor: "$primary",
                font: new Font({ family: "Inter", size: 28 }),
                fontFace: "$fontFace",
                padding: InsetsMake(14, 32, 36, 32),
                textTransform: "uppercase",
            },
        },
        defaultVariant: 7,
        variants: [
            {
                id: "top-left",
                name: "Top Left",
                left: "$margin",
                top: "$margin",
                title: {
                    horizontalAlignment: AdvancedTextLayer.HorizontalAlignment.Left,
                },
                subtitle: {
                    horizontalAlignment: AdvancedTextLayer.HorizontalAlignment.Left,
                },
            },
            {
                id: "top-center",
                name: "Top Center",
                top: "$margin",
                title: {
                    horizontalAlignment: AdvancedTextLayer.HorizontalAlignment.Center,
                },
                subtitle: {
                    horizontalAlignment: AdvancedTextLayer.HorizontalAlignment.Center,
                },
            },
            {
                id: "top-right",
                name: "Top Right",
                right: "$margin",
                top: "$margin",
                title: {
                    horizontalAlignment: AdvancedTextLayer.HorizontalAlignment.Right,
                },
                subtitle: {
                    horizontalAlignment: AdvancedTextLayer.HorizontalAlignment.Right,
                },
            },
            {
                id: "center-left",
                name: "Center Left",
                left: "$margin",
                title: {
                    horizontalAlignment: AdvancedTextLayer.HorizontalAlignment.Left,
                },
                subtitle: {
                    horizontalAlignment: AdvancedTextLayer.HorizontalAlignment.Left,
                },
            },
            {
                id: "center-right",
                name: "Center Right",
                right: "$margin",
                title: {
                    horizontalAlignment: AdvancedTextLayer.HorizontalAlignment.Right,
                },
                subtitle: {
                    horizontalAlignment: AdvancedTextLayer.HorizontalAlignment.Right,
                },
            },
            {
                id: "bottom-left",
                name: "Bottom Left",
                left: "$margin",
                bottom: "$margin",
                title: {
                    horizontalAlignment: AdvancedTextLayer.HorizontalAlignment.Left,
                },
                subtitle: {
                    horizontalAlignment: AdvancedTextLayer.HorizontalAlignment.Left,
                },
            },
            {
                id: "bottom-center",
                name: "Bottom Center",
                bottom: "$margin",
                title: {
                    horizontalAlignment: AdvancedTextLayer.HorizontalAlignment.Center,
                },
                subtitle: {
                    horizontalAlignment: AdvancedTextLayer.HorizontalAlignment.Center,
                },
            },
            {
                id: "bottom-right",
                name: "Bottom Right",
                right: "$margin",
                bottom: "$margin",
                title: {
                    horizontalAlignment: AdvancedTextLayer.HorizontalAlignment.Right,
                },
                subtitle: {
                    horizontalAlignment: AdvancedTextLayer.HorizontalAlignment.Right,
                },
            },
        ],
    },

    Impact: {
        id: "style-1",
        name: "Impact",
        variables: {
            primary: new Paint.Color("#FF5820"),
            secondary: new Paint.Color("#FFFFFF"),
            fontFace: "Figtree Italic",
        },
        base: {
            bottom: 40,
            title: {
                backgroundColor: "$primary",
                foregroundColor: "$secondary",
                font: new Font({ family: "serif", size: 88 }),
                fontFace: "$fontFace",
                top: 0,
            },
            subtitle: {
                backgroundColor: "$secondary",
                foregroundColor: "$primary",
                margin: InsetsMake(12, 0, 0, 0),
                font: new Font({ family: "serif", size: 32 }),
                fontFace: "$fontFace",
                bottom: 0,
            }
        },
        defaultVariant: 1,
        variants: [
            {
                id: "bottom-left",
                name: "Bottom Left",
                left: 0,
                title: {
                    left: 0,
                    padding: InsetsMake(40, 48, 16, 88),
                    clipPoints: [
                        PointMake(0, 0),
                        PointMake(0, 0),
                        PointMake(0, 0),
                        PointMake(40, 0),
                    ],
                    border: {
                        color: "$secondary",
                        top: 8,
                        margin: InsetsMake(24, 48, 0, 0),
                        length: InsetsMake(36, 0, 0, 0),
                    }
                },
                subtitle: {
                    left: 0,
                    padding: InsetsMake(20, 48, 22, 68),
                    clipPoints: [
                        PointMake(0, 0),
                        PointMake(0, 0),
                        PointMake(0, 0),
                        PointMake(20, 0),
                    ],
                }
            },

            {
                id: "bottom",
                name: "Bottom",
                title: {
                    padding: InsetsMake(40, 88, 16, 88),
                    clipPoints: [
                        PointMake(40, 0),
                        PointMake(0, 0),
                        PointMake(0, 0),
                        PointMake(40, 0),
                    ],
                    border: {
                        color: "$secondary",
                        top: 8,
                        margin: InsetsMake(24, 88, 0, 0),
                        length: InsetsMake(36, 0, 0, 0),
                    }
                },
                subtitle: {
                    padding: InsetsMake(20, 68, 22, 68),
                    clipPoints: [
                        PointMake(20, 0),
                        PointMake(0, 0),
                        PointMake(0, 0),
                        PointMake(20, 0),
                    ],
                }
            },

            {
                id: "bottom-right",
                name: "Bottom Right",
                right: 0,
                title: {
                    right: 0,
                    padding: InsetsMake(40, 88, 16, 48),
                    clipPoints: [
                        PointMake(0, 0),
                        PointMake(0, 0),
                        PointMake(40, 0),
                        PointMake(0, 0),
                    ],
                    border: {
                        color: "$secondary",
                        top: 8,
                        margin: InsetsMake(24, 88, 0, 0),
                        length: InsetsMake(36, 0, 0, 0),
                    }
                },
                subtitle: {
                    right: 0,
                    padding: InsetsMake(20, 68, 22, 48),
                    clipPoints: [
                        PointMake(0, 0),
                        PointMake(0, 0),
                        PointMake(20, 0),
                        PointMake(0, 0),
                    ],
                }
            }
        ],
    },

    Framed: {
        id: "style-4",
        name: "Framed",
        variables: {
            primary: new Paint.Color("#FFFFFF"),
            secondary: new Paint.Color("#000000"),
            tertiary: new Paint.Color("#B8AC92"),
            fontFace: "Oswald",
            margin: 36,
        },
        base: {
            background: {
                paint: "$secondary",
                border: {
                    color: "$tertiary",
                    top: 4,
                    left: 4,
                    bottom: 4,
                    right: 4,
                },
            },
            title: {
                foregroundColor: "$primary",
                font: new Font({ family: "serif", size: 80 }),
                fontFace: "$fontFace",
                padding: InsetsMake(12, 32, 20, 32),
                top: 0,
                textTransform: "uppercase",
                border: {
                    margin: InsetsMake(0, 32, 8, 32),
                    color: "$tertiary",
                    bottom: 2,
                },
            },
            subtitle: {
                foregroundColor: "$tertiary",
                font: new Font({ family: "serif", size: 40 }), // needs italics
                fontFace: "$fontFace",
                padding: InsetsMake(0, 32, 24, 32),
                bottom: 0,
            }
        },
        defaultVariant: 1,
        variants: [
            {
                id: "bottom-left",
                name: "Bottom Left",
                bottom: 36,
                left: 36,
                title: {
                    left: 0,
                },
                subtitle: {
                    left: 0,
                },
            },

            {
                id: "bottom-center",
                name: "Bottom Center",
                bottom: 36,
            },

            {
                id: "bottom-right",
                name: "Bottom Right",
                bottom: 36,
                right: 36,
                title: {
                    right: 0,
                },
                subtitle: {
                    right: 0,
                },
            },
        ],
    },

    Card: {
        id: "style-5",
        name: "Card",
        variables: {
            primary: new Paint.Color("#F9FEE6"),
            secondary: new Paint.Color("#672423"),
            fontFace: "Libre Bodoni Italic",
        },
        base: {
            background: {
                paint: "$primary",
                border: {
                    color: "$secondary",
                    top: 1,
                    left: 1,
                    bottom: 1,
                    right: 1,
                    margin: InsetsMake(16, 16, 16, 16),
                }
            },
            title: {
                foregroundColor: "$secondary",
                font: new Font({ family: "serif", size: 56 }), // needs italics
                fontFace: "$fontFace",
                padding: InsetsMake(80, 48, 24, 48),
                horizontalAlignment: AdvancedTextLayer.HorizontalAlignment.Center,
                top: 0,
                border: {
                    color: "$secondary",
                    margin: InsetsMake(0, 96, 16, 96),
                    bottom: 1,
                },
            },
            subtitle: {
                foregroundColor: "$secondary",
                font: new Font({ family: "serif", size: 24 }),
                fontFace: "$fontFace",
                padding: InsetsMake(0, 48, 80, 48),
                bottom: 0,
                horizontalAlignment: AdvancedTextLayer.HorizontalAlignment.Center,
                textTransform: "uppercase",
            }
        },
        defaultVariant: 1,
        variants: [
            {
                id: "left",
                name: "Left",
                left: 36,
            },

            {
                id: "center",
                name: "Center",
                bottom: 36,
				title: {
                    padding: InsetsMake(36, 48, 24, 48),
				},
				subtitle: {
                    padding: InsetsMake(0, 48, 36, 48),
				},
            },

            {
                id: "right",
                name: "Right",
                right: 36,
            },
        ],
    },

    Classic: {
        id: "style-6",
        name: "Classic",
        variables: {
            primary: new Paint.Color("#EB7F76"),
            secondary: new Paint.Color("rgba(9, 22, 54, 0.85)"),
			tertiary: new Paint.Color("#858A97"),
            fontFace: "Libre Bodoni Italic",
        },
        base: {
            background: {
                paint: "$secondary",
            },
            bottom: 40,
            title: {
                foregroundColor: "$primary",
                font: new Font({ family: "serif", size: 56 }), // needs italics
                fontFace: "$fontFace",
                padding: InsetsMake(40, 72, 40, 72),
                top: 0,
                border: {
                    color: "$tertiary",
                    margin: InsetsMake(0, 72, 12, 72),
                    bottom: 1,
                    style: 'diamond',
                },
            },
            subtitle: {
                foregroundColor: "$primary",
                font: new Font({ family: "serif", size: 32 }),
                fontFace: "$fontFace",
                padding: InsetsMake(20, 72, 40, 72),
                bottom: 0,
                textTransform: "uppercase",
            }
        },
        defaultVariant: 1,
        variants: [
            {
                id: "left",
                name: "Left",
                left: 36,
            },

            {
                id: "center",
                name: "Center",
            },

            {
                id: "right",
                name: "Right",
                right: 36,
            },
        ],
    },

    Swiss: {
        id: "style-7",
        name: "Swiss",
        variables: {
            primary: new Paint.Color("#FFFFFF"),
            secondary: new Paint.Color("#7CDAFF"),
            fontFace: "Archivo Black",
        },
        base: {
            background: {
                border: {
                    color: "$secondary",
                    left: 8,
                }
            },
            title: {
                foregroundColor: "$primary",
                font: new Font({ family: "serif", size: 80 }),
                fontFace: "$fontFace",
                padding: InsetsMake(0, 32, 0, 0),
                top: 0,
            },
            subtitle: {
                foregroundColor: "$primary",
                font: new Font({ family: "serif", size: 32 }),
                fontFace: "$fontFace",
                padding: InsetsMake(8, 32, 0, 0),
                bottom: 0,
                textTransform: "uppercase",
            }
        },
        defaultVariant: 1,
        variants: [
            {
                id: "left",
                name: "Left",
                bottom: 40,
                left: 56,
                title: {
                    left: 0,
                },
                subtitle: {
                    left: 0,
                },
            },

            {
                id: "center",
                name: "Center",
                bottom: 40,
                title: {
                    left: 0,
                },
                subtitle: {
                    left: 0,
                },
            },

            {
                id: "right",
                name: "Right",
                bottom: 40,
                right: 56,
                background: {
                    border: {
                        color: "$secondary",
                        right: 8,
                        left: 0
                    }
                },
                title: {
                    padding: InsetsMake(8, 0, 0, 32),
                    right: 0,
                },
                subtitle: {
                    padding: InsetsMake(8, 0, 0, 32),
                    right: 0,
                },
            },
        ],
    },

    Clean: {
        id: "style-8",
        name: "Clean",
        variables: {
            primary: new Paint.Color("#FFFFFF"),
            secondary: new Paint.Color("#FF5724"),
            tertiary: new Paint.LinearGradient([["rgba(0,0,0,0)", 0.5, 0], ["rgba(0,0,0,1)", 0.5, 1]]),
            fontFace: "Source Serif Black",
        },
        base: {
            background: {
                paint: "$tertiary",
            },
            bottom: 0,
            left: 0,
            right: 0,
            title: {
                foregroundColor: "$primary",
                font: new Font({ family: "serif", size: 56 }),
                fontFace: "$fontFace",
                padding: InsetsMake(148, 56, 24, 56),
                top: 0,
                margin: InsetsMake(0, 0, -4, 0),
                border: {
                    margin: InsetsMake(0, 56, 0, 56),
                    color: "$secondary",
                    bottom: 4,
                },
            },
            subtitle: {
                foregroundColor: "$primary",
                font: new Font({ family: "serif", size: 32 }),
                fontFace: "$fontFace",
                padding: InsetsMake(6, 56, 40, 56),
                bottom: 0,
                border: {
                    margin: InsetsMake(0, 56, 0, 56),
                    color: "$secondary",
                    top: 1,
                },
            }
        },
        defaultVariant: 1,
        variants: [
            {
                id: "left",
                name: "Left",
                title: {
                    left: 0,
                },
                subtitle: {
                    left: 0,
                },
            },

            {
                id: "center",
                name: "Center",
            },

            {
                id: "right",
                name: "Right",
                title: {
                    right: 0,
                },
                subtitle: {
                    right: 0,
                },
            },
        ],
    },

    Linear: {
        id: "style-9",
        name: "Linear",
        variables: {
            primary: new Paint.Color("#FFFFFF"),
            secondary: new Paint.Color("rgba(0, 56, 31, 0.7)"),
            tertiary: new Paint.Color("#7CFFE3"),
            fontFace: "IBM Plex Mono",
        },
        base: {
            background: {
                paint: "$secondary",
                border: {
                    color: "$tertiary",
                    bottom: 10,
                }
            },
            title: {
                foregroundColor: "$primary",
                font: new Font({ family: "serif", size: 58 }),
                fontFace: "$fontFace",
                padding: InsetsMake(32, 40, 0, 40),
                top: 0,
                left: 0,
            },
            subtitle: {
                foregroundColor: "$tertiary",
                font: new Font({ family: "serif", size: 32 }),
                fontFace: "$fontFace",
                padding: InsetsMake(0, 40, 88, 40),
                bottom: 0,
                left: 0,
            }
        },
        defaultVariant: 1,
        variants: [
            {
                id: "left",
                name: "Left",
                top: 0,
                left: 36,
            },

            {
                id: "center",
                name: "Center",
                bottom: 0,
                title: {
                    padding: InsetsMake(40, 40, 0, 40),
                },
                subtitle: {
                    padding: InsetsMake(8, 40, 40, 40),
                },
                background: {
                    border: {
                        color: "$tertiary",
                        bottom: 0,
                        top: 10
                    }
                }
            },

            {
                id: "right",
                name: "Right",
                top: 0,
                right: 36,
            },

        ],
    },

    AutoPop: Media.NameBadge.ExtendStyle(
        Media.NameBadge.BaseStyles.AutoBase,
        "auto-pop",
        "Auto Pop",
        {
            primary: new Paint.Color("#FFFEF7"),
            secondary: new Paint.Color("rgba(18, 6, 6, 0.80)"),
        },
    ),

    AutoBlend: Media.NameBadge.ExtendStyle(
        Media.NameBadge.BaseStyles.AutoBase,
        "auto-blend",
        "Auto Blend",
        {
            primary: new Paint.Color("#1C2347"),
            secondary: new Paint.Color("rgba(233, 255, 255, 0.80)"),
        },
    ),

    Spotlight: {
        name: "Spotlight",
        id: "spotlight",
        variables: {
            primary: new Paint.Color("#FFFFFF"),
            secondary: new Paint.Color("#7CDAFF"),
            fontFace: "Roboto Serif",
            // TODO Gabe used "Extra Light", looks different from what we used
            verticalMargin: 0,
            horizontalMargin: 56,
        },
        base: {
            title: {
                foregroundColor: "$primary",
                font: new Font({ family: "serif", size: 80 }),
                fontFace: "serif",
                padding: InsetsMake(24, 32, 0, 0),
                top: 0,
            },
            subtitle: {
                foregroundColor: "$primary",
                font: new Font({ family: "serif", size: 32 }),
                fontFace: "serif",
                padding: InsetsMake(8, 32, 56, 0),
                bottom: 0,
                textTransform: "uppercase",
            }
        },
        defaultVariant: 6,
        variants: [
            {
                id: "top-left",
                name: "Top Left",
                left: "$horizontalMargin",
                top: "$verticalMargin",
                background: {
                    border: {
                        color: "$secondary",
                        margin: InsetsMake(0, 0, 24, 0),
                        left: 2,
                    },
                },
                title: {
                    left: 0,
                },
                subtitle: {
                    left: 0,
                }
            },
            {
                id: "top-center",
                name: "Top Center",
                top: "$verticalMargin",
                background: {
                    border: {
                        color: "$secondary",
                        margin: InsetsMake(0, 0, 24, 0),
                        left: 2,
                    },
                },
                title: {
                    left: 0,
                },
                subtitle: {
                    left: 0,
                }
            },
            {
                id: "top-right",
                name: "Top Right",
                right: "$horizontalMargin",
                top: "$verticalMargin",
                background: {
                    border: {
                        color: "$secondary",
                        margin: InsetsMake(24, 0, 0, 0),
                        right: 2,
                    },
                },
                title: {
                    right: 0,
                    padding: InsetsMake(24, 24, 0, 32),
                },
                subtitle: {
                    right: 0,
                    padding: InsetsMake(8, 24, 56, 32),
                }
            },
            {
                id: "center-left",
                name: "Center Left",
                left: "$horizontalMargin",
                background: {
                    border: {
                        color: "$secondary",
                        margin: InsetsMake(24, 0, 24, 0),
                        left: 2,
                    },
                },
                title: {
                    left: 0,
                    padding: InsetsMake(24, 32, 0, 0),
                },
                subtitle: {
                    left: 0,
                    padding: InsetsMake(8, 32, 40, 0),
                }
            },
            {
                id: "center-right",
                name: "Center Right",
                right: "$horizontalMargin",
                background: {
                    border: {
                        color: "$secondary",
                        margin: InsetsMake(24, 0, 0, 0),
                        right: 2,
                    },
                },
                title: {
                    right: 0,
                    padding: InsetsMake(24, 0, 0, 32),
                },
                subtitle: {
                    right: 0,
                    padding: InsetsMake(8, 0, 24, 32),
                }
            },
            {
                id: "bottom-left",
                name: "Bottom Left",
                left: "$horizontalMargin",
                bottom: "$verticalMargin",
                background: {
                    border: {
                        color: "$secondary",
                        margin: InsetsMake(24, 0, 0, 0),
                        left: 2,
                    }
                },
                title: {
                    left: 0,
                },
                subtitle: {
                    left: 0,
                }
            },
            {
                id: "bottom-center",
                name: "Bottom Center",
                bottom: "$verticalMargin",
                background: {
                    border: {
                        color: "$secondary",
                        margin: InsetsMake(24, 0, 0, 0),
                        left: 2,
                    }
                },
                title: {
                    left: 0,
                },
                subtitle: {
                    left: 0,
                }
            },
            {
                id: "bottom-right",
                name: "Bottom Right",
                right: "$horizontalMargin",
                bottom: "$verticalMargin",
                background: {
                    border: {
                        color: "$secondary",
                        margin: InsetsMake(24, 0, 0, 0),
                        right: 2,
                    }
                },
                title: {
                    right: 0,
                    padding: InsetsMake(24, 24, 0, 32),
                },
                subtitle: {
                    right: 0,
                    padding: InsetsMake(8, 24, 56, 32),
                }
            },
        ]
    },

    // Based on the built-in Graphic style
    Paint: {
        name: "Paint",
        id: "paint",
        variables: {
            primary: new Paint.Color("#FFFFFF"),
            secondary: new Paint.Color("rgba(0, 0, 0, 0.80)"),
            tertiary: new Paint.Color("#FD5A47"),
            fontFace: "Bebas Neue",
        },
        base: {
            bottom: 36,
            title: {
                foregroundColor: "$primary",
                backgroundColor: "$secondary",
                font: new Font({ family: "serif", size: 84 }),
                fontFace: "$fontFace",
                padding: InsetsMake(28, 40, 24, 40),
                bottom: 0,
            },
            subtitle: {
                foregroundColor: "$primary",
                backgroundColor: "$tertiary",
                font: new Font({ family: "serif", size: 36 }),
                fontFace: "$fontFace",
                padding: InsetsMake(18, 40, 12, 40),
                top: 0,
            }
        },
        defaultVariant: 1,
        variants: [
            {
                id: "bottom-left",
                name: "Bottom Left",
                left: 0,
                title: {
                    left: 0,
                    margin: InsetsMake(0, 0, 0, 48),
                },
                subtitle: {
                    right: 0,
                    margin: InsetsMake(-16, 0, 0, 0),
                }
            },
            {
                id: "bottom-center",
                name: "Center",
                subtitle: {
                    margin: InsetsMake(-16, 0, 0, 0),
                }
            },
            {
                id: "bottom-right",
                name: "Bottom Right",
                right: 0,
                title: {
                    right: 0,
                    margin: InsetsMake(0, 48, 0, 0),
                },
                subtitle: {
                    left: 0,
                    margin: InsetsMake(-16, 0, 0, 0),
                }
            },
        ],
    },

    BuildingBlocks: {
        name: "Building Blocks",
        id: "building-blocks",
        variables: {
            primary: new Paint.Color("#0B1347"),
            secondary: new Paint.Color("#FFFFFF"),
            fontFace: "Archivo Black",
        },
        base: {
            bottom: 36,
            title: {
                foregroundColor: "$primary",
                backgroundColor: "$secondary",
                font: new Font({ family: "serif", size: 80 }),
                fontFace: "$fontFace",
                padding: InsetsMake(28, 40, 28, 40),
                bottom: 0,
            },
            subtitle: {
                foregroundColor: "$secondary",
                backgroundColor: "$primary",
                font: new Font({ family: "serif", size: 32 }),
                fontFace: "$fontFace",
                padding: InsetsMake(18, 40, 18, 40),
                top: 0,
            }
        },
        defaultVariant: 1,
        variants: [
            {
                name: "Bottom Left",
                id: "bottom-left",
                left: 0,
                title: {
                    left: 0,
                    margin: InsetsMake(0, 0, 0, 48),
                },
                subtitle: {
                    right: 0,
                    margin: InsetsMake(-16, 0, 0, 0),
                }
            },
            {
                name: "Center",
                id: "bottom-center",
                subtitle: {
                    margin: InsetsMake(-16, 0, 0, 0)
                }
            },
            {
                name: "Bottom Right",
                id: "bottom-right",
                right: 0,
                title: {
                    right: 0,
                    margin: InsetsMake(0, 48, 0, 0),
                },
                subtitle: {
                    left: 0,
                    margin: InsetsMake(-16, 0, 0, 0),
                }

            }
        ],
    },

    Geometric: {
        name: "Geometric",
        id: "geometric",
        variables: {
            primary: new Paint.Color("#FFFFFF"),
            secondary: new Paint.Color("#FD5A47"),
            tertiary: new Paint.Color("#1A1F3D"),
            fontFace: "Rubik",
            margin: 36,
        },
        base: {
            bottom: "$margin",
            title: {
                foregroundColor: "$primary",
                backgroundColor: "$secondary",
                font: new Font({ family: "serif", size: 80 }),
                fontFace: "$fontFace",
                padding: InsetsMake(28, 40, 28, 40),
                bottom: 0,
            },
            subtitle: {
                foregroundColor: "$primary",
                backgroundColor: "$tertiary",
                font: new Font({ family: "serif", size: 32 }),
                fontFace: "$fontFace",
                padding: InsetsMake(18, 40, 18, 40),
                top: 0,
            }
        },
        defaultVariant: 1,
        variants: [
            {
                name: "Bottom Left",
                id: "bottom-left",
                left: "$margin",
                title: {
                    left: 0,
                    margin: InsetsMake(0, 0, 0, 36),
                },
                subtitle: {
                    right: 0,
                    margin: InsetsMake(-16, 0, 0, 0),
                }
            },
            {
                name: "Bottom",
                id: "bottom-center",
                subtitle: {
                    margin: InsetsMake(-16, 0, 0, 0)
                }
            },
            {
                name: "Bottom Right",
                id: "bottom-right",
                right: "$margin",
                title: {
                    right: 0,
                    margin: InsetsMake(0, 36, 0, 0),
                },
                subtitle: {
                    left: 0,
                    margin: InsetsMake(-16, 0, 0, 0),
                }
            }
        ],
    },

    HexGrid: {
        name: "Hex Grid",
        id: "hex-grid",
        variables: {
            primary: new Paint.Color("#000000"),
            secondary: new Paint.Color("#FFFFFF"),
            fontFace: "Figtree",
            verticalMargin: 80,
            horizontalMargin: 0,
        },
        base: {
            bottom: "$verticalMargin",
            title: {
                foregroundColor: "$primary",
                backgroundColor: "$secondary",
                top: 0,
                margin: InsetsMake(0, 0, 8, 0),
                padding: InsetsMake(24, 70, 24, 70),
                font: new Font({ family: "serif", size: 64 }),
                fontFace: "$fontFace",
                textTransform: "uppercase"
            },
            subtitle: {
                foregroundColor: "$primary",
                backgroundColor: "$secondary",
                padding: InsetsMake(24, 50, 24, 50),
                font: new Font({ family: "serif", size: 32 }),
                fontFace: "$fontFace",
                bottom: 0,
                textTransform: "uppercase"
            }
        },
        defaultVariant: 1,
        variants: [
            {
                id: "bottom-left",
                name: "Bottom Left",
                left: 0,
                title: {
                    padding: InsetsMake(24, 50, 24, 70),
                    clipPoints: [
                        PointMake(0, 0),
                        PointMake(0, 0),
                        PointMake(0, 0),
                        PointMake(30, 0),
                    ],
                },
                subtitle: {
                    left: 0,
                    clipPoints: [
                        PointMake(0, 0),
                        PointMake(0, 0),
                        PointMake(0, 0),
                        PointMake(20, 0),
                    ],
                }
            },
            {
                id: "bottom-center",
                name: "Center",
                title: {
                    clipPoints: [
                        PointMake(0, 0),
                        PointMake(0, 0),
                        PointMake(30, 0),
                        PointMake(30, 0),
                    ],
                },
                subtitle: {
                    clipPoints: [
                        PointMake(0, 0),
                        PointMake(0, 0),
                        PointMake(20, 0),
                        PointMake(20, 0),
                    ],
                }
            },
            {
                id: "bottom-right",
                name: "Bottom Right",
                right: 0,
                title: {
                    padding: InsetsMake(24, 70, 24, 50),
                    clipPoints: [
                        PointMake(0, 0),
                        PointMake(0, 0),
                        PointMake(30, 0),
                        PointMake(0, 0),
                    ],
                },
                subtitle: {
                    right: 0,
                    clipPoints: [
                        PointMake(0, 0),
                        PointMake(0, 0),
                        PointMake(20, 0),
                        PointMake(0, 0),
                    ],
                }
            },
        ],
    },

    HexNeon: {
        name: "Hex Neon",
        id: "hex-neon",
        variables: {
            primary: new Paint.Color("#FFFFFF"),
            fontFace: "Figtree Italic",
            horizontalMargin: 60,
            verticalMargin: 60,
        },
        base: {
            bottom: "$verticalMargin",
            title: {
                foregroundColor: "$primary",
                font: new Font({ family: "serif", size: 88 }),
                fontFace: "$fontFace",
                textTransform: "uppercase",
                bottom: 0,
                padding: InsetsMake(24, 48, 24, 48),
                border: {
                    color: "$primary",
                    top: 8,
                    bottom: 8,
                    left: 8,
                    right: 8,
                },
            },
            subtitle: {
                foregroundColor: "$primary",
                font: new Font({ family: "serif", size: 40 }),
                fontFace: "$fontFace",
                top: 0,
                padding: InsetsMake(24, 48, 24, 48),
                margin: InsetsMake(0, 0, -8, 0),
                border: {
                    color: "$primary",
                    top: 8,
                    bottom: 8,
                    left: 8,
                    right: 8,
                },
            }
        },
        defaultVariant: 1,
        variants: [
            {
                left: "$horizontalMargin",
                id: "bottom-left",
                name: "Bottom Left",
                subtitle: {
                    left: 0,
                }
            },
            {
                id: "bottom-center",
                name: "Center",
            },
            {
                right: "$horizontalMargin",
                id: "bottom-right",
                name: "Bottom Right",
                subtitle: {
                    right: 0,
                }
            },
        ],
    },

    MotionCut: {
        name: "Motion Cut",
        id: "motion-cut",
        variables: {
            primary: new Paint.Color("#FFFFFF"),
            secondary: new Paint.Color("rgba(0, 0, 0, 0.50)"),
            fontFace: "Figtree Italic",
        },
        base: {
            background: {
                paint: "$secondary",
                border: {
                    color: "$primary",
                    bottom: 8,
                },
            },
            bottom: 0,
            title: {
                foregroundColor: "$primary",
                font: new Font({ family: "serif", size: 88 }),
                fontFace: "$fontFace",
                textTransform: "uppercase",
                top: 0,
                padding: InsetsMake(40, 40, 12, 48),
            },
            subtitle: {
                foregroundColor: "$primary",
                font: new Font({ family: "serif", size: 36 }),
                fontFace: "$fontFace",
                textTransform: "uppercase",
                bottom: 0,
                padding: InsetsMake(0, 40, 40, 40),
                margin: InsetsMake(0, 0, -8, 0),
            }
        },
        defaultVariant: 0,
        variants: [
            {
                name: "Center",
                id: "bottom-fill",
                left: 0,
                right: 0,
            },
        ],
    },

    Angles: {
        name: "Angles",
        id: "angles",
        variables: {
            primary: new Paint.Color("#FFFFFF"),
            secondary: new Paint.Color("#FF5724"),
            tertiary: new Paint.LinearGradient([["rgba(0,0,0,0)", 0.5, 0], ["rgba(0,0,0,1)", 0.5, 1]]),
            fontFace: "Montagu Slab SemiBold",
        },
        base: {
            background: {
                paint: "$tertiary",
            },
            bottom: 0,
            left: 0,
            right: 0,
            title: {
                foregroundColor: "$primary",
                font: new Font({ family: "serif", size: 72 }),
                fontFace: "$fontFace",
                padding: InsetsMake(148, 96, 92, 96),
                top: 0,
                margin: InsetsMake(0, 0, -73, 0),
                border: {
                    margin: InsetsMake(200, 96, 0, 96),
                    color: "$secondary",
                    bottom: 4,
                }
            },
            subtitle: {
                foregroundColor: "$primary",
                font: new Font({ family: "serif", size: 32 }),
                fontFace: "$fontFace",
                padding: InsetsMake(0, 96, 32, 96),
                bottom: 64,
                textTransform: "uppercase",
                border: {
                    margin: InsetsMake(0, 96, 0, 96),
                    color: "$secondary",
                    bottom: 4,
                }
            }
        },
        defaultVariant: 1,
        variants: [
            {
                id: "left",
                name: "Left",
                title: {
                    left: 0,
                },
                subtitle: {
                    left: 0,
                },
            },

            {
                id: "center",
                name: "Center",
            },

            {
                id: "right",
                name: "Right",
                title: {
                    right: 0,
                },
                subtitle: {
                    right: 0,
                },
            },
        ],
    },

    MysticGlow: {
        name: "Glow Dark",
        id: "mystic-glow",
        variables: {
            primary: new Paint.Color("#FFFFFF"),
            secondary: new Paint.LinearGradient([
                ["rgba(0, 0, 0,0.85)", 0.5, 0],
                ["rgba(0, 0, 0,0.15)", 0.5, 1]
            ]),
            fontFace: "Oswald",
        },
        base: {
            bottom: 32,
            title: {
                foregroundColor: "$primary",
                backgroundColor: "$secondary",
                font: new Font({ family: "san serif", size: 80 }),
                fontFace: "$fontFace",
                padding: InsetsMake(12, 32, 12, 32),
                top: 0,
                textTransform: "uppercase"
            },
            subtitle: {
                foregroundColor: "$primary",
                backgroundColor: "$secondary",
                font: new Font({ family: "serif", size: 40 }),
                fontFace: "$fontFace",
                padding: InsetsMake(12, 32, 12, 32),
                bottom: 0,
                textTransform: "uppercase"
            }
        },
        defaultVariant: 1,
        variants: [
            {
                name: "Bottom Left",
                id: "bottom-left",
                left: 0,
                title: {
                    left: 0,
                },
                subtitle: {
                    left: 0,
                    margin: InsetsMake(8, 0, 0, 0),
                }
            },
            {
                name: "Center",
                id: "bottom-center",
                subtitle: {
                    margin: InsetsMake(8, 0, 0, 0)
                }
            },
            {
                name: "Bottom Right",
                id: "bottom-right",
                right: 0,
                title: {
                    right: 0,
                },
                subtitle: {
                    right: 0,
                    margin: InsetsMake(8, 0, 0, 0),
                }
            }
        ],
    },

    SherbertGlow: {
        name: "Glow Light",
        id: "sherbert-glow",
        variables: {
            primary: new Paint.Color("#220E4E"),
            secondary: new Paint.LinearGradient([
                ["rgba(255,255,255,0.25)", 0.5, 0],
                ["rgba(255,255,255,0.65)", 0.5, 1]
            ]),
            fontFace: "Oswald",
        },
        base: {
            bottom: 32,
            title: {
                foregroundColor: "$primary",
                backgroundColor: "$secondary",
                font: new Font({ family: "serif", size: 80 }),
                fontFace: "$fontFace",
                padding: InsetsMake(12, 32, 12, 32),
                top: 0,
                textTransform: "uppercase"
            },
            subtitle: {
                foregroundColor: "$primary",
                backgroundColor: "$secondary",
                font: new Font({ family: "serif", size: 40 }),
                fontFace: "$fontFace",
                padding: InsetsMake(12, 32, 12, 32),
                bottom: 0,
                textTransform: "uppercase"
            }
        },
        defaultVariant: 1,
        variants: [
            {
                name: "Bottom Left",
                id: "bottom-left",
                left: 0,
                title: {
                    left: 0,
                },
                subtitle: {
                    left: 0,
                    margin: InsetsMake(8, 0, 0, 0),
                }
            },
            {
                name: "Center",
                id: "bottom-center",
                subtitle: {
                    margin: InsetsMake(8, 0, 0, 0)
                }
            },
            {
                name: "Bottom Right",
                id: "bottom-right",
                right: 0,
                title: {
                    right: 0,
                },
                subtitle: {
                    right: 0,
                    margin: InsetsMake(8, 0, 0, 0),
                }
            }
        ],
    },

    LumonTerminal:{
        name: "Lumon Terminal",
        id: "lumon-terminal",
        variables: {
            primary: new Paint.Color("#60E4F0"),
            secondary: new Paint.Color("#008894"),
            fontFace: "IBM Plex Mono",
        },
        base: {
            background: {
            },
            title: {
                foregroundColor: "$primary",
                font: new Font({ family: "serif", size: 30 }),
                fontFace: "$fontFace",
                padding: InsetsMake(24, 0, 24, 0),
                border: {
                    color: "$secondary",
                    top: 2,
                    length: InsetsMake(32, 0, 0, 0),
                },
                top: 0,
                left: 0,
                textTransform: "uppercase",
            },
            subtitle: {
                foregroundColor: "$primary",
                font: new Font({ family: "serif", size: 30 }),
                fontFace: "$fontFace",
                padding: InsetsMake(24, 0, 0, 0),
                border: {
                    color: "$secondary",
                    top: 2,
                    length: InsetsMake(32, 0, 0, 0),
                },
                bottom: 0,
                left: 0,
                textTransform: "uppercase",
            }
        },
        defaultVariant: 0,
        variants: [
            {
                id: "top-left",
                name: "Top Left",
                bottom: 186,
                left: 120,
            },
        ],
    },

    LumonCorp: {
        name: "Lumon Corp",
        id: "lumon-corp",
        variables: {
            primary: new Paint.Color("#050B1B"),
            fontFace: "Michroma Regular",
            verticalMargin: 68,
            horizontalMargin: 50,
        },
        base: {
            background: {
                border: {
                    margin: InsetsMake(4, 0, 2, 0),
                    color: "$primary",
                    left: 12,
                }
            },
            title: {
                foregroundColor: "$primary",
                font: new Font({ family: "serif", size: 30 }),
                fontFace: "$fontFace",
                padding: InsetsMake(0, 52, 0, 0),
                top: 0,
                textTransform: "uppercase",
            },
            subtitle: {
                foregroundColor: "$primary",
                font: new Font({ family: "serif", size: 30 }),
                fontFace: "$fontFace",
                padding: InsetsMake(8, 52, 0, 0),
                bottom: 0,
                textTransform: "uppercase",
            }
        },
        defaultVariant: 0,
        variants: [
            {
                id: "top-left",
                name: "Top Left",
                top: "$verticalMargin",
                left: "$horizontalMargin",
                maxWidth: 1100,
                title: {
                    horizontalAlignment: AdvancedTextLayer.HorizontalAlignment.Left,
                    left: 0,
                },
                subtitle: {
                    horizontalAlignment: AdvancedTextLayer.HorizontalAlignment.Left,
                    left: 0,
                },
            },
            {
                id: "top-right",
                name: "Top Right",
                top: "$verticalMargin",
                right: "$horizontalMargin",
                maxWidth: 1100,
                background: {
                    border: {
                        margin: InsetsMake(4, 0, 2, 0),
                        color: "$primary",
                        right: 12,
                    }
                },
                title: {
                    horizontalAlignment: AdvancedTextLayer.HorizontalAlignment.Right,
                    right: 0,
                    padding: InsetsMake(0, 0, 0, 52),
                },
                subtitle: {
                    horizontalAlignment: AdvancedTextLayer.HorizontalAlignment.Right,
                    right: 0,
                    padding: InsetsMake(8, 0, 0, 52),
                },
            },
        ],
    },

    Zissou: {
        name: "Zissou Society",
        id: "zissou",
        variables: {
            primary: new Paint.Color("#F8F60B"),
            fontFace: "Figtree",
            verticalMargin: 60,
            horizontalMargin: 160,
        },
        base: {
            title: {
                foregroundColor: "$primary",
                font: new Font({ family: "serif", size: 80 }),
                fontFace: "$fontFace",
                top: 0,
                textTransform: "uppercase",
            },
            subtitle: {
                foregroundColor: "$primary",
                font: new Font({ family: "serif", size: 32 }),
                fontFace: "$fontFace",
                bottom: 0,
                textTransform: "uppercase",
            }
        },
        defaultVariant: 2,
        variants: [
            {
                id: "bottom-left",
                name: "Bottom Left",
                left: "$horizontalMargin",
                bottom: "$verticalMargin",
                title: {
                    horizontalAlignment: AdvancedTextLayer.HorizontalAlignment.Left,
                    left: 0,
                },
                subtitle: {
                    horizontalAlignment: AdvancedTextLayer.HorizontalAlignment.Left,
                    left: 0,
                },
            },
            {
                id: "bottom-center",
                name: "Bottom Center",
                bottom: "$verticalMargin",
                title: {
                    horizontalAlignment: AdvancedTextLayer.HorizontalAlignment.Center,
                },
                subtitle: {
                    horizontalAlignment: AdvancedTextLayer.HorizontalAlignment.Center,
                },
            },
            {
                id: "bottom-right",
                name: "Bottom Right",
                right: "$horizontalMargin",
                bottom: "$verticalMargin",
                title: {
                    horizontalAlignment: AdvancedTextLayer.HorizontalAlignment.Right,
                    right: 0,
                },
                subtitle: {
                    horizontalAlignment: AdvancedTextLayer.HorizontalAlignment.Right,
                    right: 0,
                },
            },
        ],
    },


    DunderMifflin: {
        name: "Dunder Mifflin",
        id: "dunder-mifflin",
        variables: {
            primary: new Paint.Color("#FFFFFF"),
            secondary: new Paint.Color("rgba(0, 0, 0, 0.5)"),
            fontFace: "Bebas Neue",
            verticalMargin: 0,
            horizontalMargin: 0,
        },
        base: {
            left: 0,
            right: 0,
            background: {
                paint: "$secondary",
            },
            title: {
                foregroundColor: "$primary",
                font: new Font({ family: "serif", size: 64 }),
                fontFace: "$fontFace",
                padding: InsetsMake(33, 120, 0, 0),
                top: 0,
                textTransform: "uppercase",
            },
            subtitle: {
                foregroundColor: "$primary",
                font: new Font({ family: "serif", size: 32 }),
                fontFace: "$fontFace",
                padding: InsetsMake(0, 120, 60, 0),
                bottom: 0,
                textTransform: "uppercase",
            }
        },
        defaultVariant: 0,
        variants: [
            {
                id: "bottom-left",
                name: "Bottom Left",
                bottom: "$verticalMargin",
                title: {
                    horizontalAlignment: AdvancedTextLayer.HorizontalAlignment.Left,
                    left: 0,
                    padding: InsetsMake(33, 120, 0, 0),
                },
                subtitle: {
                    horizontalAlignment: AdvancedTextLayer.HorizontalAlignment.Left,
                    left: 0,
                    padding: InsetsMake(0, 120, 60, 0),
                },
            },
            {
                id: "bottom-center",
                name: "Bottom Center",
                bottom: "$verticalMargin",
                title: {
                    horizontalAlignment: AdvancedTextLayer.HorizontalAlignment.Center,
                    padding: InsetsMake(33, 0, 0, 0),
                },
                subtitle: {
                    horizontalAlignment: AdvancedTextLayer.HorizontalAlignment.Center,
                    padding: InsetsMake(0, 0, 60, 0),
                },
            },
            {
                id: "bottom-right",
                name: "Bottom Right",
                bottom: "$verticalMargin",
                title: {
                    horizontalAlignment: AdvancedTextLayer.HorizontalAlignment.Right,
                    right: 0,
                    padding: InsetsMake(33, 0, 0, 120),
                },
                subtitle: {
                    horizontalAlignment: AdvancedTextLayer.HorizontalAlignment.Right,
                    right: 0,
                    padding: InsetsMake(0, 0, 60, 120),
                },
            },
        ],
    },

    Dune: {
        name: "Dune",
        id: "dune",
        variables: {
            primary: new Paint.Color("#000000"),
            fontFace: "Dune Rise",
            verticalMargin: 55,
            horizontalMargin: 125,
        },
        base: {
            title: {
                foregroundColor: "$primary",
                font: new Font({ family: "serif", size: 60 }),
                fontFace: "$fontFace",
                top: 0,
                textTransform: "uppercase",
            },
            subtitle: {
                foregroundColor: "$primary",
                font: new Font({ family: "serif", size: 28 }),
                fontFace: "$fontFace",
                bottom: 0,
                padding: InsetsMake(20, 0, 0, 0),
                textTransform: "uppercase",
            }
        },
        defaultVariant: 0,
        variants: [
            {
                id: "top-left",
                name: "Top Left",
                left: "$horizontalMargin",
                top: "$verticalMargin",
                title: {
                    horizontalAlignment: AdvancedTextLayer.HorizontalAlignment.Left,
                    left: 0,
                },
                subtitle: {
                    horizontalAlignment: AdvancedTextLayer.HorizontalAlignment.Left,
                    left: 0,
                },
            },
            {
                id: "top-center",
                name: "Top Center",
                top: "$verticalMargin",
                title: {
                    horizontalAlignment: AdvancedTextLayer.HorizontalAlignment.Center,
                },
                subtitle: {
                    horizontalAlignment: AdvancedTextLayer.HorizontalAlignment.Center,
                },
            },
            {
                id: "top-right",
                name: "Top Right",
                right: "$horizontalMargin",
                top: "$verticalMargin",
                title: {
                    horizontalAlignment: AdvancedTextLayer.HorizontalAlignment.Right,
                    right: 0,
                },
                subtitle: {
                    horizontalAlignment: AdvancedTextLayer.HorizontalAlignment.Right,
                    right: 0,
                },
            },
        ],
    },

    Monochrome: {
        name: "Monochrome",
        id: "monochrome",
        variables: {
            primary: new Paint.Color("#000000"),
            fontFace: "Instrument Serif",
            verticalMargin: 10,
            horizontalMargin: 50,
        },
        base: {
            maxWidth: 1820,
            title: {
                foregroundColor: "$primary",
                font: new Font({ family: "serif", size: 210 }),
                fontFace: "$fontFace",
                top: 0,
                left: 0,
                right: 0,
                textTransform: "uppercase",
            },
            subtitle: {
                foregroundColor: "$primary",
                font: new Font({ family: "serif", size: 60 }),
                fontFace: "$fontFace",
                bottom: 0,
                left: 0,
                right: 0,
                textTransform: "uppercase",
            }
        },
        defaultVariant: 2, // top-right
        variants: [
            {
                id: "top-left",
                name: "Top Left",
                left: "$horizontalMargin",
                top: "$verticalMargin",
                title: {
                    horizontalAlignment: AdvancedTextLayer.HorizontalAlignment.Left,
                },
                subtitle: {
                    horizontalAlignment: AdvancedTextLayer.HorizontalAlignment.Left,
                },
            },
            {
                id: "top-center",
                name: "Top Center",
                top: "$verticalMargin",
                title: {
                    horizontalAlignment: AdvancedTextLayer.HorizontalAlignment.Center,
                },
                subtitle: {
                    horizontalAlignment: AdvancedTextLayer.HorizontalAlignment.Center,
                },
            },
            {
                id: "top-right",
                name: "Top Right",
                right: "$horizontalMargin",
                top: "$verticalMargin",
                title: {
                    horizontalAlignment: AdvancedTextLayer.HorizontalAlignment.Right,
                },
                subtitle: {
                    horizontalAlignment: AdvancedTextLayer.HorizontalAlignment.Right,
                },
            },
            {
                id: "center-left",
                name: "Center Left",
                left: "$horizontalMargin",
                maxWidth: 910,
                title: {
                    horizontalAlignment: AdvancedTextLayer.HorizontalAlignment.Left,
                },
                subtitle: {
                    horizontalAlignment: AdvancedTextLayer.HorizontalAlignment.Left,
                },
            },
            {
                id: "center-right",
                name: "Center Right",
                right: "$horizontalMargin",
                maxWidth: 910,
                title: {
                    horizontalAlignment: AdvancedTextLayer.HorizontalAlignment.Right,
                },
                subtitle: {
                    horizontalAlignment: AdvancedTextLayer.HorizontalAlignment.Right,
                },
            },
            {
                id: "bottom-left",
                name: "Bottom Left",
                left: "$horizontalMargin",
                bottom: "$verticalMargin",
                title: {
                    horizontalAlignment: AdvancedTextLayer.HorizontalAlignment.Left,
                },
                subtitle: {
                    horizontalAlignment: AdvancedTextLayer.HorizontalAlignment.Left,
                },
            },
            {
                id: "bottom-center",
                name: "Bottom Center",
                bottom: "$verticalMargin",
                title: {
                    horizontalAlignment: AdvancedTextLayer.HorizontalAlignment.Center,
                },
                subtitle: {
                    horizontalAlignment: AdvancedTextLayer.HorizontalAlignment.Center,
                },
            },
            {
                id: "bottom-right",
                name: "Bottom Right",
                right: "$horizontalMargin",
                bottom: "$verticalMargin",
                title: {
                    horizontalAlignment: AdvancedTextLayer.HorizontalAlignment.Right,
                },
                subtitle: {
                    horizontalAlignment: AdvancedTextLayer.HorizontalAlignment.Right,
                },
            },
        ]
    },

    HolidayCraft: {
        name: "Holiday",
        id: "holiday-craft",
        variables: {
            primary: new Paint.Color("#FFFFFF"),
            secondary: new Paint.LinearGradient([["rgba(255,255,255,1)", 0.5, 0], ["rgba(202,0,0,1)", 0.5, 1]]),
            fontFace: "Jacquard",
            verticalMargin: 0,
            horizontalMargin: 0,
        },
        base: {
            left: 0,
            right: 0,
            background: {
                paint: "$secondary",
            },
            title: {
                foregroundColor: "$primary",
                font: new Font({ family: "serif", size: 160 }),
                fontFace: "$fontFace",
                padding: InsetsMake(33, 120, 0, 0),
                top: 0,
            },
            subtitle: {
                foregroundColor: "$primary",
                font: new Font({ family: "serif", size: 80 }),
                fontFace: "$fontFace",
                padding: InsetsMake(0, 120, 60, 0),
                bottom: 0,
            }
        },
        defaultVariant: 1,
        variants: [
            {
                id: "bottom-left",
                name: "Bottom Left",
                bottom: "$verticalMargin",
                title: {
                    horizontalAlignment: AdvancedTextLayer.HorizontalAlignment.Left,
                    left: 0,
                    padding: InsetsMake(33, 120, 0, 0),
                },
                subtitle: {
                    horizontalAlignment: AdvancedTextLayer.HorizontalAlignment.Left,
                    left: 0,
                    padding: InsetsMake(0, 120, 60, 0),
                },
            },
            {
                id: "bottom-center",
                name: "Bottom Center",
                bottom: "$verticalMargin",
                title: {
                    horizontalAlignment: AdvancedTextLayer.HorizontalAlignment.Center,
                    padding: InsetsMake(33, 0, 0, 0),
                },
                subtitle: {
                    horizontalAlignment: AdvancedTextLayer.HorizontalAlignment.Center,
                    padding: InsetsMake(0, 0, 60, 0),
                },
            },
            {
                id: "bottom-right",
                name: "Bottom Right",
                bottom: "$verticalMargin",
                title: {
                    horizontalAlignment: AdvancedTextLayer.HorizontalAlignment.Right,
                    right: 0,
                    padding: InsetsMake(33, 0, 0, 120),
                },
                subtitle: {
                    horizontalAlignment: AdvancedTextLayer.HorizontalAlignment.Right,
                    right: 0,
                    padding: InsetsMake(0, 0, 60, 120),
                },
            },
        ],
    },
})

Media.NameBadge.StyleWithID = function (styleID) {
    for (let key in Media.NameBadge.Styles) {
        const style = Media.NameBadge.Styles[key];
        if (style.id == styleID) {
            return style;
        }
    }
    return null;
}

Media.NameBadge.StyleTest = function () {
    const a = Object.keys(Media.NameBadge.Styles);
    let ai = 0;
    let bi = 0;
    let t = window.setInterval(() => {
        const key = a[ai];
        const style = Media.NameBadge.Styles[key];
        gApp.stage.media[0].applyStyle(style, bi);
        bi += 1;
        if (bi >= style.variants.length) {
            bi = 0;
            ai += 1;
        }
        if (ai >= a.length) {
            window.clearInterval(t);
            ai = 0;
        }
    }, 1000);
}
