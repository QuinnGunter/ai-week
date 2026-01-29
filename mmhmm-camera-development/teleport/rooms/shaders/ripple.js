//
//  ripple.js
//  mmhmm
//
//  Created by Steve White on 11/9/21.
//  Copyright © 2021 mmhmm, inc. All rights reserved.
//

//
// Shaders were minified in a1c1792dbda9a83da0c7f4f7d83b2568627f2e0a
// Please refer to that commit for the original listings.
//

Room.Shader.Ripples = class extends Room.Shader {
    constructor() {
        super(
            "94f78750-3a76-4f33-a27b-5f72e883a8eb",
            LocalizedString("Ripple"),
            "ripples_thumb.png",
            new Room.Shader.Ripples.Filter(),
            false
        )
    }
    _shaderStateWithoutTime(inState) {
        if (inState != null && inState.shader != null) {
            inState = inState.shader;
        }
        var copy = Object.assign({}, inState);
        delete copy.time;
        return copy;
    }
    async thumbnail() {
        return this.thumbnailAsset.openAsElement();
    }
    async thumbnailForState(state) {
        return this.generateThumbnailForState(state).then(thumbnail => {
            return new LocalAsset({blob: thumbnail}).openAsElement();
        });
    }
    async generateThumbnailForState(state) {
        var shaderState = this._shaderStateWithoutTime(state);

        var cached = this.cachedThumbnail;
        if (cached != null && EqualObjects(cached.state, shaderState) == true) {
            const thumbnail = cached.thumbnail;
            if (thumbnail != null) {
                return thumbnail;
            }
        }

        var queue = this.thumbnailTaskQueue;
        if (queue == null) {
            queue = [];
            this.thumbnailTaskQueue = queue;
        }

        var task = queue.find(entry => EqualObjects(shaderState, entry.state));
        if (task == null) {
            task = {
                state: shaderState,
            }
            task.promise = new Promise((resolve, reject) => {
                task.resolve = resolve;
                task.reject = reject;
            })
            queue.push(task);
            if (queue.length == 1) {
                this.processNextThumbnailTask();
            }
        }

        const thumbnail = await task.promise;

        if (thumbnail != null) {
            this.cachedThumbnail = {
                thumbnail: thumbnail,
                state: shaderState,
            };
            return thumbnail;
        }

        return this.thumbnailAsset.openAsBlob();
    }
    processNextThumbnailTask() {
        var queue = this.thumbnailTaskQueue;
        if (queue == null || queue.length == 0) {
            return;
        }

        var task = queue[0];
        var stageSize = gApp.stage.size;
        var thumbnailSize = SizeMake(stageSize.width / 4, stageSize.height / 4);

        var layer = new RenderLayer();
        layer.frame = RectMake(0, 0, thumbnailSize.width, thumbnailSize.height);

        var shader = new Room.Shader.Ripples.Filter();
        shader.applyEvent(task.state);
        layer.filter = shader;

        var renderer = new Renderer(null, thumbnailSize.width, thumbnailSize.height, false);
        renderer.rootLayer.addSublayer(layer);

        renderer.snapshot()
            .then(task.resolve)
            .catch(task.reject)
            .finally(() => {
                var index = queue.indexOf(task);
                if (index != -1) {
                    queue.splice(index, 1);
                }
                if (queue.length > 0) {
                    this.processNextThumbnailTask();
                }
            });
    }
    doesParameterKeyAffectThumbnail(key) {
        return (key != "speed" && key != "size");
    }
}

/**
 * @extends {Room.Shader.Filter}
 * @property {number} speed Valid ranges 0.01<->1.0
 * @property {number} size Valid ranges 0.01<->1.0
 * @property {0|1|2|3} shape
 * @property {0|1|2} background
 * @property {0|1|2|3|4|5|6|7} foreground
 */
