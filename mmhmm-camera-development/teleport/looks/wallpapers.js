//
//  wallpapers.js
//  mmhmm
//
//  Created by Seth Hitchings on 10/10/2025
//  Copyright 2025 mmhmm inc. All rights reserved.
//

/**
 * A list of the wallpapers (Rooms) used by LookPresets.
 * All of these are built-in rooms that are already defined in
 * RoomsController; having them here is purely for convenience.
 */
const LookWallpapers = class {

    static #roomIDs = Object.freeze({
        Black: "3af748e6-967d-4e63-9039-fa109d88ceda",
        Nebula: "aa116d9c-30dc-450d-a329-45f5051cb2b1",
        AutumnWoodsView: "71fd69d7-e933-4532-bfb5-f590fc0cc895",
        Ripple: "94f78750-3a76-4f33-a27b-5f72e883a8eb",
        Sunset: "7d0c3db8-1896-473a-95f4-b27c49c7788f",
        CosmicGlow: "14c875b0-2a92-49b3-ada7-58b67db657ed",
        KaleidoscopeBlur: "2c0f584d-ed8d-441f-8182-382ed965289b",
        Heatwave: "81d74ca5-fbdd-45b7-b901-49802223b2c8",
        MorningSun: "139dba49-69cc-4347-b620-c60090b5cd96",
    });

    static Black = this.#roomIDs.Black;
    static Nebula = this.#roomIDs.Nebula;
    static AutumnWoodsView = this.#roomIDs.AutumnWoodsView;
    static Ripple = this.#roomIDs.Ripple;
    static Sunset = this.#roomIDs.Sunset;
    static CosmicGlow = this.#roomIDs.CosmicGlow;
    static KaleideoscopeBlur = this.#roomIDs.KaleidoscopeBlur;
    static Heatwave = this.#roomIDs.Heatwave;
    static MorningSun = this.#roomIDs.MorningSun;

    static All() {
        return Object.values(this.#roomIDs);
    }

    static get #roomStore() {
        return RoomsController.shared;
    }

    static roomWithIdentifier(identifier) {
        return this.#roomStore.roomWithIdentifier(identifier);
    }

    static blackRoom() {
        return this.roomWithIdentifier(this.Black);
    }

    static assetUrlForRoomIdentifier(identifier) {
        const room = this.roomWithIdentifier(identifier);
        return room?.backgroundSrc;
    }

}
