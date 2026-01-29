//
//  media/annotations/laser_shader.js
//  mmhmm
//
//  Created by Steve White on 4/4/24.
//  Copyright © 2024 mmhmm, inc. All rights reserved.
//

Media.Annotation.Style.Laser.Shader = class extends RenderFilter {
    constructor() {
        const attribs = ['a_coordinates', 'a_times'];
        const vertex = `
        precision mediump float;
        attribute vec2 a_coordinates;
        attribute float a_times;
        uniform float u_time;
        uniform float u_duration;
        uniform mat4 u_model;
        uniform mat4 u_projection;

        varying float v_decay;

        void main(void) {
            v_decay = (1.0 - ((u_time - a_times) / u_duration));

            gl_Position = u_projection * u_model * vec4(a_coordinates, 1.0, 1.0);
            gl_PointSize = 20.0 * v_decay;
        }
`;

        const uniforms = ['u_time', 'u_color', 'u_duration', 'u_model', 'u_projection'];
        const fragment = `
        precision mediump float;
        varying float v_decay;
        uniform float u_time;
        uniform vec3 u_color;

        void main(void) {
          vec2 uv = gl_PointCoord;
          uv -= 0.5;
          uv *= 2.0;
          float dist = sqrt(uv.x*uv.x + uv.y*uv.y);
          if (dist > 1.0) {
            discard;
          }
          gl_FragColor = vec4(u_color, v_decay);
        }
`;
        super(fragment, uniforms);
        this.vertex = vertex;
        this.attribs = attribs;

        this.componentsPerPoint = 3; // x, y, time
        this.points = new Float32Array(10000 * this.componentsPerPoint);
        this.numberOfPoints = 0;
        this.duration = 1; //sec
        this.modifiesContents = true;

        this.color = [0x17/255, 0x4E/255, 0xE5/255];
        this.timestamp = 0;
    }
    initialize(gl, program, renderer) {
        // Create buffer for storing points (x,y,t)
        this.vertexBuffer = gl.createBuffer();
    }
    tick() {
        this.timestamp += 1/30;
    }
    prepare(gl, program, timestamp, renderer, layer, contentsTexture, projection, model, opacity) {
        const numberOfPoints = this.numberOfPoints;
        if (numberOfPoints == 0) {
            return;
        }

        gl.uniformMatrix4fv(program.uniforms.u_projection, false, projection)
        gl.uniformMatrix4fv(program.uniforms.u_model, false, model)

        gl.uniform1f(program.uniforms.u_time, this.timestamp);

        gl.uniform1f(program.uniforms.u_duration, this.duration);

        gl.uniform3fv(program.uniforms.u_color, this.color);

        // Bind the buffer
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);

        // Upload it the current points
        gl.bufferData(gl.ARRAY_BUFFER, this.points, gl.STATIC_DRAW);

        const stride = 12; // 3 values(x,y,t) * sizeof(float)

        // Find coordinate location
        const coords = program.attribs.a_coordinates;

        // Bind it to the buffer
        gl.vertexAttribPointer(coords, 2, gl.FLOAT, false, stride, 0);

        // Enable the attribute
        gl.enableVertexAttribArray(coords);

        // Find time location
        const times = program.attribs.a_times;

        // Bind it to the buffer
        const offset = 8; // skip 2 values (x,y) * sizeof(float)
        gl.vertexAttribPointer(times, 1, gl.FLOAT, false, stride, offset);

        // Enable the attribute
        gl.enableVertexAttribArray(times);

        // Unbind it
        gl.bindBuffer(gl.ARRAY_BUFFER, null);

        // Draw
        gl.drawArrays(gl.POINTS, 0, numberOfPoints);
    }
    /*
     * @param {[Points]} points Points to add to our queue
     * @param {number} timestamp The timestamp for the points
     */
    addPoints(toAdd) {
        const points = this.points;
        const componentsPerPoint = this.componentsPerPoint;
        const timestamp = this.timestamp;

        const numToAdd = toAdd.length;
        let numCurrent = this.numberOfPoints;

        const numTotal = numToAdd + numCurrent;
        const pointCapacity = points.length / componentsPerPoint;
        if (numTotal > pointCapacity) {
            // Shift off the oldest to make room for the new
            const end = points.length;
            let src = (numTotal - pointCapacity) * componentsPerPoint;
            let dst = 0;
            while (src < end) {
                points[dst++] = points[src++];
            }
            numCurrent = pointCapacity - numToAdd;
        }

        let dst = numCurrent * componentsPerPoint;
        let src = 0;
        for (let src=0; src<numToAdd; src+=1) {
            const p = toAdd[src];
            points[dst++] = p.x;
            points[dst++] = p.y;
            points[dst++] = timestamp;
        }

        this.numberOfPoints = numCurrent + numToAdd;
    }
    removeExpiredPoints() {
        let evictOffset = -1;
        const timestamp = this.timestamp;

        const numberOfPoints = this.numberOfPoints;
        if (numberOfPoints == 0) {
            return;
        }

        const duration = this.duration;
        const points = this.points;
        const componentsPerPoint = this.componentsPerPoint;

        const end = numberOfPoints * componentsPerPoint;
        for (let idx=0; idx<end; idx+=componentsPerPoint) {
            if (timestamp - points[idx + 2] > duration) {
                evictOffset = idx + 3;
            }
            else {
                break;
            }
        }

        if (evictOffset == -1) {
            return;
        }

        let src = evictOffset;
        let dest = 0;

        while (src < end) {
            points[dest++] = points[src++];
        }

        const evicted = evictOffset / componentsPerPoint;
        this.numberOfPoints = numberOfPoints - evicted;
    }
}
