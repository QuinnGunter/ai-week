//
//  teleport/presenters/automatic_color.js
//  mmhmm
//
//  Created by Chris Hinkle on 3/11/2025.
//  Copyright 2025 mmhmm inc. All rights reserved.
//

class AutomaticColorSelector {
    static K = 3; // argument to the k-means clustering method, determines how many colors we detect
    static KMID = 1; // the half point of K to select centroids when sorted by lightness
    static SELECTION_AVG_HUE_POLAR_DISTANCE_THRESHOLD = 0.75; //how different the average hue must be in order to reselect detected colors. This stabilizes the color selection.
    static SELECTION_AVG_SATURATION_DISTANCE_THRESHOLD = 0.08; //if hues arn't changing, a different in saturation will trigger a recalc
    static SELECTION_POLAR_DISTANCE_THRESHOLD = 2.0; //how different euclidean distance must be in order to actually change the selected color
    static SAMPLE_REGION_AMMOUNT = 0.333; //This is the lower portion of the masked presentator to sample for colors. Set to .5 for "half" set to .333 for third, etc. 

    static BYTES_PER_PIXEL = 4;

    constructor( ) {
      this.selectedColorRGB = null;
      this.selectedAvgHue = 0;
      this.selectedAvgSaturation = 0;
      this.generatedPalettes = [ ];
    }

    //returns three arrays: the detected colors, the selected colors which the generated colors are based off of, and the generated palettes
    async generateAutomaticPaints( canvas ){

        if (canvas == null) {
            canvas = document.createElement("canvas");
            canvas.width = 192;
            canvas.height = 108;
        }

      //we require a data from segmented image, and we wait until we get one
      const pixelsRGB = await this.getIsolatedForegroundImageData( canvas );
      if (pixelsRGB.length == 0) {
        return [ [], [], [] ];
      }

      //use k-means to get predominant colors
      const centroidsRGB = AutomaticColorSelector.kmeans( pixelsRGB, AutomaticColorSelector.K, 10 );
      //sort according to lightness (helps with stabilization)
      const sortedCentroidsRGB = centroidsRGB.toSorted( ( a, b ) => { return AutomaticColorSelector.detectedColorSort( a, b ) } );
      const avgHue = AutomaticColorSelector.avgHueRGB( sortedCentroidsRGB );
      const avgSaturation = AutomaticColorSelector.avgSaturationRGB( sortedCentroidsRGB );
 
      const avgHueDistance = Math.abs( AutomaticColorSelector.polarDistance( 1, avgHue, 1, this.selectedAvgHue ) );
      const avgSaturationDistance = Math.abs( this.selectedAvgSaturation - avgSaturation );

      //coarse-grained color changes
      if( this.selectedColorRGB == null || avgHueDistance > AutomaticColorSelector.SELECTION_AVG_HUE_POLAR_DISTANCE_THRESHOLD || avgHueDistance > AutomaticColorSelector.SELECTION_AVG_SATURATION_DISTANCE_THRESHOLD ) {
        
        this.selectedColorRGB = sortedCentroidsRGB[ AutomaticColorSelector.KMID ]; // select the color with the middle lightness
      } 
      else {
        //fine-grained color changes
        const selectedSorted = sortedCentroidsRGB.toSorted( ( a, b ) => { return AutomaticColorSelector.polarDistanceRGB( this.selectedColorRGB, a ) - AutomaticColorSelector.polarDistanceRGB( this.selectedColorRGB, b ) } );
        const newSelection = selectedSorted[ 0 ];
        const distance = AutomaticColorSelector.polarDistanceRGB( this.selectedColorRGB, newSelection );

        if( distance > AutomaticColorSelector.SELECTION_POLAR_DISTANCE_THRESHOLD )
        {
          this.selectedColorRGB = newSelection;
        }

      }

      this.selectedAvgHue = avgHue;
      this.selectedAvgSaturation = avgSaturation;

      this.generatePalettes( );
      return [ AutomaticColorSelector.rgbArrayToPaints( sortedCentroidsRGB ), AutomaticColorSelector.rgbArrayToPaints( [ this.selectedColorRGB ] ), this.generatedPalettes ];


    }