Room.Shader.Ripples.Filter = class extends Room.Shader.Filter {
    constructor() {
        const fragment = `
    precision mediump float;
    precision highp int;
    varying vec2 v_texcoord;
    uniform float uTime; uniform lowp float uScale;uniform int shape,background;uniform vec3 kCol1,kCol2,kCol3;uniform vec2 iResolution;uniform lowp float u_opacity;
    void main(){float B=uScale,d=uTime;vec2 e=(2.*v_texcoord*iResolution.xy)/iResolution.y;if(shape==0)e.x+=.5*e.y;e*=B;if(shape==2||shape==3)e.x+=.5*mod(floor(e.y),2.);vec2 v=fract(e),f=floor(e);float i=fract(fract(dot(f,vec2(.436,.173)))*45.);if(shape==0){if(v.x>v.y)i+=1.3;}vec3 s=kCol1,m=kCol2;vec3 u=mix(s,m,.5+.5*cos(10.*i));float y=smoothstep(-1.,1.,sin(.2*f.x+.5*d+i*1.2));vec2 b;float r=0.;if(shape==1)b=.5-abs(v-.5)-.45*(1.-y),r=smoothstep(.04,.07,min(b.x,b.y));else if(shape==2)b=v-.5,r=1.-smoothstep(-.03,0.,length(b)-.45*y);else if(shape==3){b=abs(v-.5);float a=(b.x+b.y)*.707+.1;r=1.-smoothstep(0.,.03,a-.4*y);}else b=min(.5-abs(v-.5),abs(v.x-v.y))-.3*(1.-y),r=smoothstep(.04,.07,min(b.x,b.y));vec3 c=kCol3;u=mix(c,u,r);gl_FragColor=vec4(u,u_opacity);}
    `

        var dashify = function(string) {
            // npm's minifier is replacing \u escape sequences with the value,
            // and S3 isn't serving a language header, so the browser ends up
            // goofing these up....
            var index = string.indexOf("-");
            if (index != -1) {
                string = string.substring(0, index) + String.fromCharCode(0x2013) + string.substring(index + 1);
            }
            return string;
        }
        var parameters = {
            "speed": { name: LocalizedString("Speed"), type: "range", min: 0.01, max: 1.0, default: 0.5 },
            "size": { name: LocalizedString("Scale"), type: "range", min: 0.01, max: 1.0, default: 0.4, },
            "shape": {
                name: LocalizedString("Shape"),
                type: "select",
                default: 2,
                values: [
                    LocalizedString("Triangles"),
                    LocalizedString("Squares"),
                    LocalizedString("Circles"),
                    LocalizedString("Diamonds"),
                ]
            },
            "background": {
                name: LocalizedString("Background"),
                type: "select",
                default: 2,
                values: [
                    LocalizedString("Dark"),
                    LocalizedString("Bright"),
                    LocalizedString("Color"),
                ]
            },
            "foreground": {
                name: LocalizedString("Foreground"),
                type: "select",
                default: 3,
                values: [
                    dashify(LocalizedString("Yellow - Green")),
                    dashify(LocalizedString("Green - Cyan")),
                    dashify(LocalizedString("Cyan - Blue")),
                    dashify(LocalizedString("Blue - Aqua")),
                    dashify(LocalizedString("Aqua - Navy")),
                    dashify(LocalizedString("Navy - Purple")),
                    dashify(LocalizedString("White")),
                ]
            },
        };

        super(fragment, ["uTime", "uScale", "iResolution", "shape", "kCol1", "kCol2", "kCol3", "u_opacity"], parameters);
    }
    set size(aSizeValue) {
        this._size = aSizeValue;
        this._scale = 3.0 + 10.0 * aSizeValue * aSizeValue * aSizeValue;
    }
    get size() {
        return this._size;
    }
    get colors() {
        var colors = this._colors;
        if (colors == null) {
            colors = [
                new Float32Array([0.9960, 0.9882, 0.3568]),
                new Float32Array([0.8078, 0.9921, 0.3294]),
                new Float32Array([0.2980, 0.9137, 0.7686]),
                new Float32Array([0.2078, 0.8784, 1.0000]),
                new Float32Array([0.3333, 0.7058, 0.9764]),
                new Float32Array([0.2588, 0.2078, 0.9490]),
                new Float32Array([0.7607, 0.1411, 0.7254]),
                new Float32Array([0.2000, 0.2000, 0.2000]),
                new Float32Array([0.3490, 0.3490, 0.3490]),
                new Float32Array([0.8000, 0.8000, 0.8000]),
                new Float32Array([0.9019, 0.9019, 0.9019]),
            ];
            this._colors = colors;
        }
        return colors;
    }
    set background(aBackgroundValue) {
        this._background = aBackgroundValue;
        this._updatePalette();
    }
    get background() {
        return this._background;
    }
    set foreground(aForegroundValue) {
        this._foreground = aForegroundValue;
        this._updatePalette();
    }
    get foreground() {
        return this._foreground;
    }
    _updatePalette() {
        var colors = this.colors;
        switch (this.foreground) {
            case 0:
            default:
                this.color1 = colors[0];
                this.color2 = colors[1];
                break;
            case 1:
                this.color1 = colors[1];
                this.color2 = colors[2];
                break;
            case 2:
                this.color1 = colors[2];
                this.color2 = colors[3];
                break;
            case 3:
                this.color1 = colors[3];
                this.color2 = colors[4];
                break;
            case 4:
                this.color1 = colors[4];
                this.color2 = colors[5];
                break;
            case 5:
                this.color1 = colors[5];
                this.color2 = colors[6];
                break;
            case 6:
                if (this.background == 0) {
                    this.color1 = colors[7];
                    this.color2 = colors[8];
                }
                else {
                    this.color1 = colors[9];
                    this.color2 = colors[10];
                }
                break;
        }

        switch (this.background) {
            case 0:
                this.color3 = new Float32Array([0.12, 0.12, 0.12]);
                this.color1 = this.color1.map(a => a * 0.75);
                this.color2 = this.color2.map(a => a * 0.75);
                break;
            case 1:
                this.color3 = new Float32Array([1.0, 1.0, 1.0]);
                break;
            case 2:
            default:
                this.color3 = new Float32Array([this.color2[0] * 0.8, this.color2[1] * 0.8, this.color2[2] * 0.8]);
                break;
        }
    }
    prepare(gl, program, timestamp) {
        var lastTimestamp = this.lastTimestamp;
        if (lastTimestamp == null) {
            lastTimestamp = timestamp;
        }
        var time = this.lastTime;
        if (time == null) {
            time = 0;
        }
        time += (timestamp - lastTimestamp) * this.speed;

        this.lastTime = time;
        this.lastTimestamp = timestamp;

        gl.uniform1f(program.uniforms.uTime, time);
        gl.uniform1f(program.uniforms.uScale, this._scale);

        gl.uniform1i(program.uniforms.shape, this.shape);
        gl.uniform1i(program.uniforms.style, this.style);

        gl.uniform3fv(program.uniforms.kCol1, this.color1);
        gl.uniform3fv(program.uniforms.kCol2, this.color2);
        gl.uniform3fv(program.uniforms.kCol3, this.color3);
    }
    reset() {
        super.reset();
        this.lastTime = 0;
        this.lastTimestamp = null;
    }
    toJSON() {
        var r = super.toJSON();
        var time = this.lastTime;
        if (time != null) {
            r.time = time;
        }
        return r;
    }
    applyEvent(event, sender) {
        super.applyEvent(event, sender);
        var time = event.time;
        if (time != null) {
            this.lastTime = time;
        }
    }
}
