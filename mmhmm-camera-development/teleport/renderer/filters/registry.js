//
//  registry.js
//  mmhmm
//
//  Created by Steve White on 8/30/21.
//  Copyright © 2021 mmhmm, inc. All rights reserved.
//

var gPresenterFilterRegistry = null;
const PresenterFilterStyle = {
    PresenterOnly: "PresenterOnly",
    EntireStage: "EntireStage"
};

function PresenterFilterRegistry() {
    if (gPresenterFilterRegistry == null) {
        gPresenterFilterRegistry = [
        {
            class: BlackAndWhiteFilter,
            title: LocalizedString("Black and White"),
            thumbnail: "filter_bw.png",
            style: PresenterFilterStyle.PresenterOnly,
            appearancePane: true,
        },
        {
            class: PixelizeFilter,
            title: LocalizedString("Pixelize"),
            thumbnail: "filter_pixelize.png",
            style: PresenterFilterStyle.PresenterOnly,
            appearancePane: true,
        },
        {
            class: ComplementsFilter,
            title: LocalizedString("Complements"),
            thumbnail: "filter_complements.png",
            style: PresenterFilterStyle.PresenterOnly,
            appearancePane: true,
        },
        {
            class: SkinSoftenFilter,
            title: LocalizedString("Touch Up"),
            thumbnail: "filter_touchup.png",
            style: PresenterFilterStyle.PresenterOnly,
            appearancePane: false,
        },
        {
            class: HandheldGameFilter,
            title: LocalizedString("Handheld Game Console"),
            thumbnail: "filter_handheld.png",
            style: PresenterFilterStyle.PresenterOnly,
            appearancePane: true,
        },
        {
            class: TransmissionFilter,
            title: LocalizedString("Glitch"),
            thumbnail: "filter_transmission.png",
            style: PresenterFilterStyle.PresenterOnly,
            appearancePane: true,
        },
        {
            class: RainFilter,
            title: LocalizedString("Rain"),
            thumbnail: "filter_rain.png",
            style: PresenterFilterStyle.PresenterOnly,
            appearancePane: true,
        },
        {
            class: FilmFilter,
            title: LocalizedString("Old Film"),
            thumbnail: "filter_film.png",
            style: PresenterFilterStyle.PresenterOnly,
            appearancePane: true,
        },
        {
            class: VignetteFilter,
            title: LocalizedString("Vignette"),
            thumbnail: null,
            style: PresenterFilterStyle.PresenterOnly,
            appearancePane: true,
        },
        {
            class: ChromaFilter,
            title: null,
            thumbnail: null,
            style: PresenterFilterStyle.PresenterOnly,
            appearancePane: false,
        },
        {
            class: LUTFilter,
            title: LocalizedString("Color Grade"),
            thumbnail: "filter_lut.png",
            style: PresenterFilterStyle.PresenterOnly,
            appearancePane: true,
            configurable: true,
        },
        {
            class: TuneFilter,
            title: LocalizedString("Tune"),
            thumbnail: null,
            style: PresenterFilterStyle.PresenterOnly,
            appearancePane: false,
            configurable: true,
        }];
    }
    return Array.from(gPresenterFilterRegistry);
}

function PresenterFilterRegistryEntryWithID(id) {
    return PresenterFilterRegistry().find(a => a.class.identifier == id);
}

function NewFilterWithID(filterID, appearancePaneOnly = false) {
    var registry = PresenterFilterRegistry();
    var filter = registry.find(a => a.class.identifier == filterID);
    if (filter == null) {
        return null;
    }
    if (appearancePaneOnly && filter.appearancePane == false) {
        return null;
    }
    var args = filter.arguments;
    if (args == null) {
        args = [];
    }
    return Reflect.construct(filter.class, args);
}
