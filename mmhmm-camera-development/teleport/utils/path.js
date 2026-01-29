//
//  utils/path.js
//  mmhmm
//
//  Created by Steve White on 10/10/23.
//  Copyright © 2023 mmhmm, inc. All rights reserved.
//

class PathHelper {
    constructor(width, height, d) {
        var svgCommands = d.match(/([A-Z][^A-Z]*)/g);

        var canvasCommands = null;
        if (svgCommands == null) {
            canvasCommands = [];
        }
        else {
            var map = {
              "M": "moveTo",        // X, Y
              "C": "bezierCurveTo", // x1,y1, x2,y2, x,y
              "L": "lineTo",        // X, Y
              "Z": "closePath",
            }
            canvasCommands = svgCommands.map(command => {
              var letter = command[0];
              var func = map[letter];
              if (func == null) {
                func = "error"+letter;
              }
              var args = null;
              if (command.length > 1) {
                args = command.substring(1).split(" ").map((arg, idx) => {
                    arg = parseFloat(arg);
                    if (idx % 2 == 0) {
                        return arg / width;
                    }
                    return arg / height;
                });
              }
              return { fn: func, args: args ?? [] };
            });
        }
        this.width = width;
        this.height = height;
        this.commands = canvasCommands;
    }
    toPath2D(width, height) {
        if (width == null) width = this.width;
        if (height == null) height = this.height;

        var path = new Path2D();
        var subpath = null;

        this.commands.forEach(cmd => {
            var fn = cmd.fn;
            var args = cmd.args.map((val, idx) => {
                if (idx % 2 == 0) {
                    return val * width;
                }
                return val * height;
            });

            if (subpath == null) {
                subpath = new Path2D();
                path.addPath(subpath);
            }

            path[fn].apply(path, args);

            if (fn == 'closePath') {
                subpath = null;
            }
        });
        return path;
    }
    toD(width, height, wholeNumbersOnly=false) {
        if (width == null) width = this.width;
        if (height == null) height = this.height;

        var cache = this._cachedD;
        if (cache != null && cache.width == width && cache.height == height) {
            return cache.d;
        }

        const map = {
            "moveTo": "M",
            "bezierCurveTo": "C",
            "lineTo": "L",
            "closePath": "Z",
        };

        var d = this.commands.map(cmd => {
            var fn = cmd.fn;
            var args = cmd.args.map((arg, idx) => {
                var val = arg;
                if (idx % 2 == 0) {
                    val *= width;
                }
                else {
                    val *= height;
                }
                if (wholeNumbersOnly == true) {
                    return Math.round(val);
                }
                return val.toPrecision(4);
            });
            return map[fn] + args.join(" ");
        }).join("");

        this._cachedD = { width, height, d };
        return d;
    }
}