    //polarDistance calc courtesy of ChatGPT
    static polarDistance(r1, theta1Deg, r2, theta2Deg) {
      // Convert degrees to radians
      const theta1 = (Math.PI / 180) * theta1Deg;
      const theta2 = (Math.PI / 180) * theta2Deg;
    
      // Use the law of cosines to calculate distance
      const distance = Math.sqrt(
        r1 * r1 + r2 * r2 - 2 * r1 * r2 * Math.cos(theta2 - theta1)
      );
    
      return distance;
    }
    
    static polarDistanceRGB( a, b ) {
      const aHSL = AutomaticColorSelector.rgbToHsl( a[0], a[1], a[2] );
      const bHSL = AutomaticColorSelector.rgbToHsl( b[0], b[1], b[2] );

      return AutomaticColorSelector.polarDistance( aHSL[2], aHSL[0], bHSL[2], bHSL[0] );

    }

    static detectedColorSort(a, b) {
      const aHSL = AutomaticColorSelector.rgbToHsl( a[0], a[1], a[2] );
      const bHSL = AutomaticColorSelector.rgbToHsl( b[0], b[1], b[2] );
      return  aHSL[2] - bHSL[2];
    }

    generatePalettes( ) {
      this.generatedPalettes = AutomaticColorSelector.generatePalettes( this.selectedColorRGB );
      return this.generatedPalettes;
    }

    async getIsolatedForegroundImageData( canvas, iterationCount = 0 ) {

      //recursion base case
      if (iterationCount > 10 ){
        console.log( "automatic tint recursive segmentation check failed" );
        return [ ];
      }

      //get a hopefully segmented BitmapImage of the presenter
      const img = await gApp.localPresenter.videoProvider.thumbnailNextFrame();

      const ctx = canvas.getContext("2d");
      ctx.clearRect( 0, 0, canvas.width, canvas.height );
      ctx.drawImage( img, 0, 0, img.width, img.height, 0, 0, canvas.width, canvas.height );

      const imageData = ctx.getImageData( 0, 0, canvas.width, canvas.height );


      //confirm the image is segmented by checking that it has transparent pixels
      if( !AutomaticColorSelector.imageDataHasTransparency( imageData ) ) {
        console.log( `automatic tint image has no transparency, trying again ${iterationCount}` );
        return this.getIsolatedForegroundImageData( canvas, ++iterationCount );
      }

      //confine data for analysis to the non-transparent region (the isolated foreground)
      var firstX = imageData.width;
      var lastX = 0;
      var firstY = imageData.height;
      var lastY = 0;

      for (let x = 0; x < imageData.width; x++) {
        for (let y = 0; y < imageData.height; y++) {
          const i = ( y * imageData.width + x ) * AutomaticColorSelector.BYTES_PER_PIXEL
          const a = imageData.data[i + 3];

          if (a === 255) {
            if (x < firstX) {
              firstX = x;
            }
            if (y < firstY) {
              firstY = y;
            }

            if (x > lastX) {
              lastX = x;
            }
            if (y > lastY) {
              lastY = y;
            }
          }
        }
      }

      const cropX = firstX;
      const cropY = firstY;
      const cropWidth = (imageData.width - firstX) - (imageData.width - lastX);
      const cropHeight = (imageData.height - firstY) - (imageData.height - lastY);

      const targetCropX = Math.round( cropX );
      const targetCropY = Math.round( cropY + cropHeight * ( 1.0 - AutomaticColorSelector.SAMPLE_REGION_AMMOUNT ) );
      const targetCropWidth = Math.round( cropWidth );
      const targetCropHeight = Math.round( cropHeight * AutomaticColorSelector.SAMPLE_REGION_AMMOUNT );

      //this canvas draw is for debugging display purposes only
      ctx.clearRect( 0, 0, canvas.width, canvas.height );
      ctx.putImageData( imageData, 0, 0, targetCropX, targetCropY, targetCropWidth, targetCropHeight );

      var pixels = [];
      for (let x = targetCropX; x < targetCropX + targetCropWidth; x++) {
        for (let y = targetCropY; y < targetCropY + targetCropHeight; y++) {
          const i = ( y * imageData.width + x ) * AutomaticColorSelector.BYTES_PER_PIXEL
          const r = imageData.data[i];
          const g = imageData.data[i + 1];
          const b = imageData.data[i + 2];

          //skip pure black and pure white
          if ( ( r + b + g === 0 ) || ( r + b + g === 765 )  ) {
            continue;
          }
          const colorTuple = [r, g, b];
          pixels.push( colorTuple );
        }
      }
      return pixels;
    }

