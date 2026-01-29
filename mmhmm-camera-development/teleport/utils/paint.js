//
//  utils/paint.js
//  mmhmm
//
//  Created by Steve White on 12/15/22.
//  Copyright © 2022 mmhmm, inc. All rights reserved.
//

const Paint = {
    ParseColor: (color) => {
        if (color == null) {
            return null;
        }

        if (color[0] == '"') {
            color = JSON.parse(color);
        }

        if (IsKindOf(color, Array) == true) {
            return color;
        }
        else if (IsKindOf(color, String) == true) {
            let components = null;
            if (color[0] == "#") {
                components = ColorHexToRGB(color);
            }
            else {
                components = color.match(/([0-9]+(\.[0-9]+)?)/g).map(a => parseFloat(a));
                components[0] /= 255;
                components[1] /= 255;
                components[2] /= 255;
            }
            if (components.length == 3) {
                components.push(1.0);
            }
            return components;
        } else {
            console.error("Unable to parse color:", color);
        }
        return null;
    },
    Color: class {
        constructor(color) {
            this.color = color;
        }
        copy() {
            return new Paint.Color(Array.from(this.color));
        }
        get type() {
            return "color";
        }
        get filterClass() {
            return SolidColorFilter;
        }
        set color(value) {
            this._color = Paint.ParseColor(value);
        }
        get color() {
            return this._color;
        }
        set alpha(value) {
            this._color[3] = clamp(value, 0.0, 1.0);
        }
        get alpha() {
            const color = this.color;
            if (color.length == 4) {
                return color[3];
            }
            return 1.0;
        }
        get opaque() {
            const color = this.color;
            if (color.length == 4 && color[3] == 1.0) {
                return true;
            }
            return false;
        }
        applyToFilter(filter) {
            const color = this.color;
            filter.color = color;
            return (color[0] != 0 || color[1] != 0 || color[2] != 0);
        }
        equals(other) {
            if (IsKindOf(other, this.constructor) == false) {
                return false;
            }

            return EqualObjects(this.color, other.color);
        }
        strokeInContext(context, size, path=null) {
            context.strokeStyle = this.toCSS(true);
            if (path != null) {
                context.stroke(path);
            }
            else {
                context.strokeRect(0, 0, size.width, size.height);
            }
        }
        fillInContext(context, size, path=null) {
            context.fillStyle = this.toCSS(true);
            if (path != null) {
                context.fill(path);
            }
            else {
                context.fillRect(0, 0, size.width, size.height);
            }
        }
        toCSS(includeAlpha=false) {
            if (!this.color) {
                console.error("Paint.Color.toCSS called with null color");
                gSentry.message("Paint.Color.toCSS called with null color");
                return Color(0,0,0,1);
            }
            let [r,g,b,a] = this.color;
            if (includeAlpha == false) {
                a = 1.0;
            }
            return Color(r, g, b, a);
        }
        fromCloudy(cloudy) {
            if (cloudy.colors != null) {
                cloudy.color = cloudy.colors[0];
            }
            return this.applyEvent(cloudy);
        }
        toCloudy() {
            return this.toJSON();
        }
        toJSON() {
            return {
                type: this.type,
                color: this.color,
            }
        }
        applyEvent(event) {
            const color = event.color;
            if (color != null) {
                this.color = color;
            }
        }
    },
    RadialGradient: class {
        constructor(colors) {
            this.colors = colors;
        }
        copy() {
            return new Paint.RadialGradient(Array.from(this.color));
        }
        set colors(list) {
            const colors = list ?? [];
            this._colors = colors.map(color => Paint.ParseColor(color));
        }
        get colors() {
            return this._colors;
        }
        get opaque() {
            const colors = this.colors ?? [];
            const hasAlphaTransparency = colors.some(color => {
                if (color.length == 4 && color[3] == 1.0) {
                    return false;
                }
                return true;
            })
            return (hasAlphaTransparency == false);
        }
        get type() {
            return "radial";
        }
        get filterClass() {
            return GradientFilter.Radial;
        }
        applyToFilter(filter) {
            const colors = this.colors;
            filter.startColor = colors[0];
            filter.stopColor = colors[1];
            return true;
        }
        equals(other) {
            if (IsKindOf(other, this.constructor) == false) {
                return false;
            }

            return EqualObjects(this.colors, other.colors);
        }
        _newGradientInContext(context, size) {
            const colors = this.colors;

            const center = PointMake(size.width / 2, size.height / 2);
            const radius = Math.min(size.width, size.height) / 2;
            const gradient = context.createRadialGradient(
                center.x, center.y, radius/2,
                center.x, center.y, radius*2,
            )
            gradient.addColorStop(0, Color(...colors[0]));
            gradient.addColorStop(1, Color(...colors[1]));
            return gradient;
        }
        strokeInContext(context, size, path=null) {
            context.fillStyle = this._newGradientInContext(context, size);
            if (path != null) {
                context.fill(path);
            }
            else {
                context.fillRect(0, 0, size.width, size.height);
            }
        }
        fillInContext(context, size, path=null) {
            context.fillStyle = this._newGradientInContext(context, size);
            if (path != null) {
                context.fill(path);
            }
            else {
                context.fillRect(0, 0, size.width, size.height);
            }
        }
        toCSS(includeAlpha=false) {
            const colors = this.colors.map(color => {
                let [r,g,b,a] = color;
                if (includeAlpha == false) {
                    a = 1.0;
                }
                return [r,g,b,a];
            });
            return `radial-gradient(${colors.map(color => Color(...color)).join(",")})`;
        }
        fromCloudy(cloudy) {
            return this.applyEvent(cloudy);
        }
        toCloudy() {
            return this.toJSON();
        }
        toJSON() {
            return {
                type: this.type,
                colors: this.colors,
            }
        }
        applyEvent(event) {
            const colors = event.colors;
            if (colors != null) {
                this.colors = Array.from(colors);
            }
        }
    },
    LinearGradient: class {
        constructor(data) {
            this.colors = [];
            this.points = [];
            if (data != null) {
                data.forEach(entry => this.addStopAt(...entry));
            }
        }
        copy() {
            const copy = new Paint.LinearGradient();
            copy._colors = Array.from(this.colors);
            copy._points = Array.from(this.points);
            return copy;
        }
        get type() {
            return "linear";
        }
        get filterClass() {
            return GradientFilter.Linear;
        }
        set colors(val) {
            this._colors = val;
        }
        get colors() {
            const colors = this._colors;
            if (colors == null || colors.length == 0) {
                return [ [0,0,0,1], [0,0,0,1] ];
            }
            return colors;
        }
        set points(val) {
            this._points = val;
        }
        get points() {
            const points = this._points;
            if (points == null || points.length == 0) {
                return [ [0.5, 0.0], [0.5, 1.0] ];
            }
            return points;
        }
        get opaque() {
            const colors = this.colors ?? [];
            const hasAlphaTransparency = colors.some(color => {
                if (color.length == 4 && color[3] == 1.0) {
                    return false;
                }
                return true;
            })
            return (hasAlphaTransparency == false);
        }
        applyToFilter(filter) {
            const colors = this.colors;
            const points = this.points;
            filter.startColor = colors[0];
            filter.startPoint = points[0];
            filter.stopColor = colors[1];
            filter.stopPoint = points[1];
            return true;
        }
        equals(other) {
            if (IsKindOf(other, this.constructor) == false) {
                return false;
            }

            if (EqualObjects(this.colors, other.colors) == false) {
                return false;
            }

            if (EqualObjects(this.points, other.points) == false) {
                return false;
            }
            return true;
        }
        addStopAt(color, x = 0, y = 0) {
            const existing = this._points.find(entry => entry[0] == x && entry[1] == y);
            if (existing != null) {
                const index = this._points.indexOf(existing);
                this._colors[index] = color;
                return this;
            }
            this._colors.push(Paint.ParseColor(color));
            this._points.push([x, y]);
            return this;
        }
        _newGradientInContext(context, size) {
            var colors = this.colors;
            var points = this.points;

            var gradient = context.createLinearGradient(
                points[0][0] * size.width, points[0][1] * size.height,
                points[1][0] * size.width, points[1][1] * size.height,
            )
            gradient.addColorStop(0, Color(...colors[0]));
            gradient.addColorStop(1, Color(...colors[1]));
            return gradient;
        }
        strokeInContext(context, size, path=null) {
            context.strokeStyle = this._newGradientInContext(context, size);
            if (path != null) {
                context.stroke(path);
            }
            else {
                context.strokeRect(0, 0, size.width, size.height);
            }
        }
        fillInContext(context, size, path=null) {
            context.fillStyle = this._newGradientInContext(context, size);
            if (path != null) {
                context.fill(path);
            }
            else {
                context.fillRect(0, 0, size.width, size.height);
            }
        }
        toCSS(includeAlpha=false) {
            const colors = this.colors.map(color => {
                let [r,g,b,a] = color;
                if (includeAlpha == false) {
                    a = 1.0;
                }
                return [r,g,b,a];
            });
            return `linear-gradient(${colors.map(color => Color(...color)).join(",")})`;
        }
        fromCloudy(cloudy) {
            return this.applyEvent(cloudy);
        }
        toCloudy() {
            return this.toJSON();
        }
        toJSON() {
            return {
                type: this.type,
                colors: this.colors,
                points: this.points
            }
        }
        applyEvent(event) {
            const colors = event.colors;
            if (colors != null) {
                this.colors = Array.from(colors);
            }

            const points = event.points;
            if (points != null) {
                this.points = Array.from(points);
            }
        }
    },
    FromCloudy: (data) => {
        let cloudy = Object.assign({}, data);
        const keysToParse = ["color", "colors", "points"];
        keysToParse.forEach(key => {
            const value = cloudy[key];
            if (IsKindOf(value, Array) == true && key == "colors") {
                let parsed = value.map(entry => Paint.ParseColor(entry));
                cloudy[key] = parsed;
            }
            else if (IsKindOf(value, String) == true) {
                let parsed = JSON.parse(value);
                if (key == "color") {
                    parsed = Paint.ParseColor(parsed);
                }
                else if (key == "colors") {
                    parsed = parsed.map(color => Paint.ParseColor(color));
                }
                cloudy[key] = parsed;
            }
        })
        let type = cloudy?.type;
        if (type == null) {
            if (cloudy.colors.length == 1) {
                type = "color";
            }
            else if (cloudy.points != null) {
                type = "linear";
            }
            else {
                type = "radial";
            }
        }

        const typesToClass = {
            "color": Paint.Color,
            "linear": Paint.LinearGradient,
            "radial": Paint.RadialGradient,
        };

        const paintCls = typesToClass[type];
        if (paintCls == null) {
            return null;
        }

        const paint = new paintCls();
        paint.fromCloudy(cloudy);
        return paint;
    },
    FromJSON: (json) => {
        const typesToClass = {
            "color": Paint.Color,
            "linear": Paint.LinearGradient,
            "radial": Paint.RadialGradient,
        };

        const paintCls = typesToClass[json?.type];
        if (paintCls == null) {
            return null;
        }
        const paint = new paintCls();
        paint.applyEvent(json);
        return paint;
    },
    Black: () => {
        return new Paint.Color("#000000");
    }
}
