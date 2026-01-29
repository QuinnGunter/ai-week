//
//  hex.js
//  mmhmm
//
//  Created by Seth Hitchings on 11/5/2025
//  Copyright 2025 mmhmm inc. All rights reserved.
//

LookPreset.Hex = class {

    static Wallpapers = {
        Grid: "854ce9c3-282e-4251-9c26-7b1f8fd793ec",
        Neon: "cd47a444-f9e3-4719-9135-dfc780c0c70a",
    }

    static Logos = {
        Neon: { url: "assets/looks/presets/hex/logo-neon.png" },
    }

    static nametagOptions() {
        return [
            Media.NameBadge.Styles.HexGrid,
            Media.NameBadge.Styles.HexNeon,
        ];
    }

    static Overlays = {
        Grid: new LookOverlay(LocalizedString("Hex Grid"), "frame-grid", "png.68628.sha1.283e695952b00989aecb8fb6a3aa9c007ab3584a", "assets/looks/presets/hex"),
    }

    static Colors = {
        Grid: {
            // TODO The color picker panel doesn't handle alpha - applying
            // one of these options will lose the alpha component
            tint: LooksColors.solidPaintForColorWithAlpha("#707070", 0.7),
        },
        Neon: {
            tint: LooksColors.solidPaintForColorWithAlpha("#3B1F56", 0.7),
        }
    }

    static defaultTint() {
        return this.Colors.Grid.tint;
    }

    static tintOptions() {
        return Object.values(this.Colors).map(colorSet => colorSet.tint);
    }

    // nametagStyleOptions

    static Preset = new LookPreset("hex", LocalizedString("Hex"))
        .setThumbnailUrl("assets/looks/presets/hex/grid.png")
        .setNametagStyle(Media.NameBadge.Styles.HexGrid)
        .setShape(Presenter.Shape.Polygon)
        .setShapeEditable(false)
        .setNametagStyle(Media.NameBadge.Styles.HexGrid)
        .setNametagStyleOptions(this.nametagOptions())
        .setBackgroundStyle(Presenter.BackgroundStyle.Hide)
        .setTint(this.defaultTint())
        .setTintOptions(this.tintOptions())
        .setLogoOptions(Object.values(this.Logos))
        .setAnchorInset(40)
        .setLogoScale(0)
        .setPatternEditable(false)
        .setOverlay(this.Overlays.Grid)
        .setOverlayOptions(Object.values(this.Overlays))
        .setCustomOverlayEnabled(false)
        .setWallpaper(this.Wallpapers.Grid)
        .setWallpaperNoneEnabled(false)
        .addVariant({
            id: "grid",
            name: LocalizedString("Grid"),
            thumbnailUrl: "assets/looks/presets/hex/grid.png",
            backgroundStyle: Presenter.BackgroundStyle.Hide,
            tint: this.Colors.Grid.tint,
            overlay: this.Overlays.Grid,
            nametagStyle: Media.NameBadge.Styles.HexGrid,
            wallpaper: this.Wallpapers.Grid,
        })
        .addVariant({
            id: "neon",
            name: LocalizedString("Neon"),
            thumbnailUrl: "assets/looks/presets/hex/neon.png",
            tint: this.Colors.Neon.tint,
            logo: this.Logos.Neon.url,
            overlay: null,
            nametagStyle: Media.NameBadge.Styles.HexNeon,
            wallpaper: this.Wallpapers.Neon,
        });

}