    static generatePalettes( baseColorRGB ) {

      var palettes = [ ];
      const baseColorHSL = AutomaticColorSelector.rgbToHsl( baseColorRGB[ 0 ], baseColorRGB[ 1 ], baseColorRGB[ 2 ] )
      const hue = baseColorHSL[ 0 ];
      const saturation = baseColorHSL[ 1 ];
      const clampledSaturation = Math.min( 0.4,  saturation );
      const lightness =  baseColorHSL[ 2 ];

      // "Blend" - desaturate the base color, create two variants with different lightness
      const blend1RGB = AutomaticColorSelector.hslToRgb( hue, clampledSaturation, lightness );
      const blend2RGB = AutomaticColorSelector.hslToRgb( hue, clampledSaturation,  AutomaticColorSelector.alternateLightness( lightness ) );

      const blendGradientPaint =  new Paint.LinearGradient( )
        .addStopAt( [ blend1RGB[0] / 255, blend1RGB[1] / 255, blend1RGB[2] / 255, 1.0], AutomaticColorSelector.alternateLightnessPosition( lightness ), 0.0 )
        .addStopAt( [ blend2RGB[0] / 255, blend2RGB[1] / 255, blend2RGB[2] / 255, 1.0], AutomaticColorSelector.alternateLightnessPosition( lightness ), 1.0 )

      palettes.push( { name:"Blend", paint:blendGradientPaint } );


      //for pop, we mostly want to rotate by 180 degrees, unless we are red, then we want to do 45
      if( hue < 320 && hue > 20 )
      {
          // "Pop" - rotate hue by 180 degress, desaturate the base color, create two variants with different lightness
          const pop1RGB = AutomaticColorSelector.hslToRgb( hue+180, clampledSaturation, lightness );
          const pop2RGB = AutomaticColorSelector.hslToRgb( hue+180, clampledSaturation, AutomaticColorSelector.alternateLightness( lightness ) );

          const popGradientPaint =  new Paint.LinearGradient( )
            .addStopAt( [ pop1RGB[0] / 255, pop1RGB[1] / 255, pop1RGB[2] / 255, 1.0], AutomaticColorSelector.alternateLightnessPosition( lightness ), 0.0 )
            .addStopAt( [ pop2RGB[0] / 255, pop2RGB[1] / 255, pop2RGB[2] / 255, 0.2], AutomaticColorSelector.alternateLightnessPosition( lightness ), 1.0 )

          palettes.push( { name:"Pop", paint:popGradientPaint } );
      } 
      else {
            // "Analog" - rotate hue by 180 degress, desaturate the base color, create two variants with different lightness
          const analog1RGB = AutomaticColorSelector.hslToRgb( hue+45, clampledSaturation, lightness );
          const analog2RGB = AutomaticColorSelector.hslToRgb( hue+45, clampledSaturation, AutomaticColorSelector.alternateLightness( lightness ) );

          const analogGradientPaint =  new Paint.LinearGradient( )
            .addStopAt( [ analog1RGB[0] / 255, analog1RGB[1] / 255, analog1RGB[2] / 255, 1.0], AutomaticColorSelector.alternateLightnessPosition( lightness ), 0.0 )
            .addStopAt( [ analog2RGB[0] / 255, analog2RGB[1] / 255, analog2RGB[2] / 255, 0.2], AutomaticColorSelector.alternateLightnessPosition( lightness ), 1.0 )

          palettes.push( { name:"Pop", paint:analogGradientPaint } );
      }


      return palettes;

    }

