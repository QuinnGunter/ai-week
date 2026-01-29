//
//  roundrect.js
//  mmhmm
//
//  Created by Steve White on 10/23/24.
//  Copyright © 2024 mmhmm, inc. All rights reserved.
//

class RoundRectMaskFilter extends RenderFilter {
    /**
     * @override
     * @param {null}
     */
    constructor() {
        var radius = 0.49;
        const fragment = `
    precision mediump float;

varying vec2 v_texcoord;
varying vec2 v_layercoord;
uniform sampler2D u_texture;
uniform lowp float u_opacity;
uniform vec2 iResolution;
uniform float iCornerRadius;

${InigoQuilez.RoundedBox}

void main() {
    vec2 coord = v_layercoord * iResolution;
	vec2 p = ((2.0 * coord) - iResolution) / iResolution.y;

	vec2 si = vec2(iResolution.x / iResolution.y, 1.0);
    vec4 ra = vec4(iCornerRadius);
    ra = min(ra,min(si.x,si.y));

	float d = sdRoundedBox( p, si, ra );
    float alpha = 1.0-smoothstep(0.0,0.01,clamp(d, 0.0, 1.0));
    gl_FragColor = vec4(texture2D(u_texture, v_texcoord).xyz, u_opacity * alpha);
}
      `;
        super(fragment, ["u_texture", "u_opacity", "iResolution", "iCornerRadius"], []);
        this.modifiesContents = true;
        this.cornerRadius = 0.2;
    }
    prepare(gl, program) {
        gl.uniform1f(program.uniforms.iCornerRadius, this.cornerRadius);
    }
}
RoundRectMaskFilter.identifier = "871e9aed-61ee-45a4-bd4c-4cf0aa938600";
