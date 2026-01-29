//
//  black_and_white.js
//  mmhmm
//
//  Created by Seth Hitchings on 10/31/2025
//  Copyright 2025 mmhmm inc. All rights reserved.
//

LookPreset.BlackAndWhite = class {

    static Preset = new LookPreset("black_and_white", LocalizedString("Black and White"))
        .setThumbnailUrl("assets/looks/presets/black_and_white/show.png")
        .setNametagStyle(Media.NameBadge.Styles.Tinted)
        .setShapeEditable(false)
        .setBackgroundStyle(Presenter.BackgroundStyle.Show)
        .setTintEditable(false)
        .setPresenterEffect(NewFilterWithID(BlackAndWhiteFilter.identifier))
        .setOverlay(LookOverlays.ThinBorder)

        // This could work well with both style and wallpaper enabled:
        // If I choose a wallpaper, set the style to hidden
        // If I set the wallpaper to none, set the style to show
        // If I change the style, set the wallpaper to none

        // This could complete https://github.com/All-Turtles/mmhmm-camera/pull/35/files

        // Then we could highlight some wallpaper options, but also make the
        // whole catalog available

        .addVariant({
            id: "show",
            name: LocalizedString("Background visible"),
            thumbnailUrl: "assets/looks/presets/black_and_white/show.png",
            backgroundStyle: Presenter.BackgroundStyle.Show,
        })
        .addVariant({
            id: "blur",
            name: LocalizedString("Background blurred"),
            thumbnailUrl: "assets/looks/presets/black_and_white/blur.png",
            backgroundStyle: Presenter.BackgroundStyle.Blur,
        })
        // .addVariant({
        //     id: "hide",
        //     name: LocalizedString("Hide"),
        //     thumbnailUrl: "assets/looks/presets/black_and_white/hide.png",
        //     backgroundStyle: Presenter.BackgroundStyle.Hide,
        // })


}