    static avgHueRGB( rgbArray ){
      const totalHue = rgbArray.map( AutomaticColorSelector.getHueRBG ).reduce( ( (accumulator, currentValue) => accumulator + currentValue ) );
      const avgHue = totalHue / rgbArray.length;
      return avgHue;
    }

    static getHueRBG( rgb ) {
      return AutomaticColorSelector.rgbToHsl( rgb[0], rgb[1], rgb[2] )[0];
    }

    static avgSaturationRGB( rgbArray ){
      const total = rgbArray.map( AutomaticColorSelector.getSaturationRBG ).reduce( ( (accumulator, currentValue) => accumulator + currentValue ) );
      const avg = total / rgbArray.length;
      return avg;
    }

    static getSaturationRBG( rgb ) {
      return AutomaticColorSelector.rgbToHsl( rgb[0], rgb[1], rgb[2] )[1];
    }

    static alternateLightness( lightness ) {
      // return lightness;
      if( lightness > 0.5 ){
        return lightness - 0.22
      }
      else {
        return lightness + 0.22
      }
    }

    static alternateLightnessPosition( lightness ) {
      if( lightness > 0.5 ){
        return 0.333
      }
      else {
        return 0.666
      }
    }

    static alternateLightnessAlpha( lightness ) {
      if( lightness > 0.5 ){
        return 1.0
      }
      else {
        return 0.8
      }
    }

    static rgbArrayToPaints( rgbArray ) {
      return rgbArray.map( ( rgbValue ) => AutomaticColorSelector.rgbToPaint( rgbValue[0], rgbValue[1], rgbValue[2] ) )
    }

    static rgbToPaint( r, g, b ) {
      const colorRGBString = `rgb( ${r} ${g} ${b} )`;
      return { paint: new Paint.Color( colorRGBString ) }
    }

    static imageDataHasTransparency( imageData ) {
      for( var i = 0; i < imageData.data.length;i+=AutomaticColorSelector.BYTES_PER_PIXEL) {
        const a = imageData.data[i + 3];
        if( a < 255 ){
          return true;
        }
      }
      return false;
    }

    /**
     * Simple K-Means clustering implementation. (written mostly by ChatGPT)
     *
     * @param {Array<Array<number>>} data - An array of data points, e.g. [[r, g, b], ...].
     * @param {number} k - Number of clusters.
     * @param {number} maxIterations - Maximum number of K-Means iterations.
     * @returns {Array<Array<number>>} The final centroids, e.g. [[r, g, b], ...].
     */
    static kmeans(data, k, maxIterations) {
      if (!data.length) return [];

      // 1. Initialize centroids to random points from data
      const centroids = AutomaticColorSelector.initializeRandomCentroids(data, k);

      let assignments = new Array(data.length).fill(0);
      let iteration = 0;

      while (iteration < maxIterations) {
        // 2. Assign each data point to the closest centroid
        let didAssignmentsChange = false;
        for (let i = 0; i < data.length; i++) {
          const point = data[i];
          const newAssignment = AutomaticColorSelector.findClosestCentroid(point, centroids);
          if (newAssignment !== assignments[i]) {
            assignments[i] = newAssignment;
            didAssignmentsChange = true;
          }
        }

        // If no assignment changed, we've converged
        if (!didAssignmentsChange) break;

        // 3. Recalculate centroids based on current cluster assignments
        AutomaticColorSelector.recalculateCentroids(data, assignments, centroids);

        iteration++;
      }
      
      return centroids;
    }

  /**
   * Initialize random centroids by picking `k` random points from the data. (written mostly by ChatGPT)
   */
    static initializeRandomCentroids(data, k) {
      const centroids = [];
      const usedIndices = new Set();
      while (centroids.length < k) {
        const randomIndex = Math.floor(Math.random() * data.length);
        if (!usedIndices.has(randomIndex)) {
          usedIndices.add(randomIndex);
          centroids.push([...data[randomIndex]]); // clone the point
        }
      }
      return centroids;
    }

