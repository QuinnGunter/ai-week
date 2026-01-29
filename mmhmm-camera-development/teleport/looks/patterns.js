//
//  looks/patterns.js
//  mmhmm
//
//  Created by Seth Hitchings on 6/26/2025.
//  Copyright 2025 mmhmm inc. All rights reserved.
//

const LookPatterns = {
    Brocade: new LookPattern(LocalizedString("Brocade"), "brocade", 0.3, "png.19258.sha1.c14e00ca6c06d7bbc6763b4a714978462b99340c")
        .setPreviousFingerprints(["png.48323.sha1.c7e0c0c454e67c06116d7b455ac5613ba80ef394"]),
    Crosshatch: new LookPattern(LocalizedString("Crosshatch"), "crosshatch", 0.3, "png.14959.sha1.5d8f33207d66b606eadd938ca99eeff2045dd2a0")
        .setPreviousFingerprints(["png.86886.sha1.a2c9d69fb90d6d234756609e904ef77f9f3b6cd9"]),
    Cube: new LookPattern(LocalizedString("Cube"), "cube", 0.2, "png.42492.sha1.0dfa3966c115cc6cc9ab942fb5187723ce960be9")
        .setPreviousFingerprints(["png.49954.sha1.96eece49d6d53b0a56494350a4a38a7316f8998e"]),
    Diamonds: new LookPattern(LocalizedString("Diamonds"), "diamonds", 0.4, "png.13189.sha1.ec97adf62edb59d543835f522d2d21190efea913")
        .setPreviousFingerprints(["png.64731.sha1.a7714dd73d58838fe59474c975524ef08eb7837c"]),
    Dots: new LookPattern(LocalizedString("Dots"), "dots", 0.6, "png.949.sha1.50020d21df124f98c991067d39c89f991a85eb62")
        .setPreviousFingerprints(["png.23542.sha1.e6f1b215f1d6ad99e02fda73631482a76de16268"]),
    DotsGridOffset: new LookPattern(LocalizedString("Dots Grid Offset"), "dots-grid-offset", 0.5, "png.8965.sha1.84c9c72e37bb537491d2c9de81cfee2536937f87")
        .setPreviousFingerprints(["png.36741.sha1.24c9475901a57e28bba118acc5a786bc558ecf07"]),
    DotsOffset: new LookPattern(LocalizedString("Dots Offset"), "dots-offset", 0.5, "png.2602.sha1.a000fe808289383ed424ee8ec49338dbc116ad28")
        .setPreviousFingerprints(["png.27454.sha1.27dd1375e4f50fe4a0603e058b797f6257219b63"]),
    Filigree: new LookPattern(LocalizedString("Filigree"), "filigree", 0.2, "png.31700.sha1.18b0e6d27fb41f558aaab422e3380fd717b169e4")
        .setPreviousFingerprints(["png.1888182.sha1.11ff64bb1ee1e9396912249c38921dde6e09f0f1"]),
    Grid: new LookPattern(LocalizedString("Grid"), "grid", 0.2, "png.1416.sha1.10be796cba0468987812de7e72ff77aaf3491060")
        .setPreviousFingerprints(["png.15788.sha1.71d9bfbb91fe88b0a062d0aab4c24aeb391ef2f6"]),
    HerringboneWeave: new LookPattern(LocalizedString("Herringbone Weave"), "herringbone", 0.25, "png.15021.sha1.ed28bab239912682feadd159139ff3b67e18f614")
        .setPreviousFingerprints(["png.96989.sha1.0ae996aa1f817cdd476343c4aa631ae96580b22a"]),
    Herringbone: new LookPattern(LocalizedString("Herringbone"), "herringbone-new", 0.2, "png.59141.sha1.e5185df365baf5c6b794df260877a427e65e79ab")
        .setPreviousFingerprints(["png.112269.sha1.718f0c53acd2b4c161fe85de4df8a51d911da8a7"]),
    Japanese: new LookPattern(LocalizedString("Japanese"), "japanese", 0.3, "png.91460.sha1.ebb8b50fa128e7f3462a3c213f66b80104385601")
        .setPreviousFingerprints(["png.129614.sha1.b78030a7a3cf31668c784185d6bcbc28f5955ade"]),
    Leaves: new LookPattern(LocalizedString("Leaves"), "leaves", 0.2, "png.164785.sha1.a61b8c2cacdc6f785adce7cfc0f2e06d3125c529")
        .setPreviousFingerprints(["png.247107.sha1.549407d5b2340a4e104ca0f53da8f130e641b816"]),
    Mesh: new LookPattern(LocalizedString("Mesh"), "mesh", 0.5, "png.31326.sha1.57ecb7b050b6e0bdb8189a218960b25d0b4ebff4")
        .setPreviousFingerprints(["png.132489.sha1.4a87b028d570e7b985df7ead319048c165c26779"]),
    MorphingDiamonds: new LookPattern(LocalizedString("Morphing Diamonds"), "morphing-diamonds", 0.2, "png.38874.sha1.5ffdd18e47f8a5d8e7d3cb77e7742a8a4e875ae0")
        .setPreviousFingerprints(["png.108636.sha1.49aae4c727d5cc50b03b862d5e920ecce9727d19"]),
    Petals: new LookPattern(LocalizedString("Petals"), "petals", 0.15, "png.40691.sha1.1195f1ad749cf986dfd7915dc0c4a54afa421114")
        .setPreviousFingerprints(["png.89658.sha1.ca3ee24fa3c711614f90856e346fbb7251c86f99"]),
    PieSlices: new LookPattern(LocalizedString("PieSlices"), "pie-slices", 0.3, "png.47217.sha1.0758d1fe0d37cbf3467834a308223d37a7fdc0a3")
        .setPreviousFingerprints(["png.83686.sha1.448b2464118f2eb4798100af5096d602e58df585"]),
    Ripple: new LookPattern(LocalizedString("Ripple"), "ripple", 0.15, "png.94426.sha1.85ca92570a187d084c13e0e6ec2fcc90dfb49110")
        .setPreviousFingerprints(["png.258698.sha1.5756b6a703af943ee400238701fe96b1cea745bb"]),
    Slant: new LookPattern(LocalizedString("Slant"), "slant", 0.3, "png.4432.sha1.f9e3aeba9de1c8e93b2137807dd8f39174df8603")
        .setPreviousFingerprints(["png.71668.sha1.86bbfb18702decc4fdab3b9e48ed3ea6bbf3ce5e"]),
    Squiggles: new LookPattern(LocalizedString("Squiggles"), "squiggles", 0.15, "png.40144.sha1.be08a1b30f6b0eb0ea1b03664b9862d5079c022a")
        .setPreviousFingerprints(["png.86083.sha1.1723d287968d039f95afc2092429551287b47eff"]),
    Triangle: new LookPattern(LocalizedString("Triangle"), "triangle", 0.2, "png.38338.sha1.e6f73d9eca20f2f086caa50433cce93fdde51a5d")
        .setPreviousFingerprints(["png.1146508.sha1.de8c041aed75c8f860a37e0f7cde5c1749219267"]),
    Wave: new LookPattern(LocalizedString("Wave"), "wave", 0.2, "png.268573.sha1.c777a1b2ff4c719ea961452c75ebbe4ddb4b5c25")
        .setPreviousFingerprints(["png.1297277.sha1.333e3cd1325c1b5e2154539474df316a42166964"]),
    WavyNet: new LookPattern(LocalizedString("WavyNet"), "wavy-net", 0.2, "png.126525.sha1.3cbcf0748b5cb879c26e755ccd9095e5d0b2e165")
        .setPreviousFingerprints(["png.137035.sha1.a3b5b048836a407640a6bd67ff41c4391b40a7e7"]),
    Weave: new LookPattern(LocalizedString("Weave"), "weave", 0.2, "png.98296.sha1.8d7f5f1a9accbf3c3809cbbc9f41ce4806d86fea")
        .setPreviousFingerprints(["png.241432.sha1.df515c747df84605d8864a9b2aa6fd7699b313f9", "png.2258064.sha1.9da5ed7639d3cbef7070802abb5f04faca3a6a54"]),
    ZigZag: new LookPattern(LocalizedString("ZigZag"), "zig-zag", 0.2, "png.4766.sha1.c5ced042bea0b2fe25f750c0be43ae0a8a2b23b8")
        .setPreviousFingerprints(["png.21078.sha1.bf907f64ac4d5573a731e3d37db9823b090784e6"]),
}

LookPatterns.All = Object.values(LookPatterns);

LookPatterns.random = function() {
    const options = LookPatterns.All;
    const index = Math.floor(Math.random() * options.length);
    return options[index];
};
