//
//  presenters/layers/seg_filter.js
//  mmhmm
//
//  Created by Steve White on 11/20/24.
//  Copyright © 2024 mmhmm, inc. All rights reserved.
//

Presenter.SegmentationFilter = class extends RenderFilter {
    constructor() {
        super(null, []);
        this.programCache = {};
    }
    set blurAmount(value) {
        if (value == this.blurAmount) {
            return;
        }
        this._blurAmount = value;
        this._program = null;
    }
    get blurAmount() {
        return this._blurAmount;
    }
    set nativeBlur(value) {
        if (value == this.nativeBlur) {
            return;
        }
        this._nativeBlur = value;
        this._program = null;
    }
    get nativeBlur() {
        return this._nativeBlur;
    }
    set paint(value) {
        const previous = this._paint;
        if (value == previous) {
            return;
        }

        this._paint = value;

        if (previous?.type != value?.type) {
            this._program = null;
        }
    }
    get paint() {
        return this._paint;
    }
    set style(value) {
        if (value == this._style) {
            return;
        }
        this._style = value;
        this._program = null;
    }
    get style() {
        return this._style;
    }
    set segmentationType(val) {
        if (val == this._segmentationType) {
            return;
        }
        this._segmentationType = val;
        this._program = null;
    }
    get segmentationType() {
        return this._segmentationType;
    }
    set shape(val) {
        if (val == this._shape) {
            return;
        }
        this._shape = val;
        this._program = null;
    }
    get shape() {
        return this._shape;
    }
    set enhancement(val) {
        const enhancement = clamp(val, 0, 1);
        const previous = this.enhancement;
        if (enhancement == previous) {
            return;
        }
        this._enhancement = enhancement;
        if (enhancement == 0 || previous == 0) {
            this._program = null;
        }
    }
    get enhancement() {
        return this._enhancement ?? 0;
    }

    set alphaOnly(val) {
        const alphaOnly = !!val;
        if (alphaOnly == this._alphaOnly) {
            return;
        }
        this._alphaOnly = alphaOnly;
        this._program = null;
    }
    get alphaOnly() {
        return this._alphaOnly ?? false;
    }

    set preserveMaskInAlpha(val) {
        const preserveMaskInAlpha = !!val;
        if (preserveMaskInAlpha == this._preserveMaskInAlpha) {
            return;
        }
        this._preserveMaskInAlpha = preserveMaskInAlpha;
        this._program = null;
    }
    get preserveMaskInAlpha() {
        return this._preserveMaskInAlpha ?? false;
    }

    set cornerRadius(val) {
        const cornerRadius = clamp(val, 0, 1);
        const previous = this.cornerRadius;
        if (cornerRadius == previous) {
            return;
        }
        this._cornerRadius = cornerRadius;
        if (cornerRadius == 0 || previous == 0) {
            this._program = null;
        }
    }
    get cornerRadius() {
        return this._cornerRadius ?? 0;
    }

    set polygonSides(val) {
        const polygonSides = clamp(val, 3, 10);
        if (polygonSides == this._polygonSides) {
            return;
        }
        this._polygonSides = polygonSides;
        this._program = null;
    }
    get polygonSides() {
        return this._polygonSides ?? 3;
    }

    willCompileInRenderer(renderer) {
        return this.newProgramInRenderer(renderer);
    }
    newProgramInRenderer(renderer) {
        const uniforms = new Set();
        uniforms.add('u_texture');
        uniforms.add('u_opacity');

        const style = this.style;
        const blurAmount = this.blurAmount ?? 0;
        if (blurAmount > 0 && this.nativeBlur == false) {
            uniforms.add('iResolution');
        }

        const paintType = this.paint?.type;
        if (paintType == "color") {
            uniforms.add('u_color');
        }
        else if (paintType == "radial") {
            uniforms.add('u_startColor');
            uniforms.add('u_stopColor');
        }
        else if (paintType == "linear") {
            uniforms.add('u_startColor');
            uniforms.add('u_stopColor');
            uniforms.add('u_startPoint');
            uniforms.add('u_stopPoint');
        }

        const segType = this.segmentationType;
        let alphaType = null;
        if (segType == "chroma") {
            alphaType = "chroma";
            uniforms.add('u_chromaColor');
            uniforms.add('u_chromaRange');
        }
        else if (segType == "virtual") {
            alphaType = "mask";
            uniforms.add('u_mask');
            if (renderer.highPerformanceGPU == true) {
                uniforms.add('u_pixelSize');
            }
        }
        else if (segType == "hybrid") {
            alphaType = "texture";
        }

        const shape = this.shape;
        if (shape == Presenter.Shape.Circle || shape == Presenter.Shape.Polygon) {
            uniforms.add('iResolution');
        }

        const enhancement = this.enhancement;
        if (enhancement > 0) {
            uniforms.add("u_enhancementBrightness");
            uniforms.add("u_enhancementIntensity");
        }

        const cornerRadius = this.cornerRadius;
        if (cornerRadius > 0) {
            uniforms.add('iResolution');
            uniforms.add('u_cornerRadius');
        }

        const numPolygonSides = this.polygonSides;
        let polygonRadius;
        if (numPolygonSides % 2 == 0) {
            polygonRadius = 1.0;
        }
        else {
            const rads = Math.PI / numPolygonSides;
            const s = Math.tan(rads);
            const M = Math.sin(rads);
            polygonRadius = (2.0 / (1.0 / s + 1.0 / M)) / M;
        }

        let fragment = `
#define true 1
#define false 0

precision mediump float;
varying vec2 v_texcoord;
uniform sampler2D u_texture;
uniform sampler2D u_mask;

uniform float u_opacity;
uniform vec2 iResolution;

uniform vec3 u_chromaColor;
uniform vec2 u_chromaRange;

uniform vec2 u_pixelSize;

uniform vec4 u_color;
uniform vec4 u_startColor;
uniform vec4 u_stopColor;
uniform vec2 u_startPoint;
uniform vec2 u_stopPoint;

#if ${blurAmount > 0}
const int samples=${blurAmount};
const int LOD = 2;
const int sLOD = 4; // 1 << LO;
const float sigma = float(samples) * .25;
const int s = samples/sLOD;
const int ss = s*s;

float gaussian(vec2 i) {
    return exp( -.5* dot(i/=sigma,i) ) / ( 6.28 * sigma*sigma );
}

void applyTextureBlur(inout vec4 color, vec2 coord) {
    vec4 O = vec4(0);
    vec2 scale = 1./iResolution;

    for ( int i = 0; i < ss; i++ ) {
        vec2 d = vec2(i-i/s*s, i/s)*float(sLOD) - float(samples)/2.;
        O += gaussian(d) * vec4(textureLod( u_texture, coord + scale * d , float(LOD) ).rgb, 1.0);
    }

    color = O / O.a;
}
#endif

void applyTextureRGB(inout vec4 color, vec2 coord) {
    color.rgb = texture2D(u_texture, coord).rgb;
}

void applyTextureAlpha(inout vec4 color, vec2 coord) {
    color.a = texture2D(u_texture, coord).a;
}

float gaussian(float x, float sigma) {
    float coeff = -0.5 / (sigma * sigma * 4.0 + 1.0e-6);
    return exp((x * x) * coeff);
}

float prediction_weight(float pred) {
    const float u_pred_scaling = 2.84;
    float val = u_pred_scaling * pow(pred - 0.5, 2.0) + 0.1;
    return min(1.0, val);
}

float apply_jbfv3(vec2 p, vec4 pRgba) {
    vec2 pixelSize = u_pixelSize;

    const float u_spread = 0.618;
    const float u_balance = 0.057;
    const float u_colour_weight = 0.539;
    const int STEP_RANGE = 3;

    float alpha = 0.0;
    float alpha_sum = 0.0;
    float weight_sum = 0.0;

    // Predefine for loop unrolling...
    float fStep = float(STEP_RANGE);
    float sizeSquare = (2.0 * fStep + 1.0) * (2.0 * fStep + 1.0);
    float kernel = ceil(sqrt(fStep*fStep+fStep*fStep) * 2.0);

    for (int y = -STEP_RANGE;y <= STEP_RANGE; y += 1) {
        float fy = float(y);
        for (int x = -STEP_RANGE;x <= STEP_RANGE; x += 1) {
            float fx = float(x);
            vec2 point = vec2(p.x + pixelSize.x * fx, p.y + pixelSize.y * fy);

            float pointMask = texture2D(u_mask, point).a;
            vec3 pointRgb = texture2D(u_texture, point).rgb;

            float dist = sqrt(fx * fx + fy * fy);
            float spaceWeight = gaussian(dist, u_spread);
            float colorWeight = gaussian(distance(pRgba.rgb, pointRgb), u_balance);
            float predWeight = prediction_weight(pointMask);
            float pointWeight = (1.0 - u_colour_weight) * spaceWeight + u_colour_weight * colorWeight;
            pointWeight *= predWeight;
            alpha_sum += pointMask * pointWeight;
            weight_sum += pointWeight;
        }
    }
    alpha = alpha_sum / weight_sum;
    alpha = clamp(alpha, 0.0, 1.0);
    return alpha;
}

void applyTextureMask(inout vec4 color, vec2 coord) {
    float mask = texture2D(u_mask, coord).a;

#if ${renderer.highPerformanceGPU}
    if (mask >= 0.05 && mask <= 0.95) {
        mask = apply_jbfv3(v_texcoord, vec4(color.rgb, mask));
    }

    const float u_post_sharp = 0.1665;
    mask = smoothstep(u_post_sharp, 1.0 - u_post_sharp, mask);
#else
    // threshold range for pure smoothstep option
    const vec2 ThresholdRangeMethod1 = vec2(0.2, 0.8);
    // Use simpler postprocessing in order to improve performance on Windows integrated cards.
    mask = smoothstep(ThresholdRangeMethod1.x, ThresholdRangeMethod1.y, mask);
#endif

    color.a = mask;
}

vec2 RGBToCC(vec3 rgb) {
    float Y = 0.2989 * rgb.r + 0.5866 * rgb.g + 0.1145 * rgb.b;
    return vec2((rgb.b - Y) * 0.5647, (rgb.r - Y) * 0.7132);
}

vec3 YCCToRGB(float y, float cb, float cr) {
    vec3 c = vec3(y,cb,cr);
    float r = c.x + 1.40213 * c.z;
    float g = c.x - 0.34565 * c.y - 0.71445 * c.z;
    float b = c.x + 1.77085 * c.y;
    return vec3(r,g,b);
}

void applyChromaKey(inout vec4 color, vec2 coord) {
    vec3 rgb_blur = color.rgb;

    vec2 CC = RGBToCC(rgb_blur);
    vec2 keyCC = RGBToCC(u_chromaColor);

    float dist_val = distance(vec2(keyCC.x, keyCC.y), vec2(CC.x, CC.y));
    float mask = smoothstep(u_chromaRange.x, u_chromaRange.y, dist_val);

    if (mask > 0.0 && mask < 1.0) {
        float Y = 0.2989 * color.r + 0.5866 * color.g + 0.1145 * color.b;
        vec2 diffCC = CC - keyCC;

        float degreen_factor = clamp(dist_val / u_chromaRange.y, 0.0, 1.0);
        vec2 shiftedCC = keyCC + diffCC / (degreen_factor + 0.0001);

        vec3 rgb_new = YCCToRGB(Y, shiftedCC.x, shiftedCC.y);
        color.rgb = rgb_new * mask;
    }
    color.a = clamp(mask, 0.0, 1.0);
}

void applyBackgroundColor(inout vec4 color, vec2 coord) {
    color = u_color;
}

void applyBackgroundRadialGradient(inout vec4 color, vec2 coord) {
    const float max = sqrt(0.5);
    float d = distance(v_texcoord, vec2(0.5)) / max;

    color = mix(
        u_startColor,
        u_stopColor,
        clamp(d, 0.0, 1.0)
    );
}

void applyBackgroundLinearGradient(inout vec4 color, vec2 coord) {
    vec2 a = u_startPoint;
    vec2 b = u_stopPoint;
    vec2 ba = b - a;
    float t = dot(v_texcoord - a, ba) / dot(ba, ba);
    t = smoothstep(0.0, 1.0, clamp(t, 0.0, 1.0));
    color = mix(u_startColor, u_stopColor, t);
}

void applyBackgroundFill(inout vec4 color, vec4 fill) {
    color = mix(color, fill, 1.0 - color.a);
}

void applyBackgroundTint(inout vec4 color, vec4 tint) {
    // Perceptual greyscale, via:
    // http://www.johndcook.com/blog/2009/08/24/algorithms-convert-color-grayscale/
    float grayscale = color.r * 0.21 + color.g * 0.72 + color.b * 0.07;

    // RGB average
    vec3 power = (tint.r+tint.g+tint.b)*0.3333-tint.rgb;

    // Increase saturation:
    power *= 2.0;

    // Apply color
    color.xyz = pow(vec3(grayscale), 1.0+power);
}

void applyCircleMask( inout vec4 color, in vec2 coord )
{
    vec2 fragCoord = coord * iResolution.xy;
	vec2 p = (2.0*fragCoord-iResolution.xy)/iResolution.y;

	float dist = length(p);

    float pixelSizeAdjusted = 0.008;
    float alpha = (1.0 - dist) / pixelSizeAdjusted;

    color.a *= clamp(alpha, 0.0, 1.0);
}

${InigoQuilez.RoundedBox}

${InigoQuilez.RegularNGon(numPolygonSides)}

uniform float u_cornerRadius;
void applyCornerRadius(inout vec4 color, vec2 uv) {
    vec2 coord = uv * iResolution;
	vec2 p = ((2.0 * coord) - iResolution) / iResolution.y;

	vec2 si = vec2(iResolution.x / iResolution.y, 1.0);
    vec4 ra = vec4(u_cornerRadius);
    ra = min(ra,min(si.x,si.y));

	float d = sdRoundedBox( p, si, ra );
    float alpha = 1.0-smoothstep(0.0,0.01,clamp(d, 0.0, 1.0));
    color.a *= alpha;
}

void applyNgonMask(inout vec4 color, vec2 coord) {
    vec2 fragCoord = coord * iResolution;
	vec2 p = (2.0*fragCoord-iResolution.xy)/iResolution.y;

    const float round = 0.1;
    const float radius = ${polygonRadius.toPrecision(5)} - ((${polygonRadius.toPrecision(5)} - 1.0) * 0.1);
    p.y -= radius - 1.0;
    p.y = -p.y;

	float d = sdRegular${numPolygonSides}Gon(p, radius - round) - round;
    if (d >= 0.0) {
        color.a = 0.0;
    }
}

uniform float u_enhancementBrightness;
uniform float u_enhancementIntensity;
void applyEnhancementEffect(inout vec4 color, vec2 coord) {
    vec3 col = color.rgb;
    vec3 med  = texture2D(u_texture, coord, 2.0).rgb;

    float isskin = clamp( color.a * (col.r-max(col.g,col.b))*5.0, 0.0, 1.0 );
    float intensity = u_enhancementIntensity;

    col = mix(col,med,isskin*intensity*2.0);

    float gre = dot(col,vec3(0.333));
    float brightness = u_enhancementBrightness;
    col *= mix( 0.8+0.4*brightness, 2.2/(1.0+gre), brightness );

    col = mix( col, vec3(gre), intensity*0.2 );

    col *= 0.5 + 0.5*pow(16.0*coord.x*(1.0-coord.x)*coord.y*(1.0-coord.y),0.15);

    color.rgb = col;
}

void main(){
    vec4 color = vec4(0.0);
    vec2 coord = v_texcoord;

    applyTextureRGB(color, coord);
#if ${alphaType == "texture"}
    applyTextureAlpha(color, coord);
#elif ${alphaType == "mask"}
    applyTextureMask(color, coord);
#elif ${alphaType == "chroma"}
    applyChromaKey(color, coord);
#else
    color.a = 1.0;
#endif

#if ${this.alphaOnly}
    // Alpha-only mode: keep original RGB, set alpha from segmentation mask
    // This is used when LUT/Tune filters need alpha data but no visual background effects
    float maskAlpha = color.a;

    #if ${enhancement > 0}
        applyEnhancementEffect(color, coord);
    #endif

    #if ${shape == Presenter.Shape.Circle}
        applyCircleMask(color, coord);
    #elif ${shape == Presenter.Shape.Polygon}
        applyNgonMask(color, coord);
    #elif ${cornerRadius > 0}
        applyCornerRadius(color, coord);
    #else
        color.a = maskAlpha;
    #endif

    // In alphaOnly mode, don't discard based on alpha - we need all pixels
    // The alpha value carries mask data for LUT/Tune layer targeting
    // Preserve the mask value in alpha so downstream filters can use it
    color.a = max(color.a * u_opacity, 0.01);  // Ensure non-zero to prevent discard in filters
    gl_FragColor = color;
#else
    // Save original mask for preserveMaskInAlpha mode (LUT targeting with Blur/Hide)
#if ${this.preserveMaskInAlpha}
    float savedMask = color.a;
#endif

#if ${segType == "none"}
    vec4 bg = color;
    vec4 fg = color;
#else
    float inverseA = clamp(1.0 - color.a, 0.0, 1.0);
    vec4 bg = vec4(color.rgb, inverseA);
    vec4 fg = color;
#endif

#if ${style == Presenter.BackgroundStyle.Show}
    bg.a = 1.0;
#elif ${style == Presenter.BackgroundStyle.Hide}
    bg.a = 0.0;
#elif ${style == Presenter.BackgroundStyle.Blur}
    bg.a = 1.0;
    #if ${this.nativeBlur == false}
        applyTextureBlur(bg, coord);
    #endif
#endif


#if ${enhancement > 0}
#if ${segType == "none"}
    applyEnhancementEffect(bg, coord);
#else
    applyEnhancementEffect(fg, coord);
#endif
#endif

#if ${paintType != null}
    vec4 paint = vec4(0.0);

    #if ${paintType == "color"}
        applyBackgroundColor(paint, coord);
    #elif ${paintType == "radial"}
        applyBackgroundRadialGradient(paint, coord);
    #elif ${paintType == "linear"}
        applyBackgroundLinearGradient(paint, coord);
    #endif

    #if ${style == Presenter.BackgroundStyle.Hide}
        applyBackgroundFill(bg, paint);
    #else
        applyBackgroundTint(bg, paint);
    #endif

#endif

#if ${segType == "none"}
    color = bg;
#else
    color = mix(fg, bg, inverseA);
#if ${style != Presenter.BackgroundStyle.Hide}
    #if ${this.preserveMaskInAlpha}
        color.a = savedMask;
    #else
        color.a = 1.0;
    #endif
#else
    // Hide mode: also restore mask if preserveMaskInAlpha is enabled
    #if ${this.preserveMaskInAlpha}
        color.a = savedMask;
    #endif
#endif
#endif

#if ${shape == Presenter.Shape.Circle}
    applyCircleMask(color, coord);
#elif ${shape == Presenter.Shape.Polygon}
    applyNgonMask(color, coord);
#elif ${cornerRadius > 0}
    applyCornerRadius(color, coord);
#endif

    color.a *= u_opacity;

#if ${this.preserveMaskInAlpha}
    // Don't discard when preserveMaskInAlpha - alpha carries mask data, not transparency
    // Background pixels have alpha=0 but should still be rendered
#else
    if (color.a == 0.0) {
        discard;
    }
#endif

    gl_FragColor=color;
#endif
}
`;
        let program = this.programCache[fragment];
        if (program == null) {
            program = renderer.newProgram(fragment, [...uniforms]);
            this.programCache[fragment] = program;
        }
        this._program = program;
        return program;
    }
    prepare(gl, curprogram, timestamp, renderer, layer) {
        let program = this._program;
        if (program == null) {
            program = this.newProgramInRenderer(renderer);
        }

        if (program != curprogram) {
            gl.useProgram(program);
        }

        const uniforms = program.uniforms;
        const enhancement = this.enhancement;
        if (enhancement > 0) {
            gl.uniform1f(uniforms.u_enhancementIntensity, 1.0 - enhancement);
            gl.uniform1f(uniforms.u_enhancementBrightness, 0.5);
        }

        const shape = this.shape;
        if (shape == Presenter.Shape.Rectangle) {
            const cornerRadius = this.cornerRadius;
            if (cornerRadius > 0) {
                gl.uniform1f(uniforms.u_cornerRadius, cornerRadius);
            }
        }

        const segType = this.segmentationType;
        if (segType == "chroma") {
            const chromaColor = this.chromaColor ?? [1,0,1];
            const chromaRange = this.chromaRange ?? [0.4, 0.5];
            gl.uniform3fv(uniforms.u_chromaColor, chromaColor);
            gl.uniform2fv(uniforms.u_chromaRange, chromaRange);
        }
        else if (segType == "virtual") {
            gl.activeTexture(gl.TEXTURE1);

            const maskObj = layer.mask;
            let mask = null;
            if (maskObj == null) {
                mask = renderer.emptyTexture;
            }
            else {
                const textures = renderer.textures;
                let maskNeedsUpdate = layer?.maskNeedsUpdate ?? false;
                mask = textures.get(maskObj);
                if (mask == null) {
                    mask = renderer.newTexture(gl.ALPHA);
                    textures.set(maskObj, mask);
                    maskNeedsUpdate = true;
                }
                if (maskNeedsUpdate == true) {
                    if (maskObj != null) {
                        if (maskObj.updateTexture != null) {
                            maskObj.updateTexture(renderer, gl, mask);
                        }
                        else {
                            renderer.updateTextureWithElement(mask, maskObj);
                        }
                    }
                    layer.maskNeedsUpdate = false;

                    //var pixelSize = new Float32Array([1.0 / maskObj.width, 1.0 / maskObj.height])
                    // TMP: using bigger pixels steps as above is causing pixel-block artefacts
                    // let's revert it back to the hardcoded value until we revisit postprocess.
                    if (renderer.highPerformanceGPU) {
                        var pixelSize = new Float32Array([1.0 / 640, 1.0 / 352]);
                        gl.uniform2fv(uniforms.u_pixelSize, pixelSize);
                    }
                }
            }

            gl.bindTexture(gl.TEXTURE_2D, mask);
            gl.uniform1i(uniforms.u_mask, 1);

            // Switch back to the regular texture
            gl.activeTexture(gl.TEXTURE0);
        }

        const paint = this.paint;
        if (paint != null) {
            const sanitizeValues = function(list, count) {
                if (list == null || list.length != count) {
                    return new Array(count).fill(0);
                }
                for (let idx=0; idx<list.length; idx+=1) {
                    let val = list[idx];
                    if (IsKindOf(val, Number) == false || val < 0 || val > 1) {
                        return new Array(count).fill(0);
                    }
                }
                return list;
            }

            if (uniforms.u_color != null) {
                gl.uniform4fv(uniforms.u_color, sanitizeValues(paint.color, 4));
            }
            if (uniforms.u_startColor != null) {
                gl.uniform4fv(uniforms.u_startColor, sanitizeValues(paint.colors[0], 4));
            }
            if (uniforms.u_stopColor != null) {
                gl.uniform4fv(uniforms.u_stopColor, sanitizeValues(paint.colors[1], 4));
            }
            if (uniforms.u_startPoint != null) {
                gl.uniform2fv(uniforms.u_startPoint, sanitizeValues(paint.points[0], 2));
            }
            if (uniforms.u_stopPoint != null) {
                gl.uniform2fv(uniforms.u_stopPoint, sanitizeValues(paint.points[1], 2));
            }
        }

        return program;
    }
    circleContainsPoint(point, layer) {
        var size = layer.size;
        var center = PointMake(size.width / 2, size.height / 2);
        var d = PointDistance(point, center);
        var radius = 0.5;
        var r = Math.min(size.width, size.height) * radius;
        return (d < r);
    }
    ngonContainsPoint(point, layer) {
        const numberOfSides = this.polygonSides;
        const size = layer.size;
        const radius = Polygon.RadiusForNGonOfHeight(numberOfSides, size.height);
        const center = PointMake(size.width / 2, radius);
        const pgon = Polygon.NewNGon(numberOfSides, center, radius);
        return pgon.containsPoint(point);
    }
    containsPoint(point, layer) {
        const shape = this.shape;
        if (shape == Presenter.Shape.Circle) {
            return this.circleContainsPoint(point, layer);
        }
        else if (shape == Presenter.Shape.Polygon) {
            return this.ngonContainsPoint(point, layer);
        }
        return RectContainsPoint(layer.frame, point);
    }
}
