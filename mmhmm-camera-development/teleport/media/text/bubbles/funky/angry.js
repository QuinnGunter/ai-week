//
//  media/text/bubbles/funky/angry.js
//  mmhmm
//
//  Created by Steve White on 10/9/23.
//  Copyright © 2023 mmhmm, inc. All rights reserved.
//

Media.Text.Style.Funky.Angry = class extends Media.Text.Style.Funky {
    constructor() {
        super(LocalizedString("Yell"), LocalizedString("Funky"), "funky-angry");

        this.frame = new PathHelper(640, 360, "M493.191 0C449.807 29.8418 229.71 42.7598 131.899 17C160.169 55 42 68 42 68C42 68 41.5 107.404 13 105.588C39.3284 128.114 30.5 161.924 0 171.916C30.5 185.415 26.3284 277.116 0 307.551C28.5 305.096 42 318 42 318C42 318 66.5532 331.5 64.7209 360C87.4418 333.672 136.731 329.5 146.809 360C190.193 329.5 402.379 333.672 500.189 360C492.301 331.5 598 318 598 318C598 318 611.5 293.656 640 295.473C613.672 272.945 609.5 224.076 640 214.084C609.5 200.585 613.672 108.884 640 78.4492C611.5 80.9043 598 68 598 68C598 68 573.447 46.1426 575.279 0C552.558 42.627 503.269 49.3809 493.191 0Z");

        this.primaryColor = "#FF4469";
        this.secondaryColor = "#d93a5a";
        this.contentInsets = InsetsMake(0.1944, 0.125, 0.16666, 0.09375);
        this.insetsAreProportional = true;
        this.backgroundInset = 48;
    }
    newShellForSize(width, height) {
        return this.frame.toPath2D(width, height);
    }
    newPathForSize(width, height) {
        return this.newShellForSize(width, height);
    }
}