    /**
     * Find index of the centroid closest to the given point. (written mostly by ChatGPT)
     */
    static findClosestCentroid(point, centroids) {
      let minDist = Infinity;
      let closestIndex = 0;

      for (let i = 0; i < centroids.length; i++) {
        const dist = AutomaticColorSelector.euclideanDistance(point, centroids[i]);
        if (dist < minDist) {
          minDist = dist;
          closestIndex = i;
        }
      }

      return closestIndex;
    }

    /**
     * Update each centroid to be the mean of all points assigned to that cluster. (written mostly by ChatGPT)
     */
    static recalculateCentroids(data, assignments, centroids) {
      const sums = Array.from({ length: centroids.length }, () => [0, 0, 0]);
      const counts = Array(centroids.length).fill(0);

      // Sum all points belonging to each centroid
      for (let i = 0; i < data.length; i++) {
        const clusterIndex = assignments[i];
        sums[clusterIndex][0] += data[i][0];
        sums[clusterIndex][1] += data[i][1];
        sums[clusterIndex][2] += data[i][2];
        counts[clusterIndex]++;
      }

      // Calculate the new mean for each centroid
      for (let i = 0; i < centroids.length; i++) {
        if (counts[i] > 0) {
          centroids[i][0] = Math.round(sums[i][0] / counts[i]);
          centroids[i][1] = Math.round(sums[i][1] / counts[i]);
          centroids[i][2] = Math.round(sums[i][2] / counts[i]);
        }
      }
    }

    /**
     * Euclidean distance between two points in RGB space. (written mostly by ChatGPT)
     */
    static euclideanDistance(a, b) {
      return Math.sqrt(
        (a[0] - b[0]) ** 2 +
        (a[1] - b[1]) ** 2 +
        (a[2] - b[2]) ** 2
      );
    }


    /* convrt RGB to HSL (written mostly by ChatGPT) */
    static rgbToHsl(r, g, b) {
        // Convert from [0, 255] to [0, 1]
        r /= 255;
        g /= 255;
        b /= 255;

        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        let h, s;
        const l = (max + min) / 2;
        const d = max - min;

        if (d === 0) {
            // Achromatic (grey)
            h = 0;
            s = 0;
        } else {
            // Saturation
            s = d / (1 - Math.abs(2 * l - 1));

            // Hue
            switch (max) {
                case r:
                    h = ((g - b) / d + (g < b ? 6 : 0)) * 60;
                    break;
                case g:
                    h = ((b - r) / d + 2) * 60;
                    break;
                case b:
                    h = ((r - g) / d + 4) * 60;
                    break;
            }
        }

        // Convert to degrees for hue, and percentage for saturation & lightness
        return [ h, s, l ];
    }

    /* convrt HSL to RGB (written mostly by ChatGPT) */
    static hslToRgb(h, s, l) {
        // 1. Normalize the inputs
        // Ensure h is in [0, 360) by taking modulo. Also handle negative hues.
        h = (h % 360 + 360) % 360;

        // 2. Calculate the chroma (c), the secondary component (x), and the match (m)
        const c = (1 - Math.abs(2 * l - 1)) * s;
        const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
        const m = l - c / 2;

        let rPrime, gPrime, bPrime;

        // 3. Find r', g', b' depending on the hue range
        if (h < 60) {
            rPrime = c; gPrime = x; bPrime = 0;
        } else if (h < 120) {
            rPrime = x; gPrime = c; bPrime = 0;
        } else if (h < 180) {
            rPrime = 0; gPrime = c; bPrime = x;
        } else if (h < 240) {
            rPrime = 0; gPrime = x; bPrime = c;
        } else if (h < 300) {
            rPrime = x; gPrime = 0; bPrime = c;
        } else {
            rPrime = c; gPrime = 0; bPrime = x;
        }

        // 4. Add the match (m) and convert to 0-255
        const r = Math.round((rPrime + m) * 255);
        const g = Math.round((gPrime + m) * 255);
        const b = Math.round((bPrime + m) * 255);

        return [r, g, b];
    }

  }