//
//  media/drawing/texture.js
//  mmhmm
//
//  Created by Steve White on 8/17/21.
//  Copyright © 2021 mmhmm, inc. All rights reserved.
//

// This comes from https://github.com/evhan55/ploma
// The author is the same as Scamper, and the bulk
// of code is identical to Scamper, but Ploma does
// not specify a license...

class PlomaTexture {
    constructor(image) {
        const textureSamplesLength = 1e5;

        this.samples = new Float32Array(textureSamplesLength);
        this.locations = [];
        this.step = 0;
        this.alphaEnabled = true;

        this.getSamplesFromImage(image, this.samples);
    }
    getImageDataFromImage(img) {
        var canvas = document.createElement('canvas');
        var ctx = canvas.getContext('2d');
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        return ctx.getImageData(0, 0, img.width, img.height).data;
    }
    getSamplesFromImage(img, samples) {
        var imageData = this.getImageDataFromImage(img);
        var imageDataGrays = [];
        var textureOffsetX = 0;
        var textureOffsetY = 0;

        // Read grays from image
        for (let i = 0; i < imageData.length; i += 4) {
            imageDataGrays.push(1 - imageData[i] / 255);
        }

        //inkTextureImageDataGrays = imageDataGrays;
        var textureSampleLocations = this.locations;
        var textureSamplesLength = samples.length;

        // Read samples from mirrored-and-tiled grays
        for (let i = 0; i < textureSamplesLength; i++) {
            // Get normalized pixel within texture
            var T_s = textureOffsetX / (img.width - 1);
            var T_t = textureOffsetY / (img.height - 1);
            var s = Math.abs(Math.abs(T_s - 1) % 2 - 1);
            var t = Math.abs(Math.abs(T_t - 1) % 2 - 1);
            var x = Math.floor(s * (img.width - 1));
            var y = Math.floor(t * (img.height - 1));
            textureSampleLocations.push({ x: x, y: y });
            var d = imageDataGrays[x + y * img.width];
            samples[i] = d;
            //samples[i] = 100 + Math.random()*155;

            // Step texture offset randomly [-1, 1]
            textureOffsetX += (Math.random() * 2 | 0) === 1 ? -1 : 1;
            textureOffsetY += (Math.random() * 2 | 0) === 1 ? -1 : 1;
        }
    }
    map(value, valueMin, valueMax, from, to) {
        var ratio = (value - valueMin) / (valueMax - valueMin);
        return from + ratio * (to - from);
    }
    calculateWidth(p) {
        var width = 0.0;
        //console.log(p);

        if (p < 0) { // Possible output from bezier
            width = -3.50;
        }
        else if (p < 0.2) {
            width = this.map(p, 0, 0.2, -3.50, -3.20);
        }
        else if ((p >= 0.2) && (p < 0.45)) {
            width = this.map(p, 0.2, 0.45, -3.20, -2.50);
        }
        else if ((p >= 0.45) && (p < 0.8)) {
            width = this.map(p, 0.45, 0.8, -2.50, -1.70);
        }
        else if ((p >= 0.8) && (p < 0.95)) {
            width = this.map(p, 0.8, 0.95, -1.70, -1.55);
        }
        else if ((p >= 0.95) && (p <= 1)) {
            width = this.map(p, 0.95, 1, -1.55, -1.30);
        }
        else { //if(p > 1) { // Possible output from bezier
            width = -1.30;
        }

        return width;
    }
    drawStep(imageData, point, color, size) {
        /////////////////////
        // PRE-LOOP
        /////////////////////

        var width = 0.0;
        width = this.calculateWidth(point.p);

        /////////////////////
        // LOOP
        /////////////////////

        var p_x = 0.0;
        var p_y = 0.0;
        var p_p = 0.0;
        var centerX = 0.0;
        var centerY = 0.0;
        var i = 0;
        var j = 0;
        var left = 0;
        var right = 0;
        var top = 0;
        var bottom = 0;
        var dx = 0.0;
        var dy = 0.0;
        var dist = 0.0;
        var t = 0.0;
        var a = 0.0;
        var invA = 0.0;
        var idx_0 = 0;
        var idx_1 = 0;
        var idx_2 = 0;
        var idx_3 = 0;
        var idx_0_i = 0;
        var oldR = 0.0;
        var oldG = 0.0;
        var oldB = 0.0;
        var oldA = 0.0;
        var newR = 0.0;
        var newG = 0.0;
        var newB = 0.0;
        var newA = 0.0;

        p_x = point.x;
        p_y = point.y;
        p_p = point.p;
        centerX = Math.round(p_x);
        centerY = Math.round(p_y);

        var halfSize = size / 2.0;
        left = Math.floor(centerX - halfSize);
        right = Math.ceil(centerX + halfSize);
        top = Math.floor(centerY - halfSize);
        bottom = Math.ceil(centerY + halfSize);

        // Step around inside the texture before the loop
        //textureSampleStep = (textureSampleStep === textureSampleLocations.length - 1) ? 0 : (textureSampleStep + 1);
        var inkTextureSamples = this.samples;
        var textureSampleLocations = this.locations;
        var textureSampleStep = this.step;
        var alphaEnabled = this.alphaEnabled;
        var w_4 = imageData.width * 4;
        var id = imageData.data;
        var penR = color.r;
        var penG = color.g;
        var penB = color.b;

        //////////////
        // Horizontal
        //////////////
        for (i = left; i < right; i++) {

            // Distance
            dx = p_x - i;

            // Byte-index
            idx_0_i = i * 4;

            ////////////
            // Vertical
            ////////////
            for (j = top; j < bottom; j++) {

                // Distance
                dy = p_y - j;
                dist = Math.sqrt(dx * dx + dy * dy);

                // Byte-index
                idx_0 = idx_0_i + j * w_4;

                // Antialiasing
                //a = size * ((0.3 / (dist - width)) - 0.085);
                a = ((size * 0.3) / (dist - width)) - 0.425;

                // Spike
                if (dist < width) {
                    a = 1;
                }

                // Clamp alpha
                if (a < 0) a = 0;
                if (a >= 1) a = 1;

                // Get new texture sample offset at center
                if (textureSampleStep >= textureSampleLocations.length) {
                    textureSampleStep = 0;
                }
                t = inkTextureSamples[textureSampleStep];
                textureSampleStep += 1;

                // Apply texture
                a *= t;

                // Grain
                var g = this.map(p_p, 0, 1, 0.8, 0.95);
                var prob = 1 - (p_p * p_p * p_p * p_p * p_p); // 1 - x^4
                g = Math.floor(Math.random() * prob * 2) === 1 ? 0 : g;
                a *= g;

                // Blending vars
                invA = 1 - a;
                idx_1 = idx_0 + 1;
                idx_2 = idx_0 + 2;
                idx_3 = idx_0 + 3;
                oldR = id[idx_0];
                oldG = id[idx_1];
                oldB = id[idx_2];

                // Transparent vs. opaque background
                if (alphaEnabled != true) {
                    newR = penR * a + oldR * invA;
                    newG = penG * a + oldG * invA;
                    newB = penB * a + oldB * invA;
                    newA = 255;
                }
                else {
                    oldA = id[idx_3] / 255;

                    newA = a + oldA * invA;
                    newR = (penR * a + oldR * oldA * invA) / newA;
                    newG = (penG * a + oldG * oldA * invA) / newA;
                    newB = (penB * a + oldB * oldA * invA) / newA;

                    newA = newA * 255;
                }

                // Set new RGB
                id[idx_0] = newR;
                id[idx_1] = newG;
                id[idx_2] = newB;
                id[idx_3] = newA;
            }
        }

        this.step = textureSampleStep;
    }
}
