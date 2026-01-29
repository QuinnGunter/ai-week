//
//  looks/overlays.js
//  mmhmm
//
//  Created by Seth Hitchings on 6/26/2025.
//  Copyright 2025 mmhmm inc. All rights reserved.
//

const LookOverlays = {
    ThinBorder: new LookOverlay(LocalizedString("Thin Border"), "border_thin", "png.10569.sha1.a31e829bce5c7c9547057712f91e377cab82ee51")
        .setPreviousFingerprints(["png.10478.sha1.46082a464610018686710041acdd65cf31fa0a29"]),
    ThickBorder: new LookOverlay(LocalizedString("Thick Border"), "border_thick", "png.10563.sha1.9a7943c58ce03668521fb9beea536739617e8e90")
        .setPreviousFingerprints(["png.10481.sha1.1bf52a168b4b708bbb5bc02b4fbb659eb6143c55"]),
    Calligraphy: new LookOverlay(LocalizedString("Calligraphy"), "calligraphy", "png.13824.sha1.763e30c6c1214d19a2b107c4e565232db73c5e4e"),
    RoundedInset: new LookOverlay(LocalizedString("Rounded Inset"), "rounded_inset", "ng.13301.sha1.848ba9a4cc0d4f917aab09b58a6372171969d7d6"),
    Rounded: new LookOverlay(LocalizedString("Rounded"), "rounded", "png.12713.sha1.cd98d3c920ce83783bb28d18374e996e07af64ab"),
    Radius: new LookOverlay(LocalizedString("Radius"), "radius", "png.13933.sha1.23a2e806e76746f9a1efc5094ec149e44a96faee"),
    Bubble: new LookOverlay(LocalizedString("Bubble"), "bubble", "png.68829.sha1.d2d62021625a17278d2cd6990f366a134b9db00a"),
    Spotlight: new LookOverlay(LocalizedString("Spotlight"), "spotlight", "png.1220312.sha1.faa574d532f01ae9558409a26244fffe3b422313"),
    HexGrid: new LookOverlay(LocalizedString("Hex Grid"), "hex_grid", "png.22560.sha1.ad24fb5542a90a5a64a6343cdce4cf70dd494e2c"),
    BuildingBlocks: new LookOverlay(LocalizedString("Building Blocks"), "building_blocks", "png.67240.sha1.d6e9432d1d2d50207fa6717718a952b0a2a779f1"),
    MotionCut: new LookOverlay(LocalizedString("Motion Cut"), "motion_cut", "png.39017.sha1.bd59d1741e6d89ea674a9e5c42b96321e31218f7"),
    Paint: new LookOverlay(LocalizedString("Paint"), "paint", "png.817160.sha1.b8b6dde6629ff0cf147fb04dd1c0eeda37a4aca1"),
    Angles: new LookOverlay(LocalizedString("Angles"), "angles", "png.423621.sha1.a8bba95209e170ec6795c6759b096958a0bd6440"),
}

LookOverlays.All = Object.values(LookOverlays);

const CircleOverlays = [
    LookOverlays.Bubble,
    new LookOverlay(LocalizedString("Ring"), "ring", "png.464634.sha1.e2f2d55c8141f5cfb99de5d61ede364c9337272d"),
    new LookOverlay(LocalizedString("Spiral"), "spiral", "png.84969.sha1.7695f8d27ff54ba14d7706a20c0f497b69461cd1"),
    new LookOverlay(LocalizedString("Burst"), "burst", "png.355021.sha1.d1637ab6d5c4a40396e5d5140af2aa4c419d2b82").setDefaultOpacity(0.5),
];
